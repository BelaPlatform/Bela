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
#include <cmath>
#include <Scope.h>

Scope scope;

float gInverseSampleRate;
float gPhase;

bool setup(BelaContext *context, void *userData)
{

    // setup the scope with 3 channels at the audio sample rate
	scope.setup(3, context->audioSampleRate);
	
	// Check if analog channels are enabled
	if(context->analogFrames == 0 || context->analogFrames > context->audioFrames) {
		rt_printf("Error: this example needs analog enabled, with 4 or 8 channels\n");
		return false;
	}

	// Check that we have the same number of inputs and outputs.
	if(context->audioInChannels != context->audioOutChannels ||
			context->analogInChannels != context-> analogOutChannels){
		printf("Error: for this project, you need the same number of input and output channels.\n");
		return false;
	}
	
	gInverseSampleRate = 1.0 / context->audioSampleRate;
	gPhase = 0.0;

	return true;
}

void render(BelaContext *context, void *userData)
{

	for(unsigned int n = 0; n < context->audioFrames; n++) {
	    
	    // read analogIn channels 0 and 1
	    float in1 = analogRead(context, n, 0);
	    float in2 = analogRead(context, n, 1);
	    
	    // map in1 to amplitude and in2 to frequency
	    float amplitude = in1 * 0.8f;
	    float frequency = map(in2, 0, 1, 100, 1000);
	    
	    // generate a sine wave with the amplitude and frequency 
	    float out = amplitude * sinf(gPhase);
	    gPhase += 2.0 * M_PI * frequency * gInverseSampleRate;
		if(gPhase > 2.0 * M_PI)
			gPhase -= 2.0 * M_PI;
	    
	    // log the sine wave and sensor values on the scope
	    scope.log(out, in1, in2);
	    
	    // pass the sine wave to the audio outputs
	    for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
	        audioWrite(context, n, channel, out);
	    }
			

	}
}

void cleanup(BelaContext *context, void *userData)
{

}


/**
\example scope-analog/render.cpp

Scoping sensor input
-------------------------

This example reads from analogue inputs 0 and 1 via `analogRead()` and 
generates a sine wave with amplitude and frequency determined by their values. 
It's best to connect a 10K potentiometer to each of these analog inputs. Far 
left and far right pins of the pot go to 3.3V and GND, the middle should be 
connected to the analog in pins.

The sine wave is then plotted on the oscilloscope. Click the Open Scope button to 
view the results. As you turn the potentiometers you will see the amplitude and 
frequency of the sine wave change. You can also see the two sensor readings plotted
on the oscilloscope.

The scope is initialised in `setup()` where the number of channels and sampling rate
are set.

`````
scope.setup(3, context->audioSampleRate);
`````

We can then pass signals to the scope in `render()` using:

``````
scope.log(out, in1, in2);
``````

This project also shows as example of `map()` which allows you to re-scale a number 
from one range to another. Note that `map()` does not constrain your variable 
within the upper and lower limits. If you want to do this use the `constrain()`
function.
*/
