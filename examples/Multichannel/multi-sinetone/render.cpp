/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Multichannel/multi-sinetone/render.cpp

Multichannel Sinetone
--------------------

This project is designed to work with the Bela Mini Multichannel Expander or the CTAG multichannel board.

This project generates a sinetone with a different frequency on each of the audio outputs.
*/

#include <Bela.h>
#include <cmath>

#define NUM_OUTPUTS 8

float gPhases[NUM_OUTPUTS];
float gFrequencies[NUM_OUTPUTS] = {
	220,
	330,
	440,
	550,
	660,
	770,
	880,
	990
};

float gInverseSampleRate;

bool setup(BelaContext *context, void *userData)
{
	gInverseSampleRate = 1.0 / context->audioSampleRate;
	for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
		gPhases[channel] = 0.0;
	}
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {

		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			float out = 0.8 * sinf(gPhases[channel]);
			gPhases[channel] += 2.0 * M_PI * gFrequencies[channel] * gInverseSampleRate;
			if(gPhases[channel] > 2.0 * M_PI)
				gPhases[channel] -= 2.0 * M_PI;
			audioWrite(context, n, channel, out);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{

}
