/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Audio/variable-filter/render.cpp

Variable filter
================

This sketch demonstrates how to use the Biquad library to filter an audio
signal, controlling the cutoff frequency of the filter with an analog input.

As updating the filter coefficients is a rather expensive operation, we do it
once per block.
We also filter the analog input signals before using them in order to minimise their noise.

*/

#include <Bela.h>
#include <libraries/Biquad/Biquad.h>
#include <libraries/OnePole/OnePole.h>
#include <stdlib.h>
#include <math.h>

Biquad lpFilter;
OnePole analogSmooth;

bool setup(BelaContext *context, void *userData)
{
	analogSmooth.setup(50, context->analogSampleRate);
	return true;
}

void render(BelaContext *context, void *userData) {
	// smooth analog input signals
	float analogIn = 0;
	for(unsigned int n = 0; n < context->analogFrames; ++n)
		analogIn = analogSmooth.process(analogRead(context, n, 0));
	// once per block update the audio filter cutoff
	// analog in 0 controls cutoff with exponential scaling:
	// the analog input is mapped between 200 Hz and 200 + 2^13 = 8392 Hz
	float cutoff = powf(2, analogIn * 13) + 200;
	lpFilter.setup({
		.fs = context->audioSampleRate,
		.type = BiquadCoeff::lowpass,
		.cutoff = cutoff,
		.q = 0.707,
		.peakGainDb = 3,
	});
	for(unsigned int n = 0; n < context->audioFrames; ++n)
	{
		float in = rand() / float(RAND_MAX) * 2.f - 1.f; // a noise source
		float out = lpFilter.process(in);
		for(unsigned int c = 0; c < context->audioOutChannels; c++)
			audioWrite(context, n, c, out);
	}
}

void cleanup(BelaContext *context, void *userData)
{

}
