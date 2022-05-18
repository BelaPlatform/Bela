/*
 *  RTAudio.cpp
 *
 *  Central control code for hard real-time audio on BeagleBone Black
 *  using PRU and Xenomai Linux extensions. This code began as part
 *  of the Hackable Instruments project (EPSRC) at Queen Mary University
 *  of London, 2013-14.
 *
 *  (c) 2014 Victor Zappi and Andrew McPherson
 *  Queen Mary University of London
 */

//TODO: Improve error detection for Spi_Codec (i.e. evaluate return value)

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <math.h>
#include <algorithm>
#include <iostream>
#include <assert.h>
#include <vector>

#include <sys/mman.h>

#include "../include/Bela.h"
#include "../include/bela_hw_settings.h"
#include "../include/bela_sw_settings.h"
#include "../include/board_detect.h"
#include "../include/BelaContextFifo.h"
#include "../include/MiscUtilities.h"

// Xenomai-specific includes
#if XENOMAI_MAJOR == 3
#include <xenomai/init.h>
#endif

#if defined(XENOMAI_SKIN_native)
#include <native/task.h>
#include <native/timer.h>
#include <rtdk.h>
#endif

#if defined(XENOMAI_SKIN_posix)
#if XENOMAI_MAJOR == 2
#include <rtdk.h> // for rt_print_auto_init()
#endif
#include <pthread.h>
#endif

#include "../include/xenomai_wraps.h"

#include "../include/PRU.h"
#include "../include/I2c_Codec.h"
#include "../include/Spi_Codec.h"
#include "../include/I2c_MultiTLVCodec.h"
#include "../include/I2c_MultiTdmCodec.h"
#include "../include/I2c_MultiI2sCodec.h"
#include "../include/GPIOcontrol.h"
extern "C" void enable_runfast();
extern "C" void disable_runfast();

// ARM interrupt number for PRU event EVTOUT7
#define PRU_RTAUDIO_IRQ		21
//#define XENOMAI_CATCH_MSW // get SIGDEBUG when a mode switch takes place

#ifdef XENOMAI_CATCH_MSW
#include <sys/types.h>
#include <pthread.h>
#include <signal.h>
#include <unistd.h>
#include <execinfo.h>

static const char *sigdebug_msg[] = {
	[SIGDEBUG_UNDEFINED] = "latency: received SIGXCPU for unknown reason",
	[SIGDEBUG_MIGRATE_SIGNAL] = "received signal",
	[SIGDEBUG_MIGRATE_SYSCALL] = "invoked syscall",
	[SIGDEBUG_MIGRATE_FAULT] = "triggered fault",
	[SIGDEBUG_MIGRATE_PRIOINV] = "affected by priority inversion",
	[SIGDEBUG_NOMLOCK] = "Xenomai: process memory not locked "
	"(missing mlockall?)",
	[SIGDEBUG_WATCHDOG] = "Xenomai: watchdog triggered "
	"(period too short?)",
};

void sigdebug_handler(int sig, siginfo_t *si, void *context)
{
	const char fmt[] = "Mode switch (reason: %s). Backtrace:\n";
	unsigned int cause = sigdebug_reason(si);
	static char buffer[256];
	static void *bt[200];
	unsigned int n;

	if (cause > SIGDEBUG_WATCHDOG)
		cause = SIGDEBUG_UNDEFINED;

	switch(cause) {
	case SIGDEBUG_UNDEFINED:
	case SIGDEBUG_NOMLOCK:
	case SIGDEBUG_WATCHDOG:
		/* These errors are lethal, something went really wrong. */
		n = snprintf(buffer, sizeof(buffer), "%s\n", sigdebug_msg[cause]);
		write(STDERR_FILENO, buffer, n);
		exit(EXIT_FAILURE);
	}

	/* Retrieve the current backtrace, and decode it to stdout. */
	n = snprintf(buffer, sizeof(buffer), fmt, sigdebug_msg[cause]);
	n = write(STDERR_FILENO, buffer, n);
	n = backtrace(bt, sizeof(bt)/sizeof(bt[0]));
	backtrace_symbols_fd(bt, n, STDERR_FILENO);

	//signal(sig, SIG_DFL);
	//kill(getpid(), sig);
}
#endif // XENOMAI_CATCH_MSW
using namespace std;
using namespace BelaHwComponent;

typedef struct
{
	AudioCodec* activeCodec;
	AudioCodec* disabledCodec;
} BelaHwConfigPrivate;

int gRTAudioVerbose = 0; // Verbosity level for debugging
AudioCodec* gAudioCodec = NULL;
static AudioCodec* gDisabledCodec = NULL;
static BelaHw belaHw;
BelaCpuData belaCpuData;
extern const float BELA_INVALID_GAIN;

static int Bela_getHwConfigPrivate(BelaHw hw, BelaHwConfig* cfg, BelaHwConfigPrivate* pcfg)
{
	// set audio I/O
	if(!cfg || ! pcfg)
		return 1;
	cfg->audioInChannels = pcfg->activeCodec->getNumIns();
	cfg->audioOutChannels = pcfg->activeCodec->getNumOuts();
	cfg->audioSampleRate = pcfg->activeCodec->getSampleRate();
	if(!cfg->audioInChannels && cfg->audioOutChannels) {
		fprintf(stderr, "Error: 0 inputs and 0 outputs channels.\n");
		return -1;
	}
	if(!cfg->audioSampleRate) {
		fprintf(stderr, "Error: audio sampling rate is 0. Is the codec enabled?\n");
		return -1;
	}
	// set analogs:
	if(Bela_hwContains(hw, BelaCape)) {
		cfg->analogInChannels = 8;
		cfg->analogOutChannels = 8;
	} else if(Bela_hwContains(hw, BelaMiniCape)) {
		cfg->analogInChannels = 8;
	}
	return 0;
}

