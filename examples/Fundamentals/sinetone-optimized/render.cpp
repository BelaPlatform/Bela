/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Fundamentals/sinetone-optimized/render.cpp

Using optimized neon functions
---------------------------

This sketch shows how to use the math-neon library which provides optimized
implementation of many simple math functions.
The code is based on the sinetone/render.cpp project, with the following differences:
- we include libraries/math_neon/math_neon.h instead of cmath
- we call sinf_neon() instead of sinf()
- we can therefore have many more oscillators than in the basic project (just about 90)
  and we are using them for a weird additive synth
*/

#include <Bela.h>
#include <libraries/math_neon/math_neon.h>

float gFrequency = 440.0;
float gPhase;
float gInverseSampleRate;
int gNumOscillators = 120;
float gScale;

bool setup(BelaContext *context, void *userData)
{
	gInverseSampleRate = 1.0 / context->audioSampleRate;
	gPhase = 0.0;
    gScale = 1 / (float)gNumOscillators;
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
	    float out = 0;
	    for(int k = 0; k < gNumOscillators; ++k){
            out += sinf_neon(gPhase) * gScale;
	    }
		gPhase += 2.0f * (float)M_PI * gFrequency * gInverseSampleRate;
		if(gPhase > M_PI)
			gPhase -= 2.0f * (float)M_PI;

		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			audioWrite(context, n, channel, out);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{

}
