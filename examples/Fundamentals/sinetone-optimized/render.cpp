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


/**
\example sinetone-optimized/render.cpp

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