BelaHwConfig* Bela_HwConfig_new(BelaHw hw)
{
	BelaHwConfig* cfg = new BelaHwConfig;
	// TODO: this will always return error because of nullptr.
	// Codec detection needs to be factored out of Bela_initAudio
	if(Bela_getHwConfigPrivate(hw, cfg, nullptr))
	{
		delete cfg;
		return nullptr;
	}
	return cfg;
}

void Bela_HwConfig_delete(BelaHwConfig* cfg)
{
	delete cfg;
}

// Real-time tasks and objects
#ifdef XENOMAI_SKIN_native
RT_TASK gRTAudioThread;
#endif
#ifdef XENOMAI_SKIN_posix
pthread_t gRTAudioThread;
static pthread_t gFifoThread;
#endif
#if XENOMAI_MAJOR == 3
int gXenomaiInited = 0;
#endif
static const char gRTAudioThreadName[] = "bela-audio";
static const char gFifoThreadName[] = "bela-audio-fifo";

PRU* gPRU = NULL;

int volatile gShouldStop = false; // Flag which tells the audio task to stop

// general settings
static char gPRUFilename[MAX_PRU_FILENAME_LENGTH]; // Path to PRU binary file (internal code if empty)_
static int gAmplifierMutePin = -1;
static int gAmplifierShouldBeginMuted = 0;
static bool gHighPerformanceMode = 0;
static unsigned int gAudioThreadStackSize;
unsigned int gAuxiliaryTaskStackSize;

// Context which holds all the audio/sensor data passed to the render routines
InternalBelaContext gContext;
BelaContext* gUserContext = nullptr;

// User data passed in from main()
static void *gUserData;
void (*gCoreRender)(BelaContext*, void*);
void (*gUserRender)(BelaContext*, void*);
void (*gBelaCleanup)(BelaContext*, void*);
void (*gBelaAudioThreadDone)(BelaContext*, void*);
static BelaContextFifo* gBcf = nullptr;
static int gFifoFactor;
static int gFifoContent;
static double gBlockDurationMs;

void fifoRender(BelaContext*, void*);

// initAudio() prepares the infrastructure for running PRU-based real-time
// audio, but does not actually start the calculations.
// periodSize indicates the number of audio frames per period: the analog period size
// will depend on the number of analog channels, in such a way that
// analogPeriodSize = 4*periodSize/numAnalogChannels
// In total, the audio latency in frames will be 2*periodSize,
// plus any latency inherent in the ADCs and DACs themselves.
// useAnalog indicates whether to enable the ADC and DAC or just use the audio codec.
// numAnalogChannels indicates how many ADC and DAC channels to use.
// userData is an opaque pointer which will be passed through to the setup()
// function for application-specific use
//
// Returns 0 on success.

static std::string gBatchParams;
static int initBatch(BelaInitSettings *settings, InternalBelaContext* ctx, const std::string& codecMode, void* userData)
{
	gBatchParams = codecMode;
	ctx->audioFrames = settings->periodSize;
	ctx->audioInChannels = 12;
	ctx->audioOutChannels = 12;
	ctx->digitalChannels = 16;
	ctx->analogInChannels = settings->numAnalogInChannels;
	ctx->analogOutChannels = settings->numAnalogOutChannels;
	ctx->analogFrames = ctx->audioFrames / 2;
	ctx->digitalFrames = ctx->audioFrames;
	ctx->audioSampleRate = 44100;
	ctx->digitalSampleRate = ctx->audioSampleRate;
	ctx->analogSampleRate = settings->uniformSampleRate ? ctx->audioSampleRate : ctx->audioSampleRate / 2;
	BelaContextSplitter::contextAllocate(ctx);
	ctx->flags |= BELA_FLAG_OFFLINE;
	// Call the user-defined initialisation function
	if(settings->setup && !(*settings->setup)((BelaContext*)ctx, userData)) {
		if(gRTAudioVerbose)
			fprintf(stderr, "Couldn't initialise audio rendering: setup() returned false\n");
		return 1;
	}

	return 0;
}

static const long long unsigned int kNsInSec = 1000000000;
static long long unsigned int timespec_sub(const struct timespec *a, const struct timespec *b)
{
	long long unsigned int diff;
	diff = (a->tv_sec - b->tv_sec) * kNsInSec;
	diff += a->tv_nsec - b->tv_nsec;
	return diff;
}

