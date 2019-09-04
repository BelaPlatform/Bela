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

int gOutputPin = 0; // digital pin 0 - check the pin diagram in the IDE
float gInterval = 0.5; // how often to toggle the LED (in seconds)
int gCount = 0; //counts elapsed samples
bool gStatus = false;

bool setup(BelaContext *context, void *userData)
{
    pinMode(context, 0, gOutputPin, OUTPUT); // Set gOutputPin as output
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->digitalFrames; ++n){
		if(gCount == (int)(context->digitalSampleRate * gInterval)){ //if enough samples have elapsed
			gCount = 0; //reset the counter
			//toggle the status
			if(gStatus == 0)
				gStatus = 1;
			else
				gStatus = 0;
			digitalWrite(context, n, gOutputPin, gStatus); //write the status to the LED (gOutputPin)
		}
		gCount++;
	}
}

void cleanup(BelaContext *context, void *userData)
{
	// Nothing to do here
}


/**
\example digital-output/render.cpp

Blinking an LED
---------------

This sketch shows the simplest case of digital out. 

- Connect an LED in series with a 470ohm resistor between digital pin `gOutputPin` and ground. 

The led is blinked on and off by setting the digital pin `1` and `0` every `gInterval seconds.

In `setup()` the pin mode must be set to output mode via `pinMode()`. For example: 
`pinMode(context, 0, gOutputPin, OUTPUT)`.
In `render()` the output of the digital pins is set by `digitalWrite()`. For example: 
`digitalWrite(context, n, gOutputPin, status)` where `status` can be equal to 
either `1` or `0`. When set `1` the pin will give 3.3V, when set to 
`0` 0V.

To keep track of elapsed time we have a sample counter count. When the count reaches 
a certain limit it switches state to either `1` or `0` depending on its current 
value. In this case the limit is `context->digitalSampleRate * gInterval` which 
is the desired interval expressed in samples.
*/

