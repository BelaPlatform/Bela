/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Trill/craft-sound/render.cpp

Trill Craft Oscillator Bank
===========================

This project sonifies the readings from the different channels of Trill craft
using a bank of oscillators.

The capacitve channels of the Trill device are scanned on an auxiliary task
running parallel to the audio thread and stored in a global variable.

The reading from each channel on Trill craft are used to control the amplitudes of a
bank of quasi-harmonically-tuned oscillators. You can hear the effect by running your
finger across each pad of the Trill device.

Try changing the cutoff frequency of the smoothing filter which is applied to the Trill
readings to change the response of this example. try filterCutoff = 50;
*/

#include <Bela.h>
#include <libraries/Trill/Trill.h>
#include <libraries/Biquad/Biquad.h>
#include <libraries/Oscillator/Oscillator.h>
#include <vector>
#include <cstring>
#include <cmath>

#define NUM_CAP_CHANNELS 30

// Trill object declaration
Trill touchSensor;
std::vector<Oscillator> gOscBank;

std::vector<Biquad> gFilters;
// Readings for all the different pads on the Trill Craft
float gSensorReading[NUM_CAP_CHANNELS] = { 0.0 };

// Sleep time between reads from the device
unsigned int gTaskSleepTime = 12000; // microseconds

void loop(void*)
{
	while(!Bela_stopRequested())
	{
		// Read raw data from sensor
		touchSensor.readI2C();
		for(unsigned int i = 0; i < NUM_CAP_CHANNELS; i++)
			gSensorReading[i] = touchSensor.rawData[i];
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	// Setup a Trill Craft sensor on i2c bus 1, using the default mode and address
	if(touchSensor.setup(1, Trill::CRAFT) != 0) {
		fprintf(stderr, "Unable to initialise Trill Craft\n");
		return false;
	}
	touchSensor.printDetails();

	// Set and schedule auxiliary task for reading sensor data from the I2C bus
	Bela_runAuxiliaryTask(loop);

	float filterCutoff = 10; // Hz, this is the cutoff of the smoothing filter
	gFilters.resize(NUM_CAP_CHANNELS, Biquad::Settings({.fs = context->audioSampleRate, .type = Biquad::lowpass, .cutoff = filterCutoff, .q = 0.707, .peakGainDb = 0}));
	gOscBank.resize(NUM_CAP_CHANNELS, {context->audioSampleRate, Oscillator::sine});

	// Initialise the oscillator bank in a slightly inharmonic series, one
	// oscillator per each capacitive channel
	float fundFreq = 50;
	for(unsigned int n = 0; n < gOscBank.size(); n++) {
		float freq = fundFreq * powf(1.0 + n, 1.002);
		gOscBank[n].setFrequency(freq);
	}
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; ++n){
		float out = 0;
		for(unsigned int o = 0; o < gOscBank.size(); ++o) {
			float amplitude = gFilters[o].process(gSensorReading[o]);
			// Get sensor reading and filter it to smooth it
			// Use output to control oscillator amplitude (with some headroom)
			// Square it to de-emphasise low but nonzero values
			out += gOscBank[o].process() * amplitude * amplitude / 6.f;
		}
		for(unsigned int c = 0; c < context->audioOutChannels; ++c)
			audioWrite(context, n, c, out);
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
