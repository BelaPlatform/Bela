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


#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <math.h>
#include <iostream>
#include <assert.h>
#include <vector>

// Xenomai-specific includes
#include <sys/mman.h>
#include <native/task.h>
#include <native/timer.h>
#include <native/intr.h>
#include <rtdk.h>

#include "../include/Bela.h"
#include "../include/PRU.h"
#include "../include/I2c_Codec.h"
#include "../include/GPIOcontrol.h"

// ARM interrupt number for PRU event EVTOUT7
#define PRU_RTAUDIO_IRQ		21

using namespace std;

// Data structure to keep track of auxiliary tasks we
// can schedule
typedef struct {
	RT_TASK task;
	void (*argfunction)(void*);
	void (*function)(void);
	char *name;
	int priority;
	bool started;
	bool hasArgs;
	void* args;
	bool autoSchedule;
} InternalAuxiliaryTask;

// Real-time tasks and objects
RT_TASK gRTAudioThread;
const char gRTAudioThreadName[] = "bela-audio";

#ifdef BELA_USE_XENOMAI_INTERRUPTS
RT_INTR gRTAudioInterrupt;
const char gRTAudioInterruptName[] = "bela-pru-irq";
#endif

PRU *gPRU = 0;
I2c_Codec *gAudioCodec = 0;

vector<InternalAuxiliaryTask*> &getAuxTasks(){
	static vector<InternalAuxiliaryTask*> auxTasks;
	return auxTasks;
}

// Flag which tells the audio task to stop
int gShouldStop = false;

// general settings
char gPRUFilename[MAX_PRU_FILENAME_LENGTH];		// Path to PRU binary file (internal code if empty)_
int gRTAudioVerbose = 0;   						// Verbosity level for debugging
int gAmplifierMutePin = -1;
int gAmplifierShouldBeginMuted = 0;

#ifdef PRU_SIGXCPU_BUG_WORKAROUND
bool gProcessAnalog;
#endif /* PRU_SIGXCPU_BUG_WORKAROUND */

// Context which holds all the audio/sensor data passed to the render routines
InternalBelaContext gContext;

