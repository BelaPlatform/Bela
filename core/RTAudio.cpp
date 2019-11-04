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
#include "../include/board_detect.h"
#include "../include/BelaContextFifo.h"

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
#include "../include/GPIOcontrol.h"
#include "../include/math_neon.h"

// ARM interrupt number for PRU event EVTOUT7
#define PRU_RTAUDIO_IRQ		21

using namespace std;

typedef struct _BelaHwConfig
{
	float audioSampleRate;
	unsigned int audioInChannels;
	unsigned int audioOutChannels;
	unsigned int analogInChannels;
	unsigned int analogOutChannels;
	AudioCodec* activeCodec;
	AudioCodec* disabledCodec;
} BelaHwConfig;

static I2c_Codec* gI2cCodec = NULL;
static Spi_Codec* gSpiCodec = NULL;
AudioCodec* gAudioCodec = NULL;

int Bela_getHwConfig(BelaHw hw, BelaHwConfig* cfg)
{
	memset((void*)cfg, 0, sizeof(BelaHwConfig));
	// set audio codec
	switch(hw)
	{
		case BelaHw_Bela:
			//nobreak
		case BelaHw_BelaMini:
			//nobreak
		case BelaHw_Salt:
			//nobreak
			cfg->activeCodec = gI2cCodec;
			cfg->disabledCodec = gSpiCodec;
			break;
		case BelaHw_CtagFace:
			//nobreak
		case BelaHw_CtagFaceBela:
			//nobreak
		case BelaHw_CtagBeast:
			//nobreak
		case BelaHw_CtagBeastBela:
			cfg->activeCodec = gSpiCodec;
			cfg->disabledCodec = gI2cCodec;
			break;
		case BelaHw_NoHw:
		default:
		return -1; // unrecognized hw
	}
	// set audio I/O
	switch(hw)
	{
		case BelaHw_Bela:
			//nobreak
		case BelaHw_BelaMini:
			//nobreak
		case BelaHw_Salt:
			cfg->audioInChannels = 2;
			cfg->audioOutChannels = 2;
			cfg->audioSampleRate = 44100;
			break;
		case BelaHw_CtagFace:
			//nobreak
		case BelaHw_CtagFaceBela:
			cfg->audioInChannels = 4;
			cfg->audioOutChannels = 8;
			cfg->audioSampleRate = 48000;
			break;
		case BelaHw_CtagBeast:
			//nobreak
		case BelaHw_CtagBeastBela:
			cfg->audioInChannels = 8;
			cfg->audioOutChannels = 16;
			cfg->audioSampleRate = 48000;
			break;
		case BelaHw_NoHw:
		default:
			return -1; // unrecognized hw
	}
	// set analogs:
	switch(hw)
	{
		case BelaHw_Bela:
			//nobreak
		case BelaHw_Salt:
			//nobreak
		case BelaHw_CtagFaceBela:
			//nobreak
		case BelaHw_CtagBeastBela:
			cfg->analogInChannels = 8;
			cfg->analogOutChannels = 8;
			break;
		case BelaHw_BelaMini:
			cfg->analogInChannels = 8;
			break;
		case BelaHw_CtagFace:
			//nobreak
		case BelaHw_CtagBeast:
			//nobreak
		case BelaHw_NoHw:
			//nobreak
		default:
			break;
	}
	return 0;
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
int gRTAudioVerbose = 0; // Verbosity level for debugging

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
void *gUserData;
void (*gCoreRender)(BelaContext*, void*);
void (*gUserRender)(BelaContext*, void*);
void (*gBelaCleanup)(BelaContext*, void*);
static BelaContextFifo* gBcf = nullptr;
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

int Bela_initAudio(BelaInitSettings *settings, void *userData)
{
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
	// initialize Xenomai with manual bootstrapping
	if(!gXenomaiInited)
	{
		int argc = 0;
		char *const *argv;
		xenomai_init(&argc, &argv);
		gXenomaiInited = 1;
	}
#endif
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

	Bela_setVerboseLevel(settings->verbose);
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
	BelaHw belaHw = Bela_detectHw();
	if(gRTAudioVerbose==1)	
		printf("Detected hardware: %s\n", getBelaHwName(belaHw).c_str());
	// Check for user-selected hardware
	BelaHw userHw = settings->board;
	if(gRTAudioVerbose==1)	
		printf("Hardware specified by user: %s\n", getBelaHwName(settings->board).c_str());
	if(userHw == BelaHw_NoHw)
	{
		userHw = Bela_detectUserHw();
		if(gRTAudioVerbose==1)
			printf("Hardware specified in belaconfig: %s\n", getBelaHwName(userHw).c_str());
	}
	if(userHw != BelaHw_NoHw && userHw != belaHw && Bela_checkHwCompatibility(userHw, belaHw))
		belaHw = userHw;
	if(gRTAudioVerbose==1)
		printf("Hardware to be used: %s\n", getBelaHwName(belaHw).c_str());

        // TODO: this is a bit dirty here, it should probably be in getHwConfig, which should probably contextually renamed
        if(belaHw == BelaHw_CtagFace || belaHw == BelaHw_CtagFaceBela)
                gSpiCodec = new Spi_Codec(ctagSpidevGpioCs0, NULL);
        else if(belaHw == BelaHw_CtagBeast || belaHw == BelaHw_CtagBeastBela)
                gSpiCodec = new Spi_Codec(ctagSpidevGpioCs0, ctagSpidevGpioCs1);
        if(belaHw != BelaHw_CtagBeast && belaHw != BelaHw_CtagFace)
                gI2cCodec = new I2c_Codec(codecI2cBus, codecI2cAddress, gRTAudioVerbose);
	BelaHwConfig cfg;
	if(Bela_getHwConfig(belaHw, &cfg))
	{
		fprintf(stderr, "Unrecognized Bela hardware: is a cape connected?\n");
		return 1;
	}
	gContext.audioSampleRate = cfg.audioSampleRate;
	gContext.audioInChannels = cfg.audioInChannels;
	gContext.audioOutChannels = cfg.audioOutChannels;
	// only some period sizes are available, depending on the available PRU memory and channel count.
	// when a requested period size exceeds available "native" limit, we add another thread and fifo.
	// TODO: make the below detection smarter (e.g.: consider analog channel count, and verify numbers)
	// TODO: validate values of audio frames.
	unsigned int fifoFactor = 1;
	switch(belaHw)
	{
		case BelaHw_Bela:
			//nobreak
		case BelaHw_BelaMini:
			//nobreak
		case BelaHw_Salt:
			fifoFactor = settings->periodSize / 128;
		break;
		case BelaHw_CtagFace:
			//nobreak
		case BelaHw_CtagFaceBela:
			fifoFactor = settings->periodSize / 64;
		break;
		case BelaHw_CtagBeast:
			//nobreak
		case BelaHw_CtagBeastBela:
			fifoFactor = settings->periodSize / 32;
		break;
		case BelaHw_NoHw:
		break;
	}
	if(1 > fifoFactor)
		fifoFactor = 1;

	if(gRTAudioVerbose)
		printf("fifoFactor: %u\n", fifoFactor);

	gContext.audioFrames = settings->periodSize / fifoFactor;
	if(gRTAudioVerbose)
		printf("core audioFrames: %u\n", gContext.audioFrames);

	if(settings->projectName)
	{
		strncpy(gContext.projectName, settings->projectName, MAX_PROJECTNAME_LENGTH);
		if(gRTAudioVerbose)
			printf("Project name: %s\n", gContext.projectName);
	}
	gAudioCodec = cfg.activeCodec;
	if(cfg.disabledCodec)
	{
		cfg.disabledCodec->disable(); // Put unused codec in high impedance state
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

	if(1 < fifoFactor)
	{
		gBcf = new BelaContextFifo;
		if(!(gUserContext = gBcf->setup((BelaContext*)&gContext, fifoFactor)))
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

	// Use PRU for audio
	gPRU = new PRU(&gContext, gAudioCodec);

	// Get the PRU memory buffers ready to go
	if(gPRU->initialise(belaHw, settings->pruNumber, settings->uniformSampleRate,
                                settings->numMuxChannels, settings->enableCapeButtonMonitoring, settings->enableLED)) {
		fprintf(stderr, "Error: unable to initialise PRU\n");
		return 1;
	}

	if(gAudioCodec->initCodec()) {
		cerr << "Error: unable to initialise audio codec\n";
		return 1;
	}

	// Set default volume levels
	Bela_setDACLevel(settings->dacLevel);
	Bela_setADCLevel(settings->adcLevel);
	// TODO: add more argument checks
	for(int n = 0; n < 2; n++){
		if(settings->pgaGain[n] > 59.5){
			fprintf(stderr, "PGA gain out of range [0,59.5] for channel %d: %fdB\n", n, settings->pgaGain[n]);
			exit(1);
		}
		Bela_setPgaGain(settings->pgaGain[n], n);
	}
	Bela_setHeadphoneLevel(settings->headphoneLevel);

	gBlockDurationMs = gUserContext->audioFrames / gUserContext->audioSampleRate * 1000;
	// Call the user-defined initialisation function
	if(settings->setup && !(*settings->setup)(gUserContext, userData)) {
		fprintf(stderr, "Couldn't initialise audio rendering\n");
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
	if(gRTAudioVerbose==1)
		rt_printf("_________________Audio Thread!\n");

	// All systems go. Run the loop; it will end when gShouldStop is set to 1
	gPRU->loop(gUserData, gCoreRender, gHighPerformanceMode);
	// Now clean up
	// gPRU->waitForFinish();
	gPRU->disable();
	gAudioCodec->stopAudio();
	gPRU->cleanupGPIO();

	if(gRTAudioVerbose == 1)
		rt_printf("audio thread ended\n");
}

// when using fifo, this is called by PRU::loop()
// It quickly sends the data to the fifo and retrieves data from the fifo.
void fifoRender(BelaContext* context, void* userData)
{
	gBcf->push(BelaContextFifo::kToLong, context);
	const InternalBelaContext* rctx = (InternalBelaContext*)gBcf->pop(BelaContextFifo::kToShort);

	if(rctx) {
		BelaContextSplitter::contextCopyData(rctx, (InternalBelaContext*)context);
	}
}

// when using fifo, this is where the user-defined render() is called
void fifoLoop(void* userData)
{
	if(gRTAudioVerbose)
		rt_printf("_________________Fifo Thread!\n");
	uint64_t audioFramesElapsed = 0;
	while(!gShouldStop)
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
		rt_printf("fifo thread ended\n");
}

static int startAudioInline(){
	// make sure we have everything
	assert(gAudioCodec != 0 && gPRU != 0);

	// power up and initialize audio codec
	if(gAudioCodec->startAudio(0)) {
		fprintf(stderr, "Error: unable to start I2C audio codec\n");
		return -1;
	}

	// initialize and run the PRU
	if(gPRU->start(gPRUFilename)) {
		fprintf(stderr, "Error: unable to start PRU from %s\n", gPRUFilename[0] ? "embedded binary" : gPRUFilename);
		return -1;
	}

	if(!gAmplifierShouldBeginMuted) {
		// First unmute the amplifier
		if(Bela_muteSpeakers(0)) {
			if(gRTAudioVerbose)
				rt_printf("Warning: couldn't set value (high) on amplifier mute pin\n");
		}
	}

	// ready to go
	gShouldStop = 0;
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
	// by setting gShouldStop = 1
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
	// Tell audio thread to stop (if this hasn't been done already)
	gShouldStop = true;

	if(gRTAudioVerbose)
		printf("Stopping audio...\n");

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
	if(gBelaCleanup)
		(*gBelaCleanup)(gUserContext, gUserData);

	disable_runfast();
	// Shut down the prussdrv system
	gPRU->exitPRUSS();

	// Clean up the auxiliary tasks
	void Bela_deleteAllAuxiliaryTasks();

	// Delete the audio task
#ifdef XENOMAI_SKIN_native
	rt_task_delete(&gRTAudioThread);
#endif

	if(gPRU != 0)
		delete gPRU;
	if(gAudioCodec != 0)
		delete gAudioCodec;
	delete gBcf;

	if(gAmplifierMutePin >= 0)
		gpio_unexport(gAmplifierMutePin);
	gAmplifierMutePin = -1;
}

// Set the level of the DAC; affects all outputs (headphone, line, speaker)
// 0dB is the maximum, -63.5dB is the minimum; 0.5dB steps
int Bela_setDACLevel(float decibels)
{
	if(gAudioCodec == 0)
		return -1;
	return gAudioCodec->setDACVolume((int)floorf(decibels * 2.0 + 0.5));

	return 0;
}

// Set the level of the ADC
// 0dB is the maximum, -12dB is the minimum; 1.5dB steps
int Bela_setADCLevel(float decibels)
{

	if(gAudioCodec == 0)
		return -1;
	return gAudioCodec->setADCVolume((int)floorf(decibels * 2.0 + 0.5));
}

// Set the level of the Programmable Gain Amplifier
// 59.5dB is maximum, 0dB is minimum; 0.5dB steps
int Bela_setPgaGain(float decibels, int channel){

	if(gAudioCodec == 0)
		return -1;
	return gAudioCodec->setPga(decibels, channel);
}

// Set the level of the onboard headphone amplifier; affects headphone
// output only (not line out or speaker)
// 0dB is the maximum, -63.5dB is the minimum; 0.5dB steps
int Bela_setHeadphoneLevel(float decibels)
{

	if(gAudioCodec == 0)
		return -1;
	return gAudioCodec->setHPVolume((int)floorf(decibels * 2.0 + 0.5));
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
	gRTAudioVerbose = level;
}
