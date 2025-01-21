/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
https://bela.io
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
#include <vector>
#include <libraries/Oscillator/Oscillator.h>

std::vector<Oscillator> oscs;
float gBaseFrequency = 80;
float gAmplitude = 0.8;

bool setup(BelaContext* context, void *userData)
{
	for(unsigned int n = 0; n < context->audioOutChannels; ++n)
		oscs.push_back({context->audioSampleRate, Oscillator::sine});
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			float out = oscs[channel].process(gBaseFrequency * (channel + 1));
			audioWrite(context, n, channel, gAmplitude * out);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{

}