static int batchCallbackLoop(InternalBelaContext* context, void (*render)(BelaContext*,void*), void* userData)
{
	using namespace StringUtils;
	using namespace ConfigFileUtils;
	context->audioFramesElapsed = 0;
	long long unsigned int i = 0;
	int priority = 0;
	bool printStats = false;
	double maxTime = 0;
	double intervalMs = 0;
	std::vector<std::string> tokens = split(gBatchParams, ',');
	for(auto& token : tokens)
	{
		token = trim(token);
		std::string value;
		value = readValueFromString(token, "i");
		if("" != value)
			i = atoll(value.c_str());
		value = readValueFromString(token, "p");
		if("" != value)
			priority = atoi(value.c_str());
		value = readValueFromString(token, "s");
		if("" != value)
			printStats = atoi(value.c_str());
		value = readValueFromString(token, "t");
		if("" != value)
			maxTime = atof(value.c_str());
		value = readValueFromString(token, "e");
		if("" != value)
			intervalMs = atof(value.c_str());
	}
	gRTAudioVerbose && printf("Running %llu iterations or up to %.3f seconds with priority %d, sleeping %f ms in between\n", i, maxTime, priority, intervalMs);
	struct timespec ts = {
		.tv_sec = int(intervalMs / 1000),
		.tv_nsec = int(int(intervalMs * kNsInSec / 1000) % kNsInSec),
	};
	long long unsigned int maxTimeNs = maxTime * kNsInSec;
	struct sched_param p = {
		.sched_priority = priority,
	};
	__wrap_pthread_setschedparam(pthread_self(), SCHED_FIFO, &p);

	// clock_gettime is relatively expensive. We read it less often to
	// minimise overhead. This means we lose a bit of accuracy in duration,
	// but normally that's no big deal.
	const unsigned int kGetTimeIters = 10;
	unsigned int nextGetTime = kGetTimeIters;
	struct timespec begin, end;
	if(__wrap_clock_gettime(CLOCK_MONOTONIC, &begin))
	{
		fprintf(stderr, "Error in clock_gettime(): %d %s\n", errno, strerror(errno));
		return 1;
	}
	while(1) {
		render((BelaContext*)context, userData);
		context->audioFramesElapsed += context->audioFrames;
		if(maxTimeNs)
		{
			// a max execution time was specified
			if(!nextGetTime--)
			{
				nextGetTime = kGetTimeIters;
				__wrap_clock_gettime(CLOCK_MONOTONIC, &end);
				long long unsigned int elapsed = timespec_sub(&end, &begin);
				if(elapsed > maxTimeNs)
					break;
			}
		}
		else
		{
			// if a max number of iterations was specified
			if(!i--)
				break;
		}
		if(intervalMs)
			__wrap_nanosleep(&ts, NULL);
	}
	if(!maxTimeNs) // we may have already gotten a more accurate timestamp above
		__wrap_clock_gettime(CLOCK_MONOTONIC, &end);
	long long unsigned int timeNs = timespec_sub(&end, &begin);
	if(printStats)
	{
		printf("frames: %llu\n", context->audioFramesElapsed);
		printf("wallTime: %llu.%09llus\n", timeNs / kNsInSec, timeNs % kNsInSec);
		double wallTime = timeNs;
		double dspTime = context->audioFramesElapsed / context->audioSampleRate * kNsInSec;
		printf("cpu: %.3f%%\n", wallTime / dspTime * 100);
	}
	gShouldStop = 1;
	return 0;
}

static int setChannelGains(BelaChannelGainArray& cga, int (*cb)(int, float))
{
	for(unsigned int n = 0; n < cga.length; n++)
	{
		BelaChannelGain& cg = cga.data[n];
		int ret = cb(cg.channel, cg.gain);
		if(ret)
			return ret;
	}
	return 0;
}

