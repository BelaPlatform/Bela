/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
https://bela.io
*/
/**
\example Capelets/audio-expander/render.cpp

This example shows you how to read from the extra audio channels
of the audio expander capelet.
*/

#include <Bela.h>
#include <cmath>

float gPhase[10] = {0};
float gFreq[10];
float inAcc[10] = {0};
unsigned int inAccCount[10] = {0};

bool setup(BelaContext *context, void *userData)
{
	float baseFreq = 123;
	for(unsigned int ch = 0; ch < context->audioOutChannels + context->analogOutChannels; ++ch)
		gFreq[ch] = baseFreq * (1 + ch);
	return true;
}

void render(BelaContext *context, void *userData)
{
	// process the audio channels
	for(unsigned int n = 0; n < context->audioFrames; ++n)
	{
		for(unsigned int ch = 0; ch < context->audioOutChannels; ++ch)
		{
			float in = audioRead(context, n, ch);
			inAcc[ch] += in;
			++inAccCount[ch];

			float out = 0.4f * sinf(gPhase[ch]);
			gPhase[ch] += 2.f * (float)M_PI * gFreq[ch] / context->audioSampleRate;
			if(gPhase[ch] > M_PI)
				gPhase[ch] -= 2.f * (float)M_PI;
			audioWrite(context, n, ch, out);
		}
	}

	// process the analog channels
	for(unsigned int n = 0; n < context->analogFrames; ++n)
	{
		for(unsigned int ch = 0; ch < context->analogInChannels; ++ch)
		{
			int idx = ch + context->audioOutChannels;
			float in = analogRead(context, n, ch);
			inAcc[idx] += in;
			++inAccCount[idx];

			// when using the capelet, the analog output is AC-coupled,
			// so we center it around 0, exactly the same as for the audio out
			float out = 0.4f * sinf(gPhase[idx]);
			// use the analogSampleRate instead
			gPhase[idx] += 2.f * (float)M_PI * gFreq[idx] / context->analogSampleRate;
			if(gPhase[idx] > (float)M_PI)
				gPhase[idx] -= 2.f * (float)M_PI;
			analogWriteOnce(context, n, ch, out);
		}
	}

	static int count = 0;
	for(unsigned int n = 0; n < context->audioFrames; ++n)
	{
		count += 1;
		if(count % (int)(context->audioSampleRate * 0.5f) == 0)
		{
			rt_printf("Average input:\n");
			for(unsigned int n = 0; n < 10; ++n)
			{
				rt_printf("[%d]:\t%.3f\t", n, inAcc[n]/inAccCount[n]);
				if(n % 2 == 1)
					rt_printf("\n");
			}
		}
	}

}

void cleanup(BelaContext *context, void *userData)
{

}