// User data passed in from main()
void *gUserData;

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
	// First check if there's a Bela program already running on the board.
	// We can't have more than one instance at a time, but we can tell via
	// the Xenomai task info. We expect the rt_task_bind call to fail so if it
	// doesn't then it means something else is running.
	RT_TASK otherBelaTask;
	int returnVal = rt_task_bind(&otherBelaTask, gRTAudioThreadName, TM_NONBLOCK);
	if(returnVal == 0) {
		cout << "Error: Bela is already running in another process. Cannot start.\n";
		rt_task_unbind(&otherBelaTask);
		return -1;
	}
	else if(returnVal != -EWOULDBLOCK && returnVal != -ETIMEDOUT) {
		cout << "Error " << returnVal << " occurred determining if another Bela task is running.\n";
		return -1;
	}
	
	// Sanity checks
	if(settings->pruNumber < 0 || settings->pruNumber > 1) {
		cout << "Invalid PRU number " << settings->pruNumber << endl;
		return -1;
	}
	if(settings->pruNumber != 1 && settings->numMuxChannels != 0) {
		cout << "Incompatible settings: multiplexer can only be run using PRU 1\n";
		return -1;
	}
	
	rt_print_auto_init(1);

	Bela_setVerboseLevel(settings->verbose);
	strncpy(gPRUFilename, settings->pruFilename, MAX_PRU_FILENAME_LENGTH);
	gUserData = userData;

	// Initialise context data structure
	memset(&gContext, 0, sizeof(BelaContext));

	if(gRTAudioVerbose) {
		cout << "Starting with period size " << settings->periodSize << "; ";
		if(settings->useAnalog)
			cout << "analog enabled\n";
		else
			cout << "analog disabled\n";
		cout << "DAC level " << settings->dacLevel << "dB; ADC level " << settings->adcLevel;
		cout << "dB; headphone level " << settings->headphoneLevel << "dB\n";
		if(settings->beginMuted)
			cout << "Beginning with speaker muted\n";
	}

	// Prepare GPIO pins for amplifier mute and status LED
	if(settings->ampMutePin >= 0) {
		gAmplifierMutePin = settings->ampMutePin;
		gAmplifierShouldBeginMuted = settings->beginMuted;

		if(gpio_export(settings->ampMutePin)) {
			if(gRTAudioVerbose)
				cout << "Warning: couldn't export amplifier mute pin " << settings-> ampMutePin << "\n";
		}
		if(gpio_set_dir(settings->ampMutePin, OUTPUT_PIN)) {
			if(gRTAudioVerbose)
				cout << "Couldn't set direction on amplifier mute pin\n";
			return -1;
		}
		if(gpio_set_value(settings->ampMutePin, LOW)) {
			if(gRTAudioVerbose)
				cout << "Couldn't set value on amplifier mute pin\n";
			return -1;
		}
	}

	if(settings->numAnalogInChannels != settings->numAnalogOutChannels){
		printf("Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
		return 1;
	}
	unsigned int numAnalogChannels = settings->numAnalogInChannels;
	// Limit the analog channels to sane values
	if(numAnalogChannels != 2
		&& numAnalogChannels != 4
		&& numAnalogChannels != 8) {
			cout << "Invalid number of analog channels: " << numAnalogChannels << ". Valid values are 2, 4, 8.\n";
			return -1;
	}

	// Initialise the rendering environment: sample rates, frame counts, numbers of channels
	gContext.audioSampleRate = 44100.0;

	// TODO: settings a different number of channels for inputs and outputs is not yet supported
	gContext.audioInChannels = 2;
	gContext.audioOutChannels = 2;

#ifdef PRU_SIGXCPU_BUG_WORKAROUND
	// TODO: see PRU bug mentioned above. We catch here if useAnalog was set to false, store it in gProcessAnalog
	// and use this value to decide whether we should process the analogs in PRU::loop, but then we
	// set it to true so that the PRU is init'd and the code runs AS IF the analogs were in use.
	gProcessAnalog = settings->useAnalog;
	settings->useAnalog = true;
#endif /* PRU_SIGXCPU_BUG_WORKAROUND */

	if(settings->useAnalog) {
		gContext.audioFrames = settings->periodSize;

		// TODO: a different number of channels for inputs and outputs is not yet supported
		gContext.analogFrames = gContext.audioFrames * 4 / settings->numAnalogInChannels;
		gContext.analogInChannels = settings->numAnalogInChannels;
		gContext.analogOutChannels = settings->numAnalogOutChannels;
		unsigned int numAnalogChannelsForSampleRate = settings->numAnalogInChannels;
		gContext.analogSampleRate = gContext.audioSampleRate * 4.0 / (float)numAnalogChannelsForSampleRate;
	}
	else {
		gContext.audioFrames = settings->periodSize;

		gContext.analogFrames = 0;
		gContext.analogInChannels = 0;
		gContext.analogOutChannels = 0;
		gContext.analogSampleRate = 0;
	}

	if(gContext.analogInChannels != gContext.analogOutChannels){
		printf("Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
		return -1;
	}
	unsigned int analogChannels = gContext.analogInChannels;
	// Sanity check the combination of channels and period size
	if( analogChannels != 0 && ((analogChannels <= 4 && gContext.analogFrames < 2) ||
			(analogChannels <= 2 && gContext.analogFrames < 4)) )
	{
		cout << "Error: " << analogChannels << " channels and period size of " << gContext.analogFrames << " not supported.\n";
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
	} else {
		//TODO: deinterleaved buffers
		fprintf(stderr, "de-interleaved buffers not yet supported\n");
		exit(1);
	}
	if(settings->analogOutputsPersist)
		gContext.flags |= BELA_FLAG_ANALOG_OUTPUTS_PERSIST;

	// Use PRU for audio
	gPRU = new PRU(&gContext);
	gAudioCodec = new I2c_Codec();

	// Initialise the GPIO pins, including possibly the digital pins in the render routines
	if(gPRU->prepareGPIO(1, 1)) {
		cout << "Error: unable to prepare GPIO for PRU audio\n";
		return 1;
	}
	
	// Get the PRU memory buffers ready to go
	if(gContext.analogInChannels != gContext.analogOutChannels){
		printf("Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
		return 1;
	}

	if(gPRU->initialise(settings->pruNumber, gContext.analogFrames, analogChannels,
		 				settings->numMuxChannels, true)) {
		cout << "Error: unable to initialise PRU\n";
		return 1;
	}

	// Prepare the audio codec, which clocks the whole system
	if(gAudioCodec->initI2C_RW(2, settings->codecI2CAddress, -1)) {
		cout << "Unable to open codec I2C\n";
		return 1;
	}
	if(gAudioCodec->initCodec()) {
		cout << "Error: unable to initialise audio codec\n";
		return 1;
	}

	// Set default volume levels
	Bela_setDACLevel(settings->dacLevel);
	Bela_setADCLevel(settings->adcLevel);
	// TODO: add more argument checks
	for(int n = 0; n < 2; n++){
		if(settings->pgaGain[n] > 59.5){
			std::cerr << "PGA gain out of range [0,59.5]\n";
			exit(1);
		}
		Bela_setPgaGain(settings->pgaGain[n], n);
	}
	Bela_setHeadphoneLevel(settings->headphoneLevel);

#ifdef PRU_SIGXCPU_BUG_WORKAROUND
	unsigned int stashAnalogFrames = gContext.analogFrames;
	unsigned int stashAnalogInChannels = gContext.analogInChannels;
	unsigned int stashAnalogOutChannels = gContext.analogOutChannels;
	if(gProcessAnalog == false){
		gContext.analogFrames = 0;
		gContext.analogInChannels = 0;
		gContext.analogOutChannels = 0;
	}
#endif /* PRU_SIGXCPU_BUG_WORKAROUND */
	// Call the user-defined initialisation function
	if(!setup((BelaContext *)&gContext, userData)) {
		cout << "Couldn't initialise audio rendering\n";
		return 1;
	}
#ifdef PRU_SIGXCPU_BUG_WORKAROUND
	if(gProcessAnalog == false){
		gContext.analogFrames = stashAnalogFrames;
		gContext.analogInChannels = stashAnalogInChannels;
		gContext.analogOutChannels = stashAnalogOutChannels;
	}
#endif /* PRU_SIGXCPU_BUG_WORKAROUND */
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

	// PRU audio
	assert(gAudioCodec != 0 && gPRU != 0);

	if(gAudioCodec->startAudio(0)) {
		rt_printf("Error: unable to start I2C audio codec\n");
		gShouldStop = 1;
	}
	else {
		if(gPRU->start(gPRUFilename)) {
			rt_printf("Error: unable to start PRU from file %s\n", gPRUFilename);
			gShouldStop = 1;
		}
		else {
			// All systems go. Run the loop; it will end when gShouldStop is set to 1

			if(!gAmplifierShouldBeginMuted) {
				// First unmute the amplifier
				if(Bela_muteSpeakers(0)) {
					if(gRTAudioVerbose)
						rt_printf("Warning: couldn't set value (high) on amplifier mute pin\n");
				}
			}

#ifdef BELA_USE_XENOMAI_INTERRUPTS
			gPRU->loop(&gRTAudioInterrupt, gUserData);
#else
			gPRU->loop(0, gUserData);
#endif
			// Now clean up
			// gPRU->waitForFinish();
			gPRU->disable();
			gAudioCodec->stopAudio();
			gPRU->cleanupGPIO();
		}
	}

	if(gRTAudioVerbose == 1)
		rt_printf("audio thread ended\n");
}

// Create a calculation loop which can run independently of the audio, at a different
// (equal or lower) priority. Audio priority is defined in BELA_AUDIO_PRIORITY;
// priority should be generally be less than this.
// Returns an (opaque) pointer to the created task on success; 0 on failure
AuxiliaryTask Bela_createAuxiliaryTask(void (*functionToCall)(void* args), int priority, const char *name, void* args, bool autoSchedule)
{
	InternalAuxiliaryTask *newTask = (InternalAuxiliaryTask*)malloc(sizeof(InternalAuxiliaryTask));

	// Attempt to create the task
	if(int ret = rt_task_create(&(newTask->task), name, 0, priority, T_JOINABLE | T_FPU)) {
		  cout << "Error: unable to create auxiliary task " << name << " : " << strerror(-ret) << endl;
		  free(newTask);
		  return 0;
	}

	// Populate the rest of the data structure and store it in the vector
	newTask->argfunction = functionToCall;
	newTask->name = strdup(name);
	newTask->priority = priority;
	newTask->started = false;
	newTask->args = args;
	newTask->hasArgs = true;
    newTask->autoSchedule = autoSchedule;
    
	getAuxTasks().push_back(newTask);

	return (AuxiliaryTask)newTask;
}

AuxiliaryTask Bela_createAuxiliaryTask(void (*functionToCall)(void), int priority, const char *name, bool autoSchedule)
{
        InternalAuxiliaryTask *newTask = (InternalAuxiliaryTask*)malloc(sizeof(InternalAuxiliaryTask));
        
        // Attempt to create the task
        if(rt_task_create(&(newTask->task), name, 0, priority, T_JOINABLE | T_FPU)) {
                  cout << "Error: unable to create auxiliary task " << name << endl;
                  free(newTask);
                  return 0;
        }
        
        // Populate the rest of the data structure and store it in the vector
        newTask->function = functionToCall;
        newTask->name = strdup(name);
        newTask->priority = priority;
        newTask->started = false;
        newTask->hasArgs = false;
        newTask->autoSchedule = autoSchedule;
        
        getAuxTasks().push_back(newTask);
        
        return (AuxiliaryTask)newTask;
}

// Schedule a previously created (and started) auxiliary task. It will run when the priority rules next
// allow it to be scheduled.
void Bela_scheduleAuxiliaryTask(AuxiliaryTask task)
{
	InternalAuxiliaryTask *taskToSchedule = (InternalAuxiliaryTask *)task;
	if(taskToSchedule->started == false){ // Note: this is not the safest method to check if a task
		Bela_startAuxiliaryTask(task); // is started (or ready to be resumed), but it probably is the fastest.
                                           // A safer approach would use rt_task_inquire()
	}
	rt_task_resume(&taskToSchedule->task);
}
void Bela_autoScheduleAuxiliaryTasks(){
    vector<InternalAuxiliaryTask*>::iterator it;
	for(it = getAuxTasks().begin(); it != getAuxTasks().end(); it++) {
	    if ((InternalAuxiliaryTask *)(*it)->autoSchedule){
    		Bela_scheduleAuxiliaryTask(*it);
	    }
	}
}

// Calculation loop that can be used for other tasks running at a lower
// priority than the audio thread. Simple wrapper for Xenomai calls.
// Treat the argument as containing the task structure
//
// The purpose of this loop is to keep the task alive between schedulings,
// so to avoid the overhead of creating and starting the task every time:
// this way we only requie a "rt_task_resume" to start doing some work
void auxiliaryTaskLoop(void *taskStruct)
{
    InternalAuxiliaryTask *task = ((InternalAuxiliaryTask *)taskStruct);
    
	// Get function to call from the argument
	void (*auxiliary_argfunction)(void* args) = task->argfunction;
    void (*auxiliary_function)(void) = task->function;
    
    // get the task's name
	const char *name = task->name;

	// Wait for a notification
	rt_task_suspend(NULL);

	while(!gShouldStop) {
		// Then run the calculations
		if (task->hasArgs)
    	    auxiliary_argfunction(task->args);
        else
            auxiliary_function();

		// we only suspend if the program is still running
		// otherwise, if we are during cleanup, the task would hang indefinitely
		// if rt_task_suspend is called after rt_task_join (below) has
		// already been called
		if(!gShouldStop){
		// Wait for a notification from Bela_scheduleAuxiliaryTask
			rt_task_suspend(NULL);
		} else {
			break;
		}
	}

	if(gRTAudioVerbose == 1)
		rt_printf("auxiliary task %s ended\n", name);
}


int Bela_startAuxiliaryTask(AuxiliaryTask task){
	InternalAuxiliaryTask *taskStruct;
	taskStruct = (InternalAuxiliaryTask *)task;
	if(taskStruct->started == true)
		return 0;
	if(int ret = rt_task_start(&(taskStruct->task), &auxiliaryTaskLoop, taskStruct)) {
		cerr << "Error: unable to start Xenomai task " << taskStruct->name <<  strerror(-ret) << endl;
		return -1;
	}
	taskStruct->started = true;
	return 0;
}

// startAudio() should be called only after initAudio() successfully completes.
// It launches the real-time Xenomai task which runs the audio loop. Returns 0
// on success.

int Bela_startAudio()
{
	gShouldStop = 0;
	// Create audio thread with high Xenomai priority
	if(int ret = rt_task_create(&gRTAudioThread, gRTAudioThreadName, 0, BELA_AUDIO_PRIORITY, T_JOINABLE | T_FPU)) {
		  cout << "Error: unable to create Xenomai audio thread: " << strerror(-ret) << endl;
		  return -1;
	}

#ifdef BELA_USE_XENOMAI_INTERRUPTS
	// Create an interrupt which the audio thread receives from the PRU
	int result = 0;
	if((result = rt_intr_create(&gRTAudioInterrupt, gRTAudioInterruptName, PRU_RTAUDIO_IRQ, I_NOAUTOENA)) != 0) {
		cout << "Error: unable to create Xenomai interrupt for PRU (error " << result << ")" << endl;
		return -1;
	}
#endif

	// Start all RT threads
	if(rt_task_start(&gRTAudioThread, &audioLoop, 0)) {
		  cout << "Error: unable to start Xenomai audio thread" << endl;
		  return -1;
	}

	// The user may have created other tasks. Start those also.
	vector<InternalAuxiliaryTask*>::iterator it;
	for(it = getAuxTasks().begin(); it != getAuxTasks().end(); it++) {
		int ret = Bela_startAuxiliaryTask(*it);
		if(ret != 0)
			return -2;
	}
	return 0;
}

// Stop the PRU-based audio from running and wait
// for the tasks to complete before returning.

void Bela_stopAudio()
{
	// Tell audio thread to stop (if this hasn't been done already)
	gShouldStop = true;

	if(gRTAudioVerbose)
		cout << "Stopping audio...\n";

	// Now wait for threads to respond and actually stop...
	rt_task_join(&gRTAudioThread);

	// Stop all the auxiliary threads too
	vector<InternalAuxiliaryTask*>::iterator it;
	for(it = getAuxTasks().begin(); it != getAuxTasks().end(); it++) {
		InternalAuxiliaryTask *taskStruct = *it;

		// Wake up each thread and join it
		rt_task_resume(&(taskStruct->task));
		rt_task_join(&(taskStruct->task));
	}
}

// Free any resources associated with PRU real-time audio
void Bela_cleanupAudio()
{
	cleanup((BelaContext *)&gContext, gUserData);

	// Clean up the auxiliary tasks
	vector<InternalAuxiliaryTask*>::iterator it;
	for(it = getAuxTasks().begin(); it != getAuxTasks().end(); it++) {
		InternalAuxiliaryTask *taskStruct = *it;

		// Delete the task
		rt_task_delete(&taskStruct->task);

		// Free the name string and the struct itself
		free(taskStruct->name);
		free(taskStruct);
	}
	getAuxTasks().clear();

	// Delete the audio task and its interrupt
#ifdef BELA_USE_XENOMAI_INTERRUPTS
	rt_intr_delete(&gRTAudioInterrupt);
#endif
	rt_task_delete(&gRTAudioThread);

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
	int pinValue = mute ? LOW : HIGH;

	// Check that we have an enabled pin for controlling the mute
	if(gAmplifierMutePin < 0)
		return -1;

	return gpio_set_value(gAmplifierMutePin, pinValue);
}

// Set the verbosity level
void Bela_setVerboseLevel(int level)
{
	gRTAudioVerbose = level;
}
