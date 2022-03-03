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
================

Connect a potentiometer (stepped or not) to Bela's analog input 0, keep track
of when it changes from one step to the next.
*/

#include <Bela.h>
#include <libraries/SteppedPot/BelaSteppedPot.h>

const unsigned int kPotInChannel = 0;
BelaSteppedPot steppedPot;

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
	return true;
}

void render(BelaContext *context, void *userData)
{
	bool hasChanged = steppedPot.process(context);
	if(hasChanged)
	{
		rt_printf("Pot has moved to position %u\n", steppedPot.get());
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
