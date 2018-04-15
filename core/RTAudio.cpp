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

//#define CTAG_FACE_8CH
//#define CTAG_BEAST_16CH

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <math.h>
#include <iostream>
#include <assert.h>
#include <vector>

#include <sys/mman.h>

#include "../include/Bela.h"

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

// Real-time tasks and objects
#ifdef XENOMAI_SKIN_native
RT_TASK gRTAudioThread;
#endif
#ifdef XENOMAI_SKIN_posix
pthread_t gRTAudioThread;
#endif
#if XENOMAI_MAJOR == 3
int gXenomaiInited = 0;
#endif
static const char gRTAudioThreadName[] = "bela-audio";

PRU *gPRU = 0;
#if defined(CTAG_FACE_8CH) || defined(CTAG_BEAST_16CH)
	Spi_Codec *gAudioCodec = 0;
	I2c_Codec *gNotUsedCodec = 0;
#else
	I2c_Codec *gAudioCodec = 0;
#endif

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

// User data passed in from main()
void *gUserData;
void (*gBelaRender)(BelaContext*, void*);
void (*gBelaCleanup)(BelaContext*, void*);

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
	gBelaRender = settings->render;
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
	memset(&gContext, 0, sizeof(BelaContext));

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
	#if defined(CTAG_FACE_8CH) || defined(CTAG_BEAST_16CH)
		gContext.audioSampleRate = 48000.0;
	#else
		gContext.audioSampleRate = 44100.0;
	#endif

	// TODO: settings a different number of channels for inputs and outputs is not yet supported
	#ifdef CTAG_FACE_8CH
		gContext.audioInChannels = 8;
		gContext.audioOutChannels = 8;
	#elif defined(CTAG_BEAST_16CH)
		gContext.audioInChannels = 16;
		gContext.audioOutChannels = 16;
	#else
		gContext.audioInChannels = 2;
		gContext.audioOutChannels = 2;
	#endif

	if(settings->useAnalog) {
		gContext.audioFrames = settings->periodSize;

		// TODO: a different number of channels for inputs and outputs is not yet supported
		gContext.analogFrames = gContext.audioFrames * 4 / settings->numAnalogInChannels;
		gContext.analogInChannels = settings->numAnalogInChannels;
		gContext.analogOutChannels = settings->numAnalogOutChannels;
		unsigned int numAnalogChannelsForSampleRate = settings->numAnalogInChannels;
		gContext.analogSampleRate = gContext.audioSampleRate * 4.0 / (float)numAnalogChannelsForSampleRate;
		
		gContext.audioExpanderEnabled = (settings->audioExpanderInputs & 0xFFFF) |
										((settings->audioExpanderOutputs & 0xFFFF) << 16);
	}
	else {
		gContext.audioFrames = settings->periodSize;

		gContext.analogFrames = 0;
		gContext.analogInChannels = 0;
		gContext.analogOutChannels = 0;
		gContext.analogSampleRate = 0;
		gContext.audioExpanderEnabled = 0;
	}

	if(gContext.analogInChannels != gContext.analogOutChannels){
		fprintf(stderr, "Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
		return -1;
	}
	unsigned int analogChannels = gContext.analogInChannels;
	// Sanity check the combination of channels and period size
	if( analogChannels != 0 && ((analogChannels <= 4 && gContext.analogFrames < 2) ||
			(analogChannels <= 2 && gContext.analogFrames < 4)) )
	{
		fprintf(stderr,"Error: %u channels and period size of %d not supported.\n", analogChannels, gContext.analogFrames);
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
	#if defined(CTAG_FACE_8CH) || defined(CTAG_BEAST_16CH)
		gNotUsedCodec = new I2c_Codec();
		gNotUsedCodec->disable(); // Put not used codec in high impedance state
		gAudioCodec = new Spi_Codec();
	#else
		gAudioCodec = new I2c_Codec();
	#endif
 	
	

	// Initialise the GPIO pins, including possibly the digital pins in the render routines
	if(gPRU->prepareGPIO(settings->enableLED)) {
		fprintf(stderr, "Error: unable to prepare GPIO for PRU audio\n");
		return 1;
	}
	
	// Get the PRU memory buffers ready to go
	if(gContext.analogInChannels != gContext.analogOutChannels){
		printf("Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
		return 1;
	}

	if(gPRU->initialise(settings->pruNumber, settings->uniformSampleRate,
		 				settings->numMuxChannels, settings->enableCapeButtonMonitoring)) {
		fprintf(stderr, "Error: unable to initialise PRU\n");
		return 1;
	}

	#if defined(CTAG_FACE_8CH) || defined(CTAG_BEAST_16CH)
		gAudioCodec->initCodec();
		//gAudioCodec->dumpRegisters();
	#else
		// Prepare the audio codec, which clocks the whole system
		if(gAudioCodec->initI2C_RW(2, settings->codecI2CAddress, -1)) {
			fprintf(stderr, "Unable to open codec I2C\n");
			return 1;
		}
		if(gAudioCodec->initCodec()) {
			fprintf(stderr, "Error: unable to initialise audio codec\n");
			return 1;
		}
	#endif

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

	// Call the user-defined initialisation function
	if(settings->setup && !(*settings->setup)((BelaContext *)&gContext, userData)) {
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
	gPRU->loop(gUserData, gBelaRender, gHighPerformanceMode);
	// Now clean up
	// gPRU->waitForFinish();
	gPRU->disable();
	gAudioCodec->stopAudio();
	gPRU->cleanupGPIO();

	if(gRTAudioVerbose == 1)
		rt_printf("audio thread ended\n");
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
#endif
#ifdef XENOMAI_SKIN_posix
	ret = create_and_start_thread(&gRTAudioThread, gRTAudioThreadName, BELA_AUDIO_PRIORITY, stackSize, (pthread_callback_t*)audioLoop, NULL);
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
#endif

	Bela_stopAllAuxiliaryTasks();
}

// Free any resources associated with PRU real-time audio
void Bela_cleanupAudio()
{
	if(gBelaCleanup)
		(*gBelaCleanup)((BelaContext *)&gContext, gUserData);

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

// AD1938 audio codec has no ADC volume controls
#if defined(CTAG_FACE_8CH) || defined(CTAG_BEAST_16CH)
#else
	if(gAudioCodec == 0)
		return -1;
	return gAudioCodec->setADCVolume((int)floorf(decibels * 2.0 + 0.5));
#endif

	return 0;
}

// Set the level of the Programmable Gain Amplifier
// 59.5dB is maximum, 0dB is minimum; 0.5dB steps
int Bela_setPgaGain(float decibels, int channel){
//Nothing to be done for CTAG audio cards
#if defined(CTAG_FACE_8CH) || defined(CTAG_BEAST_16CH)
#else
	if(gAudioCodec == 0)
		return -1;
	return gAudioCodec->setPga(decibels, channel);
#endif

	return 0;
}

// Set the level of the onboard headphone amplifier; affects headphone
// output only (not line out or speaker)
// 0dB is the maximum, -63.5dB is the minimum; 0.5dB steps
int Bela_setHeadphoneLevel(float decibels)
{
//Nothing to be done for CTAG audio cards
#if defined(CTAG_FACE_8CH) || defined(CTAG_BEAST_16CH)
#else
	if(gAudioCodec == 0)
		return -1;
	return gAudioCodec->setHPVolume((int)floorf(decibels * 2.0 + 0.5));
#endif
	return 0;
}

// Mute or unmute the onboard speaker amplifiers
// mute == 0 means unmute; otherwise mute
// Returns 0 on success
int Bela_muteSpeakers(int mute)
{
//Nothing to be done for CTAG audio cards
#if defined(CTAG_FACE_8CH) || defined(CTAG_BEAST_16CH)
	return 0;
#else
	int pinValue = mute ? LOW : HIGH;

	// Check that we have an enabled pin for controlling the mute
	if(gAmplifierMutePin < 0)
		return -1;

	return gpio_set_value(gAmplifierMutePin, pinValue);
#endif
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
