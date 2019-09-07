/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\

The platform for ultra-low latency audio and sensor processing

http://bela.io

A project of the Augmented Instruments Laboratory within the
Centre for Digital Music at Queen Mary University of London.
http://www.eecs.qmul.ac.uk/~andrewm

(c) 2016 Augmented Instruments Laboratory: Andrew McPherson,
	Astrid Bin, Liam Donovan, Christian Heinrichs, Robert Jack,
	Giulio Moro, Laurel Pardue, Victor Zappi. All rights reserved.

The Bela software is distributed under the GNU Lesser General Public License
(LGPL 3.0), available here: https://www.gnu.org/licenses/lgpl-3.0.txt
*/

#include <Bela.h>
#include <math_neon.h>
#include <stdlib.h>
#include <time.h>


#define NUM_OSCS 40

float gPhaseIncrement;

float gFrequencies[NUM_OSCS];
float gPhases[NUM_OSCS];

float gFrequenciesLFO[NUM_OSCS];
float gPhasesLFO[NUM_OSCS];

float gScale;

bool setup(BelaContext *context, void *userData)
{
	gPhaseIncrement = 2.0 * M_PI * 1.0 / context->audioSampleRate;
	gScale = 1 / (float)NUM_OSCS * 0.5;

	srand (time(NULL));

	for(int k = 0; k < NUM_OSCS; ++k){
			// Fill array gFrequencies[k] with random freq between 300 - 2700Hz
			gFrequencies[k] = rand() / (float)RAND_MAX * 2400 + 300;
			// Fill array gFrequenciesLFO[k] with random freq between 0.001 - 0.051Hz
			gFrequenciesLFO[k] = rand() / (float)RAND_MAX * 0.05 + 0.001;
			gPhasesLFO[k] = 0;
		}

	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		float out[2] = {0};

		for(int k = 0; k < NUM_OSCS; ++k){

			// Calculate the LFO amplitude
			float LFO = sinf_neon(gPhasesLFO[k]);
			gPhasesLFO[k] += gFrequenciesLFO[k] * gPhaseIncrement;
			if(gPhasesLFO[k] > M_PI)
				gPhasesLFO[k] -= 2.0f * (float)M_PI;

			// Calculate oscillator sinewaves and output them amplitude modulated
			// by LFO sinewave squared.
			// Outputs from the oscillators are summed in out[],
			// with even numbered oscillators going to the left channel out[0]
			// and odd numbered oscillators going to the right channel out[1]
			out[k&1] += sinf_neon(gPhases[k]) * gScale * (LFO*LFO);
			gPhases[k] += gFrequencies[k] * gPhaseIncrement;
			if(gPhases[k] > M_PI)
				gPhases[k] -= 2.0f * (float)M_PI;

		}
		audioWrite(context, n, 0, out[0]);
		audioWrite(context, n, 1, out[1]);
	}
}

void cleanup(BelaContext *context, void *userData)
{

}


/**
\example sinetone-optimized-bank/render.cpp

Using optimized neon functions
---------------------------

This sketch shows how to use the math-neon library which provides optimized
implementation of many simple math functions.
The code is based on the sinetone/render.cpp project, with the following differences:
- we include math_neon.h instead of cmath
- we call sinf_neon() instead of sinf()
- we can therefore have many more oscillators than in the basic project (just about 90)
  and we are using them for a weird additive synth

*/
