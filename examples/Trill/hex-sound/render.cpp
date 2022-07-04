/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Trill/hex-sound/render.cpp

Trill Hex Oscillator Pad
===========================

This project showcases an example of how to communicate with the Trill Hex sensor using
the Trill library and sonifies the X-Y position and size of the touch via a pair of
detuned oscillators.

The Trill sensor is scanned on an auxiliary task running parallel to the audio thread
and the X-Y position and size stored on global variables.

The vertical position of the touch is mapped to frequency, while the size of the touch
maps to amplitude. Horizontal position is used to control the detuning (difference in frequency)
between the otherwise identic pair of oscillators. The centre of the horizontal axis is both
oscillators in tune. Changes in frequency and amplitude are smoothed using
LP filters to avoid artifacts.
*/

#include <Bela.h>
#include <libraries/Trill/Trill.h>
#include <cmath>
#include <libraries/OnePole/OnePole.h>
#include <libraries/Oscillator/Oscillator.h>

// Trill object declaration
Trill touchSensor;

// Horizontal and vertical position for Trill sensor
float gTouchPosition[2] = { 0.0 , 0.0 };
// Touch size
float gTouchSize = 0.0;

// Oscillators object declaration
Oscillator osc[2];

// Range for oscillator frequency mapping
float gFreqRange[2] = { 100.0, 400.0 };
// Range for oscillator amplitude mapping
float gAmplitudeRange[2] = { 0.0, 1.0 } ;
// Range for oscillator detuning mapping
float gDetuneRange[2] = { -25.0, 25.0 };

// One Pole filters objects declaration
OnePole freqFilt, ampFilt;

// Sleep time for auxiliary task
unsigned int gTaskSleepTime = 12000; // microseconds

/*
 * Function to be run on an auxiliary task that reads data from the Trill sensor.
 * Here, a loop is defined so that the task runs recurrently for as long as the
 * audio thread is running.
 */
void loop(void*)
{
	// loop
	while(!Bela_stopRequested())
	{
		// Read locations from Trill sensor
		touchSensor.readI2C();
		gTouchSize = touchSensor.compoundTouchSize();
		gTouchPosition[0] = touchSensor.compoundTouchHorizontalLocation();
		gTouchPosition[1] = touchSensor.compoundTouchLocation();
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	// Setup a Trill Hex on i2c bus 1, using the default mode and address
	if(touchSensor.setup(1, Trill::HEX) != 0) {
		fprintf(stderr, "Unable to initialise Trill Hex\n");
		return false;
	}

	touchSensor.printDetails();

	Bela_runAuxiliaryTask(loop);

	// Setup low pass filters for smoothing frequency and amplitude
	freqFilt.setup(20, context->audioSampleRate); // Cut-off frequency = 1Hz
	ampFilt.setup(20, context->audioSampleRate); // Cut-off frequency = 1Hz

	osc[0].setup(context->audioSampleRate, Oscillator::square);
	osc[1].setup(context->audioSampleRate, Oscillator::square);

	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {

		float frequency;
		// Map Y-axis to a frequency range
		frequency = map(gTouchPosition[1], 0, 1, gFreqRange[0], gFreqRange[1]);
		// Smooth frequency using low-pass filter
		frequency = freqFilt.process(frequency);
		// Map X-axis to a frequency detuning range
		float detuning;
		detuning = map(gTouchPosition[0], 0, 1, gDetuneRange[0], gDetuneRange[1]);
		// Set frequency of both oscillators, taking into account the detuning
		osc[0].setFrequency(frequency);
		osc[1].setFrequency(frequency+ detuning);

		float amplitude;
		// Map touch size to an amplitude range
		amplitude = map(gTouchSize, 0, 1, gAmplitudeRange[0], gAmplitudeRange[1]);
		// Smooth changes in the amplitude of the oscillator (mapped to X-axis)
		// using a low-pass filter
		amplitude = ampFilt.process(amplitude);
		// Calculate output of both oscillators and sum
		float out = amplitude * 0.5 * (osc[0].process() + osc[1].process());

		// Write to output channels
		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			audioWrite(context, n, channel, .2f * out);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