int Bela_initAudio(BelaInitSettings *settings, void *userData)
{
	if(!settings)
		return -1;
	Bela_setVerboseLevel(settings->verbose);
	// Before we go ahead, let's check if Bela is alreadt running:
	// check if another real-time thread of the same name is already running.
	char command[200];
#if (XENOMAI_MAJOR == 2)
	char pathToXenomaiStat[] = "/proc/xenomai/stat";
#endif
#if (XENOMAI_MAJOR == 3)
	char pathToXenomaiStat[] = "/proc/xenomai/sched/stat";
#endif
	snprintf(command, 199, "grep %s %s", gRTAudioThreadName, pathToXenomaiStat);
	int ret = system(command);
	if(ret == 0)
	{
		fprintf(stderr, "Error: Bela is already running in another process. Cannot start.\n");
		return -1;
	}
#if (XENOMAI_MAJOR == 3)
	// initialize Xenomai with manual bootstrapping if needed
	// we cannot trust gXenomaiInited exclusively, in case the caller
	// already initialised Xenomai.
	bool xenomaiNeedsInit = false;
	if(!gXenomaiInited) {
		if(gRTAudioVerbose)
			printf("Xenomai not explicitly inited\n");
		// To figure out if we need to intialize it, attempt to create a Cobalt
		// object (a mutex). If it fails with EPERM, Xenomai needs to be initialized
		// See https://www.xenomai.org/pipermail/xenomai/2019-January/040203.html
		pthread_mutex_t dummyMutex;
		ret = __wrap_pthread_mutex_init(&dummyMutex, NULL);
		if(0 == ret) {
			if(gRTAudioVerbose)
				printf("Xenomai was inited by someone else\n");
			// success: cleanup
			__wrap_pthread_mutex_destroy(&dummyMutex);
		} else if (EPERM == ret) {
			xenomaiNeedsInit = true;
			if(gRTAudioVerbose)
				printf("Xenomai is going to be inited by us\n");
		} else {
			// it could fail for other reasons, but we couldn't do much about it anyhow.
			if(gRTAudioVerbose)
				printf("Xenomai is in unknown state\n");
		}
	}
	if(xenomaiNeedsInit) {
		int argc = 0;
		char *const *argv;
		xenomai_init(&argc, &argv);
	}
	gXenomaiInited = 1;
#endif
#ifdef XENOMAI_CATCH_MSW
	struct sigaction sa;
	sigemptyset(&sa.sa_mask);
	sa.sa_sigaction = sigdebug_handler;
	sa.sa_flags = SA_SIGINFO;
	sigaction(SIGDEBUG, &sa, NULL);
#endif // XENOMAI_CATCH_MSW
#if defined(XENOMAI_SKIN_native) || XENOMAI_MAJOR == 2
	rt_print_auto_init(1);
#endif

	// reset this, in case it has been set before
	gShouldStop = 0;
	gAudioThreadStackSize = settings->audioThreadStackSize;
	gAuxiliaryTaskStackSize = settings->auxiliaryTaskStackSize;

	// First check if there's a Bela program already running on the board.
	// We can't have more than one instance at a time, but we can tell via
	// the Xenomai task info. We expect the rt_task_bind call to fail so if it
	// doesn't then it means something else is running.
	if(!settings->render)
	{
		fprintf(stderr, "Error: no audio callback defined. Make sure you set settings->render to point to your audio callback\n");
		return -1;
	}
	gBelaCleanup = settings->cleanup;
	gBelaAudioThreadDone = settings->audioThreadDone;
	
	// Sanity checks
	if(settings->pruNumber < 0 || settings->pruNumber > 1) {
		fprintf(stderr, "Invalid PRU number %d \n", settings->pruNumber);
		return -1;
	}
	if(settings->pruNumber != 1 && settings->numMuxChannels != 0) {
		fprintf(stderr,  "Incompatible settings: multiplexer can only be run using PRU 1\n");
		return -1;
	}
	
	enable_runfast();

	if(gRTAudioVerbose)
		printf("Bela_initAudio()\n");
	strncpy(gPRUFilename, settings->pruFilename, MAX_PRU_FILENAME_LENGTH);
	gUserData = userData;

	gHighPerformanceMode = settings->highPerformanceMode;
	if(gRTAudioVerbose && gHighPerformanceMode) {
		printf("Starting in high-performance mode\n");
	}

	// Initialise context data structure
	memset(&gContext, 0, sizeof(InternalBelaContext));

	if(gRTAudioVerbose) {
		printf("Starting with period size %d ;", settings->periodSize);
		if(settings->useAnalog)
			printf("analog enabled\n");
		else
			printf("analog disabled\n");
		printf("DAC level %f dB; ADC level %f dB; headphone level %f dB\n", settings->dacLevel, settings->adcLevel, settings->headphoneLevel);
		if(settings->beginMuted)
			printf("Beginning with speaker muted\n");
	}

	// Prepare GPIO pins for amplifier mute and status LED
	if(settings->ampMutePin >= 0) {
		gAmplifierMutePin = settings->ampMutePin;
		gAmplifierShouldBeginMuted = settings->beginMuted;

		if(gpio_export(settings->ampMutePin)) {
			if(gRTAudioVerbose)
				fprintf(stderr, "Warning: couldn't export amplifier mute pin %d\n", settings->ampMutePin);
		}
		if(gpio_set_dir(settings->ampMutePin, OUTPUT_PIN)) {
			if(gRTAudioVerbose)
				fprintf(stderr, "Couldn't set direction on amplifier mute pin\n");
			return -1;
		}
		if(gpio_set_value(settings->ampMutePin, LOW)) {
			if(gRTAudioVerbose)
				fprintf(stderr, "Couldn't set value on amplifier mute pin\n");
			return -1;
		}
	}

	if(settings->numAnalogInChannels != settings->numAnalogOutChannels){
		fprintf(stderr, "Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
		return 1;
	}
	unsigned int numAnalogChannels = settings->numAnalogInChannels;
	// Limit the analog channels to sane values
	if(numAnalogChannels != 2
		&& numAnalogChannels != 4
		&& numAnalogChannels != 8) {
			fprintf(stderr,"Invalid number of analog channels: %u. Valid values are 2, 4, 8.\n", numAnalogChannels);
			return -1;
	}

	// Initialise the rendering environment: sample rates, frame counts, numbers of channels
	BelaHw actualHw = Bela_detectHw(BelaHwDetectMode_Cache);
	if(gRTAudioVerbose)
		printf("Detected hardware: %s\n", getBelaHwName(actualHw).c_str());
	// Check for user-selected hardware, either on the command line ...
	BelaHw userHw = settings->board;
	if(gRTAudioVerbose)
		printf("Hardware specified at the command line: %s\n", getBelaHwName(settings->board).c_str());
	if(userHw == BelaHw_NoHw)
	{
		userHw = Bela_detectHw(BelaHwDetectMode_UserOnly); // ... or in the user belaconfig
		if(gRTAudioVerbose)
			printf("Hardware specified in the user's belaconfig: %s\n", getBelaHwName(userHw).c_str());
	}
	if(userHw == actualHw)
		belaHw = userHw;
	else if(userHw != BelaHw_NoHw && Bela_checkHwCompatibility(userHw, actualHw))
		belaHw = userHw;
	else
		belaHw = actualHw;
	if(gRTAudioVerbose)
		printf("Hardware to be used: %s\n", getBelaHwName(belaHw).c_str());
	if(BelaHw_NoHw == belaHw)
	{
		fprintf(stderr, "Error: unrecognized Bela hardware. Is a cape connected?\n");
		return 1;
	}

	std::string codecMode;
	if(settings->codecMode)
		codecMode = settings->codecMode;

	if(BelaHw_Batch == belaHw)
	{
		gCoreRender = settings->render;
		return initBatch(settings, &gContext, codecMode, gUserData);
	}
	// figure out which codec to use and which to disable if several are present and conflicting
	unsigned int ctags;
        if((ctags = Bela_hwContains(belaHw, CtagCape)))
	{
		if(1 == ctags)
			gAudioCodec = new Spi_Codec(ctagSpidevGpioCs0, NULL);
		else if (2 == ctags)
			gAudioCodec = new Spi_Codec(ctagSpidevGpioCs0, ctagSpidevGpioCs1);
		if(Bela_hwContains(actualHw, Tlv320aic3104))
			gDisabledCodec = new I2c_Codec(codecI2cBus, codecI2cAddress, I2c_Codec::TLV320AIC3104, gRTAudioVerbose);
	}
	else if(belaHw == BelaHw_BelaMiniMultiAudio) {
		std::string mode;
		if("" != codecMode)
			mode = "MODE:"+codecMode;
		gAudioCodec = new I2c_MultiTLVCodec("ADDR:2,24,3104,n;ADDR:2,25,3106,n;ADDR:2,26,3106,n;ADDR:2,27,3106,n;"+mode, {}, gRTAudioVerbose);
	}
	else if(BelaHw_BelaMiniMultiTdm == belaHw || BelaHw_BelaMultiTdm == belaHw)
		gAudioCodec = new I2c_MultiTdmCodec(codecMode != "" ? codecMode : "ADDR:2,24,3104,r", gRTAudioVerbose);
	else if(BelaHw_BelaMiniMultiI2s == belaHw)
		gAudioCodec = new I2c_MultiI2sCodec(codecI2cBus, codecI2cAddress, I2c_Codec::TLV320AIC3104, gRTAudioVerbose);
	else if(Bela_hwContains(belaHw, Tlv320aic3104))
	{
		gAudioCodec = new I2c_Codec(codecI2cBus, codecI2cAddress, I2c_Codec::TLV320AIC3104, gRTAudioVerbose);
		if(Bela_hwContains(actualHw, CtagCape))
			gDisabledCodec = new Spi_Codec(ctagSpidevGpioCs0, ctagSpidevGpioCs1);
	}

	if(!gAudioCodec)
	{
		fprintf(stderr, "Error: invalid combinations of selected and available hardware\n");
		return 1;
	}
	// note: for some of the codecs, codecMode may have been
	// been used above and/or this may be a NOP
	gAudioCodec->setMode(codecMode);

	BelaHwConfig cfg = {0};
	BelaHwConfigPrivate pcfg;
	pcfg.activeCodec = gAudioCodec;
	pcfg.disabledCodec = gDisabledCodec;
	if(Bela_getHwConfigPrivate(belaHw, &cfg, &pcfg))
	{
		fprintf(stderr, "Error while retrieving hardware settings Bela hardware: is a cape connected?\n");
		return 1;
	}
	gContext.audioSampleRate = cfg.audioSampleRate;
	gContext.audioInChannels = cfg.audioInChannels;
	gContext.audioOutChannels = cfg.audioOutChannels;
	// only some period sizes are available, depending on the available PRU memory and channel count.
	// when a requested period size exceeds available "native" limit, we add another thread and fifo.
	// TODO: make the below detection smarter (e.g.: consider analog channel count, and verify numbers)
	// TODO: validate values of audio frames.
	gFifoFactor = 1;
	switch(belaHw)
	{
		case BelaHw_Bela:
		case BelaHw_BelaMini:
		case BelaHw_Salt:
			gFifoFactor = settings->periodSize / 128;
		break;
		case BelaHw_CtagFace:
		case BelaHw_CtagFaceBela:
		case BelaHw_BelaMiniMultiI2s:
			gFifoFactor = settings->periodSize / 64;
		break;
		case BelaHw_CtagBeast:
		case BelaHw_BelaMultiTdm:
		case BelaHw_BelaMiniMultiTdm:
		case BelaHw_BelaMiniMultiAudio:
		case BelaHw_CtagBeastBela:
			gFifoFactor = settings->periodSize / 32;
		break;
		case BelaHw_NoHw:
		case BelaHw_Batch:
		break;
	}
	if(1 > gFifoFactor)
		gFifoFactor = 1;

	if(gRTAudioVerbose)
		printf("gFifoFactor: %u\n", gFifoFactor);

	gContext.audioFrames = settings->periodSize / gFifoFactor;
	if(gRTAudioVerbose)
		printf("core audioFrames: %u\n", gContext.audioFrames);

	if(settings->projectName)
	{
		strncpy(gContext.projectName, settings->projectName, MAX_PROJECTNAME_LENGTH - 1);
		if(gRTAudioVerbose)
			printf("Project name: %s\n", gContext.projectName);
	}
	gAudioCodec = pcfg.activeCodec;
	if(pcfg.disabledCodec)
	{
		pcfg.disabledCodec->disable(); // Put unused codec in high impedance state
	}

	if(settings->useAnalog && (cfg.analogInChannels || cfg.analogOutChannels)) {

		// TODO: a different number of channels for inputs and outputs is not yet supported
		gContext.analogOutChannels = std::min((int)cfg.analogOutChannels, settings->numAnalogOutChannels);
		gContext.analogInChannels = std::min((int)cfg.analogInChannels, settings->numAnalogInChannels);
		unsigned int numAnalogChannelsForSampleRate = gContext.analogInChannels;
		gContext.analogSampleRate = gContext.audioSampleRate * 4.0 / (float)numAnalogChannelsForSampleRate;
		gContext.analogFrames = gContext.audioFrames / (int)(gContext.audioSampleRate / gContext.analogSampleRate + 0.5f);
		gContext.audioExpanderEnabled = (settings->audioExpanderInputs & 0xFFFF) |
										((settings->audioExpanderOutputs & 0xFFFF) << 16);
	}
	else {
		gContext.analogFrames = 0;
		gContext.analogInChannels = 0;
		gContext.analogOutChannels = 0;
		gContext.analogSampleRate = 0;
		gContext.audioExpanderEnabled = 0;
	}

	if(gContext.analogOutChannels && (gContext.analogInChannels != gContext.analogOutChannels)){
		fprintf(stderr, "TODO: a different number of channels for analog inputs and outputs is not yet supported (unless outputs are 0)\n");
		return -1;
	}
	unsigned int analogChannels = gContext.analogInChannels;
	// Sanity check the combination of channels and period size
	if( analogChannels != 0 && ((analogChannels <= 4 && gContext.analogFrames < 2) ||
			(analogChannels <= 2 && gContext.analogFrames < 4)) )
	{
		fprintf(stderr,"Error: %u analog channels and period size of %d not supported.\n", analogChannels, gContext.analogFrames);
		return 1;
	}

	// For now, digital frame rate is equal to audio frame rate
	if(settings->useDigital) {
		gContext.digitalFrames = gContext.audioFrames;
		gContext.digitalSampleRate = gContext.audioSampleRate;
		gContext.digitalChannels = settings->numDigitalChannels;
	}
	else {
		gContext.digitalFrames = 0;
		gContext.digitalSampleRate = 0;
		gContext.digitalChannels = 0;
	}

	// Set flags based on init settings
	if(settings->interleave){
		gContext.flags |= BELA_FLAG_INTERLEAVED;
	}

	if(settings->analogOutputsPersist)
		gContext.flags |= BELA_FLAG_ANALOG_OUTPUTS_PERSIST;

	if(settings->detectUnderruns)
		gContext.flags |= BELA_FLAG_DETECT_UNDERRUNS;

	// Use PRU for audio
	gPRU = new PRU(&gContext);

	// Get the PRU memory buffers ready to go
	if(gPRU->initialise(belaHw, settings->pruNumber, settings->uniformSampleRate,
                                settings->numMuxChannels, settings->stopButtonPin, settings->enableLED)) {
		fprintf(stderr, "Error: unable to initialise PRU\n");
		return 1;
	}

	if(1 < gFifoFactor)
	{
		gFifoContent = 0;
		gBcf = new BelaContextFifo;
		if(!(gUserContext = gBcf->setup((BelaContext*)&gContext, gFifoFactor)))
		{
			fprintf(stderr, "Error: unable to initialise BelaContextFifo\n");
			return 1;
		}
		gUserRender = settings->render;
		gCoreRender = fifoRender;
	} else {
		gUserContext = (BelaContext*)&gContext;
		gUserRender = nullptr;
		gCoreRender = settings->render;
	}

	if(gAudioCodec->initCodec()) {
		cerr << "Error: unable to initialise audio codec\n";
		return 1;
	}

	// TODO: add more argument checks

	if(setChannelGains(settings->audioInputGains, Bela_setAudioInputGain))
		if(gRTAudioVerbose)
			printf("Setting audio input gains: channels out of range\n");
	if(setChannelGains(settings->headphoneGains, Bela_setHpLevel))
		if(gRTAudioVerbose)
			printf("Setting audio headphone gains: channels out of range\n");
	if(setChannelGains(settings->dacGains, Bela_setDacLevel))
		if(gRTAudioVerbose)
			printf("Setting audio dac gains: channels out of range\n");
	if(setChannelGains(settings->adcGains, Bela_setAdcLevel))
		if(gRTAudioVerbose)
			printf("Setting audio adc gains: channels out of range\n");

	// These are deprecated. We keep them for bw compatibilty.
	// will be removed later.
	// They have to come after the newer ones above
	for(unsigned int n = 0; n < 2; n++)
	{
		if(BELA_INVALID_GAIN != settings->pgaGain[n])
			Bela_setPgaGain(settings->pgaGain[n], n); // DEPRECATED
	}
	if(BELA_INVALID_GAIN != settings->headphoneLevel)
		Bela_setHeadphoneLevel(settings->headphoneLevel); // DEPRECATED
	if(BELA_INVALID_GAIN != settings->dacLevel)
		Bela_setDACLevel(settings->dacLevel); // DEPRECATED
	if(BELA_INVALID_GAIN != settings->adcLevel)
		Bela_setADCLevel(settings->adcLevel); // DEPRECATED

	gBlockDurationMs = gUserContext->audioFrames / gUserContext->audioSampleRate * 1000;
	// Call the user-defined initialisation function
	if(settings->setup && !(*settings->setup)(gUserContext, userData)) {
		if(gRTAudioVerbose)
			fprintf(stderr, "Couldn't initialise audio rendering: setup() returned false\n");
		return 1;
	}

	return 0;
}

// audioLoop() is the main function which starts the PRU audio code
// and then transfers control to the PRU object. The PRU object in
// turn will call the audio render() callback function every time
// there is new data to process.

void audioLoop(void *)
{
#ifdef XENOMAI_CATCH_MSW
	pthread_setmode_np(0, PTHREAD_WARNSW, NULL);
#endif // XENOMAI_CATCH_MSW
	if(gRTAudioVerbose)
		rt_printf("_________________Audio Thread!\n");

	// All systems go. Run the loop; it will end when gShouldStop is set to 1
	BelaCpuData* cpuData = NULL;
	if(belaCpuData.count)
		cpuData = &belaCpuData;
	gPRU->loop(gUserData, gCoreRender, gHighPerformanceMode, cpuData);
	// Now clean up
	// gPRU->waitForFinish();
	gPRU->disable();
	gAudioCodec->stopAudio();
	gPRU->cleanupGPIO();

	if(gBelaAudioThreadDone)
		gBelaAudioThreadDone(gUserContext, gUserData);
	if(gRTAudioVerbose)
		printf("audio thread ended\n");
}

// when using fifo, this is called by PRU::loop()
// It quickly sends the data to the fifo and retrieves data from the fifo.
void fifoRender(BelaContext* context, void* userData)
{
	gBcf->push(BelaContextFifo::kToLong, context);
	++gFifoContent;
	InternalBelaContext* rctx = nullptr;
	// only start reading when the FIFO is "full" to its nominal level:
	// the 2 * is because of roundtrip.
	// If we were reading unconditionally, we may obtain a smaller roundtrip
	// to begin with, depending on CPU load, but it may increase when an
	// "underrun" happens in the fifoLoop thread (currently undetected).
	while(gFifoContent >= gFifoFactor * 2 && !Bela_stopRequested())
	{
		rctx = (InternalBelaContext*)gBcf->pop(BelaContextFifo::kToShort);
		if(rctx) {
			--gFifoContent;
		} else {
			// if a ctx was not ready, it means that the user's
			// render function took too long to execute (i.e.:
			// underrun), so we wait for it. This will cause an
			// underrun in the audio thread which will be detected
			// in PRU::loop() as usual
			struct timespec ts = {
				.tv_sec = 0,
				.tv_nsec = 5 * 1000 * 1000,
			};
			__wrap_nanosleep(&ts, NULL);
		}
	}
	if(rctx)
		BelaContextSplitter::contextCopyData(rctx, (InternalBelaContext*)context);
}

// when using fifo, this is where the user-defined render() is called
void fifoLoop(void* userData)
{
	if(gRTAudioVerbose)
		printf("_________________Fifo Thread!\n");
	uint64_t audioFramesElapsed = 0;
	while(!Bela_stopRequested())
	{
		BelaContext* context = gBcf->pop(BelaContextFifo::kToLong, gBlockDurationMs * 2);
		if(context)
		{
			((InternalBelaContext*)context)->audioFramesElapsed = audioFramesElapsed;
			gUserRender(context, gUserData);
			audioFramesElapsed += context->audioFrames;
			gBcf->push(BelaContextFifo::kToShort, context);
		} else {
			if(gRTAudioVerbose)
				rt_fprintf(stderr, "fifoTask did not receive a valid context\n");
			usleep(1000); // TODO: this  should not be needed, given how the timeout in pop() is for a reasonable amount of time
		}
	}
	if(gRTAudioVerbose)
		printf("fifo thread ended\n");
}

static int startAudioInline(){
	if(gRTAudioVerbose)
		printf("startAudioInline\n");
	gShouldStop = 0;
	if(BelaHw_Batch == belaHw) {
		return 0;
	}
	// make sure we have everything
	assert(gAudioCodec != 0 && gPRU != 0);

	// power up and initialize audio codec
	if(gAudioCodec->startAudio(0)) {
		fprintf(stderr, "Error: unable to start I2C audio codec\n");
		return -1;
	}

	McaspConfig mcaspConfig = gAudioCodec->getMcaspConfig();
	if(gRTAudioVerbose)
		mcaspConfig.print();
	// initialize and run the PRU
	if(gPRU->start(gPRUFilename, mcaspConfig.getRegisters())) {
		fprintf(stderr, "Error: unable to start PRU from %s\n", gPRUFilename[0] ? "embedded binary" : gPRUFilename);
		return -1;
	}

	if(!gAmplifierShouldBeginMuted) {
		// First unmute the amplifier
		if(Bela_muteSpeakers(0)) {
			if(gRTAudioVerbose)
				printf("Warning: couldn't set value (high) on amplifier mute pin\n");
		}
	}

	// ready to go
	return 0;
}

int Bela_runInSameThread()
{
#ifdef XENOMAI_SKIN_native
	RT_TASK thisTask;
	int ret = 0;

	// do the initialization
	ret = startAudioInline();
	if(ret < 0)
		return ret;

	// turn the current thread into a Xenomai task: we become the audio thread
	ret = rt_task_shadow(&thisTask, gRTAudioThreadName, BELA_AUDIO_PRIORITY, T_JOINABLE | T_FPU);
	if(ret == -EBUSY){
	// task already is a Xenomai task:
	// let's only re-adjust the priority
		ret = rt_task_set_priority(&thisTask, BELA_AUDIO_PRIORITY);
	}

	if(ret < 0)
	{
		fprintf(stderr, "Error: unable to shadow Xenomai audio thread: %s \n", strerror(-ret));
		return ret;	
	}

	ret = Bela_startAllAuxiliaryTasks();
	if(ret < 0)
		return ret;

	// this starts the infinite loop that can only be broken out of
	// by calling Bela_requestStop()
	audioLoop(NULL);

	// Once you get out of it, stop properly (in case you didn't already):
	Bela_stopAudio();
	return ret;
#endif
#ifdef XENOMAI_SKIN_posix
	fprintf(stderr, "Turning the current thread into the audio thread is not supported with the POSIX skin.\n");
	exit(1);
#endif
}

int Bela_startAudio()
{
	if(gRTAudioVerbose)
		printf("Bela_startAudio\n");
	// Create audio thread with high Xenomai priority
	unsigned int stackSize = gAudioThreadStackSize;
	int ret;
#ifdef XENOMAI_SKIN_native
	if(ret = rt_task_create(&gRTAudioThread, gRTAudioThreadName, stackSize, BELA_AUDIO_PRIORITY, T_JOINABLE | T_FPU))
	{
		  fprintf(stderr,"Error: unable to create Xenomai audio thread: %s \n" ,strerror(-ret));
		  return -1;
	}
#endif

	ret = startAudioInline();
	if(ret < 0)
		return ret;

	if(BelaHw_Batch == belaHw) {
		return batchCallbackLoop(&gContext, gCoreRender, gUserData);
	}

	// Start all RT threads
#ifdef XENOMAI_SKIN_native
	if(ret = rt_task_start(&gRTAudioThread, &audioLoop, 0))
	{
		fprintf(stderr,"Error: unable to start Xenomai audio thread: %s \n" ,strerror(-ret));
      		return -1;
	}
	if(gBcf)
	{
		fprintf(stderr,"Error: cannot use SKIN_native with audio fifo\n");
		return -1;
	}
#endif
#ifdef XENOMAI_SKIN_posix
	int audioPriority;
	if(gBcf)
	{
		//if there is a fifo, the core audio thread below will need a higher priority
		audioPriority = BELA_AUDIO_PRIORITY + 1;
		// and we start an extra thread with usual audio priority in which the user's render() will run
		ret = create_and_start_thread(&gFifoThread, gFifoThreadName, audioPriority - 1, stackSize, (pthread_callback_t*)fifoLoop, NULL);
		if(ret)
		{
			fprintf(stderr, "Error: unable to start Xenomai fifo audio thread: %d %s\n", ret, strerror(-ret));
			return -1;
		}
	} else {
		audioPriority = BELA_AUDIO_PRIORITY;
	}
	ret = create_and_start_thread(&gRTAudioThread, gRTAudioThreadName, audioPriority, stackSize, (pthread_callback_t*)audioLoop, NULL);
	if(ret)
	{
		fprintf(stderr, "Error: unable to start Xenomai audio thread: %d %s\n", ret, strerror(-ret));
		return -1;
	}
#endif

	ret = Bela_startAllAuxiliaryTasks();
	return ret;
}

// Stop the PRU-based audio from running and wait
// for the tasks to complete before returning.

void Bela_stopAudio()
{
	if(gRTAudioVerbose)
		printf("Stopping audio...\n");
	// Tell audio thread to stop (if this hasn't been done already)
	Bela_requestStop();
	if(BelaHw_Batch == belaHw)
		return;

	// Now wait for threads to respond and actually stop...
#ifdef XENOMAI_SKIN_native
	rt_task_join(&gRTAudioThread);
#endif
#ifdef XENOMAI_SKIN_posix
	void* threadReturnValue;
	int ret = __wrap_pthread_join(gRTAudioThread, &threadReturnValue);
	if(ret)
	{
		fprintf(stderr, "Failed to join audio thread: (%d) %s\n", ret, strerror(ret));
	}
	if(gBcf)
	{
		ret = __wrap_pthread_join(gFifoThread, &threadReturnValue);
		if(ret)
			fprintf(stderr, "Failed to join audio fifo thread: (%d) %s\n", ret, strerror(ret));
	}
#endif

	Bela_stopAllAuxiliaryTasks();
}

// Free any resources associated with PRU real-time audio
void Bela_cleanupAudio()
{
	if(gRTAudioVerbose)
		printf("Bela_cleanupAudio()\n");
	if(gBelaCleanup)
		(*gBelaCleanup)(gUserContext, gUserData);

	disable_runfast();
	// Shut down the prussdrv system
	if(gPRU)
		gPRU->exitPRUSS();

	// Clean up the auxiliary tasks
	Bela_deleteAllAuxiliaryTasks();

	// Delete the audio task
#ifdef XENOMAI_SKIN_native
	rt_task_delete(&gRTAudioThread);
#endif

	delete gPRU;
	delete gAudioCodec;
	delete gDisabledCodec;
	delete gBcf;

	if(gAmplifierMutePin >= 0)
		gpio_unexport(gAmplifierMutePin);
	gAmplifierMutePin = -1;
}

void Bela_setUserData(void* newUserData)
{
	gUserData = newUserData;
}

void Bela_requestStop()
{
	gShouldStop = true;
}

int Bela_stopRequested()
{
	return gShouldStop;
}

int Bela_cpuMonitoringInit(int count)
{
	if(!count)
		return 0;
	memset(&belaCpuData, 0, sizeof(belaCpuData));
	belaCpuData.count = count;
	return 0;
}

BelaCpuData* Bela_cpuMonitoringGet()
{
	return &belaCpuData;
}

void Bela_cpuTic(BelaCpuData* data)
{
	if(!data || !data->count)
		return;
	struct timespec tic;
	__wrap_clock_gettime(CLOCK_MONOTONIC, &tic);
	long long unsigned int diff = timespec_sub(&tic, &data->tic);
	data->tic = tic;
	data->total += diff;
	data->currentCount++;
	if(data->count == data->currentCount)
	{
		data->percentage = (double(data->busy) / data->total) * 100;
		data->busy = 0;
		data->total = 0;
		data->currentCount = 0;
	}
}

void Bela_cpuToc(BelaCpuData* data)
{
	if(!data || !data->count)
		return;
	__wrap_clock_gettime(CLOCK_MONOTONIC, &data->toc);
	long long unsigned int diff = timespec_sub(&data->toc, &data->tic);
	data->busy += diff;
}

// Set the level of the DAC; affects all outputs (headphone, line, speaker)
// 0dB is the maximum, -63.5dB is the minimum; 0.5dB steps
int Bela_setDACLevel(float decibels)
{
	return Bela_setDacLevel(-1, decibels);
}

int Bela_setDacLevel(int channel, float decibels)
{
	if(gAudioCodec == 0)
		return -1;
	return gAudioCodec->setDacVolume(channel, decibels);
}

// Set the level of the ADC
// 0dB is the maximum, -12dB is the minimum; 1.5dB steps
int Bela_setADCLevel(float decibels)
{
	return Bela_setAdcLevel(-1, decibels);
}

int Bela_setAdcLevel(int channel, float decibels)
{
	if(gAudioCodec == 0)
		return -1;
	return gAudioCodec->setAdcVolume(channel, decibels);
}

// Set the level of the Programmable Gain Amplifier
// 59.5dB is maximum, 0dB is minimum; 0.5dB steps
int Bela_setPgaGain(float decibels, int channel){
	return Bela_setAudioInputGain(channel, decibels);
}

int Bela_setAudioInputGain(int channel, float decibels){

	if(gAudioCodec == 0)
		return -1;
	return gAudioCodec->setInputGain(channel, decibels);
}

// Set the level of the onboard headphone amplifier; affects headphone
// output only (not line out or speaker)
// 0dB is the maximum, -63.5dB is the minimum; 0.5dB steps
int Bela_setHpLevel(int channel, float decibels)
{
	if(gAudioCodec == 0)
		return -1;
	return gAudioCodec->setHpVolume(channel, decibels);
}

int Bela_setHeadphoneLevel(float decibels)
{
	return Bela_setHpLevel(-1, decibels);
}

// Mute or unmute the onboard speaker amplifiers
// mute == 0 means unmute; otherwise mute
// Returns 0 on success
int Bela_muteSpeakers(int mute)
{
	//TODO: Nothing to be done for CTAG audio cards
	int pinValue = mute ? LOW : HIGH;

	// Check that we have an enabled pin for controlling the mute
	if(gAmplifierMutePin < 0)
		return -1;

	return gpio_set_value(gAmplifierMutePin, pinValue);
}

void Bela_getVersion(int* major, int* minor, int* bugfix)
{
	*major = BELA_MAJOR_VERSION;
	*minor = BELA_MINOR_VERSION;
	*bugfix = BELA_BUGFIX_VERSION;
}

// Set the verbosity level
void Bela_setVerboseLevel(int level)
{
	gRTAudioVerbose = level >= 0 ? level : 0;
}
