/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Sensors/stepped-pot/render.cpp

Stepped potentiometer
=====================

Connect a potentiometer (stepped or not) to Bela's analog input 0.
This project quantises the reading from that potentiometer and
will keep track of when it changes from one step to the next.

We define the steps in volts and list them in steppedPot.setup().

In this example we use the quantised range of the pot to change the frequecy of
a sinetone oscillator. We use the position integer to multiply the base frequency
of the oscillator and cycle through the harmonic series.
*/

#include <Bela.h>
#include <cmath>
#include <libraries/SteppedPot/BelaSteppedPot.h>

const unsigned int kPotInChannel = 0;
BelaSteppedPot steppedPot;
int gStepNumber = 0;

float gFrequency = 220.0;
float gPhase;
float gInverseSampleRate;

bool setup(BelaContext *context, void *userData)
{
	steppedPot.setup(context, kPotInChannel, {
		// these values are in Volt and assume
		// an 11-step potentiometer connected
		// between 0 and 3.3V
			0,
			0.33,
			0.66,
			0.99,
			1.32,
			1.65,
			1.98,
			2.31,
			2.64,
			2.97,
			3.3,
		},
		0.1, // tolerance (in Volt) around the nominal value stated above
		4.096 // this is the Bela ADC's full-scale input
	);
	gInverseSampleRate = 1.0 / context->audioSampleRate;
	gPhase = 0.0;
	return true;
}

void render(BelaContext *context, void *userData)
{
	bool hasChanged = steppedPot.process(context);
	if(hasChanged)
	{
		rt_printf("Pot has moved to position %u\n", steppedPot.get());
		gStepNumber = steppedPot.get();
	}

	for(unsigned int n = 0; n < context->audioFrames; n++) {
		float out = 0.8f * sinf(gPhase);
		gPhase += 2.0f * (float)M_PI * ((gStepNumber + 1) * gFrequency) * gInverseSampleRate;
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
