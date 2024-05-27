/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Trill/bar-sound/render.cpp

Trill Bar Multitouch Theremin
=============================

This example shows how to communicate with the Trill Bar sensor using
the Trill library.

Each touch on the sensor controls the pitch and volume of an oscillator.

The Trill sensor is scanned on an auxiliary task running parallel to the audio thread
and the number of active touches, their position and size stored as global variables.

Position and size for each touch are then mapped to frequency and amplitude of their
corresponding oscillator. Changes in frequency and amplitude are smoothed using
low pass filters to avoid artifacts.
*/

#include <Bela.h>
#include <cmath>
#include <libraries/Trill/Trill.h>
#include <libraries/OnePole/OnePole.h>
#include <libraries/Oscillator/Oscillator.h>

#define NUM_TOUCH 5 // Number of touches on Trill sensor

// Trill object declaration
Trill touchSensor;

// Location of touches on Trill Bar
float gTouchLocation[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Size of touches on Trill Bar
float gTouchSize[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Number of active touches
unsigned int gNumActiveTouches = 0;

// Sleep time for auxiliary task in microseconds
unsigned int gTaskSleepTime = 12000; // microseconds

// One Pole filters objects declaration
OnePole freqFilt[NUM_TOUCH], ampFilt[NUM_TOUCH];
// Frequency of one pole filters
float gCutOffFreq = 5, gCutOffAmp = 15;
// Oscillators objects declaration
Oscillator osc[NUM_TOUCH];
// Range for oscillator frequency mapping
float gFreqRange[2] = { 200.0, 1500.0 };
// Range for oscillator amplitude mapping
float gAmplitudeRange[2] = { 0.0, 1.0 } ;

/*
* Function to be run on an auxiliary task that reads data from the Trill sensor.
* Here, a loop is defined so that the task runs recurrently for as long as the
* audio thread is running.
*/
void loop(void*)
{
	while(!Bela_stopRequested())
	{
		// Read locations from Trill sensor
		touchSensor.readI2C();
		gNumActiveTouches = touchSensor.getNumTouches();
		for(unsigned int i = 0; i <  gNumActiveTouches; i++) {
			gTouchLocation[i] = touchSensor.touchLocation(i);
			gTouchSize[i] = touchSensor.touchSize(i);
		}
		// For all inactive touches, set location and size to 0
		for(unsigned int i = gNumActiveTouches; i < NUM_TOUCH; i++) {
			gTouchLocation[i] = 0.0;
			gTouchSize[i] = 0.0;
		}
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	// Setup a Trill Bar sensor on i2c bus 1, using the default mode and address
	if(touchSensor.setup(1, Trill::BAR) != 0) {
		fprintf(stderr, "Unable to initialise Trill Bar\n");
		return false;
	}
	touchSensor.printDetails();

	// Set and schedule auxiliary task for reading sensor data from the I2C bus
	Bela_runAuxiliaryTask(loop);

	// For each possible touch...
	for(unsigned int i = 0; i < NUM_TOUCH; i++) {
		// Setup corresponding oscillator
		osc[i].setup(context->audioSampleRate, Oscillator::sine);
		// Setup low pass filters for smoothing frequency and amplitude
		freqFilt[i].setup(gCutOffFreq, context->audioSampleRate);
		ampFilt[i].setup(gCutOffAmp, context->audioSampleRate);
	}

	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		float out = 0.0;
		/* For each touch:
		*
		* 	- Map touch location to frequency of the oscillator
		* 	and smooth value changes using a single pole LP filter
		* 	- Map touch size toa amplitude of the oscillator and
		* 	smooth value changes using a single pole LP filter
		* 	- Compute oscillator value and add to output.
		* 	- The overall output will be scaled by the number of touches.
		*/
		for(unsigned int i = 0; i < NUM_TOUCH; i++) {
			float frequency, amplitude;
			frequency = map(gTouchLocation[i], 0, 1, gFreqRange[0], gFreqRange[1]);
			// Uncomment the line below to apply a filter to the frequency of the oscillators
			// frequency = freqFilt[i].process(frequency);
			amplitude = map(gTouchSize[i], 0, 1, gAmplitudeRange[0], gAmplitudeRange[1]);
			amplitude = ampFilt[i].process(amplitude);

			out += (1.f/NUM_TOUCH) * amplitude * osc[i].process(frequency);
		}
		// Write computed output to audio channels
		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			audioWrite(context, n, channel, out);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{}
