/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Extras/userdata/render.cpp

Passing parameters using the `*userData` argument
-------------------------------------------------

This sketch demonstrates how to pass command line arguments using the `*userData` argument inside the `setup()` function.

In main.cpp we first parse a command line argument `-f` and allocate its value to the variable `frequency`.
We then pass the address of this variable when we call `Bela_initAudio()`. The variable can now be accessed from the
`setup()` and `render()` functions inside render.cpp.
*/

#include <Bela.h>
#include <cmath>

float gFrequency = 440.0;
float gPhase;
float gInverseSampleRate;

bool setup(BelaContext *context, void *userData)
{
	/*
	 *  Retrieve the parameter passed in from the Bela_initAudio() call in main.cpp
	 */
	if(userData != 0)
		gFrequency = *(float *)userData;

	gInverseSampleRate = 1.0 / context->audioSampleRate;
	gPhase = 0.0;

	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		float out = 0.8f * sinf(gPhase);
		gPhase += 2.0 * M_PI * gFrequency * gInverseSampleRate;
		if(gPhase > 2.0 * M_PI)
			gPhase -= 2.0 * M_PI;

		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			audioWrite(context, n, channel, out);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{

}
