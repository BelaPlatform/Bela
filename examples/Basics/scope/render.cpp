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
#include <libraries/Scope/Scope.h>
#include <cmath>

// set the frequency of the oscillators
float gFrequency = 110.0;
float gPhase;
float gInverseSampleRate;

// instantiate the scope
Scope scope;

bool setup(BelaContext *context, void *userData)
{
	// tell the scope how many channels and the sample rate
	scope.setup(3, context->audioSampleRate);

	gPhase = 0;
	gInverseSampleRate = 1.0f/context->audioSampleRate;
    
	return true;
}

float lastOut = 0.0;
float lastOut2 = 0.0;
void render(BelaContext *context, void *userData)
{
	// iterate over the audio frames and create three oscillators, seperated in phase by PI/2
	for (unsigned int n = 0; n < context->audioFrames; ++n)
	{
		float out = 0.8f * sinf(gPhase);
		float out2 = 0.8f * sinf(gPhase - (float)M_PI/2.f);
		float out3 = 0.8f * sinf(gPhase + (float)M_PI/2.f);
		gPhase += 2.0f * (float)M_PI * gFrequency * gInverseSampleRate;
		if(gPhase > M_PI)
			gPhase -= 2.0f * (float)M_PI;
			
		// log the three oscillators to the scope
		scope.log(out, out2, out3);
        
		// optional - tell the scope to trigger when oscillator 1 becomes less than oscillator 2
		// note this has no effect unless trigger mode is set to custom in the scope UI
		if (lastOut >= lastOut2 && out < out2){
			scope.trigger();
		}

		lastOut = out;
		lastOut2 = out2;
	}
}

void cleanup(BelaContext *context, void *userData)
{

}


/**
\example scope/render.cpp

Oscilloscope in-browser
-----------------------

This example demonstrates the scope feature of the IDE.

The scope is instantiated at the top of the file via `Scope scope;`

In `setup()` we define how many channels the scope should have and the sample 
rate that it should run at via `scope.setup(3, context->audioSampleRate)`.

In `render()` we choose what the scope log via `scope.log(out, out2, out3)`. 
In this example the scope is logging three sine waves with different phases. To see
the output click on the <b>Open Scope</b> button.

An additional option is to set the trigger of the oscilloscope from within `render()`.
In this example we are triggering the scope when oscillator 1 becomes less than 
oscillator 2 via `scope.trigger()`. Note that this functionality only takes effect
when the triggering mode is set to custom in the scope UI.
*/
