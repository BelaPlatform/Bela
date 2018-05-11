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
#include <stdlib.h>


bool setup(BelaContext *context, void *userData)
{
	// Set the mode of digital pins
	pinMode(context, 0, 1, INPUT); // set digital pin 1 as input
	pinMode(context, 0, 0, OUTPUT); // set digital pin 0 as output
	return true;
}


void render(BelaContext *context, void *userData)
{
	for(unsigned int n=0; n<context->digitalFrames; n++){
		int status=digitalRead(context, 0, 1); //read the value of the button (digital pin 1)
		digitalWriteOnce(context, n, 0, status); //write the status to the LED (digital pin 0)
		float out = 0.1f * status * rand() / (float)RAND_MAX * 2.f - 1.f; //generate some noise, gated by the button
		for(unsigned int j = 0; j < context->audioOutChannels; j++){
			audioWrite(context, n, j, out); //write the audio output
		}
	}
}


void cleanup(BelaContext *context, void *userData)
{
	// Nothing to do here
}


/**
\example digital-input/render.cpp

Switching an LED on and off
---------------------------

This example brings together digital input and digital output. The program will read 
a button and turn the LED on and off according to the state of the button.

- connect an LED in series with a 470ohm resistor between digital pin 0 and ground.
- connect a 1k resistor to +3.3V.
- connect the other end of the resistor to both a button and digital pin 1
- connect the other end of the button to ground.

Before using the digital pins we need to set whether they are input or output.
This is done via `pinMode(context, 0, 1, INPUT);`.

You will notice that the LED will normally stay off and will turn on as long as 
the button is pressed. This is due to the fact that the LED is set to the same 
value read at digital pin 1 (input). When the button is not pressed, digital pin 1 is `LOW` and so 
digital pin 0 is set to `LOW` as well, so that the LED conducts and emits light. When 
the button is pressed, Digital pin 1 goes `HIGH` and digital pin 0 is set to `HIGH`, turning off the LED.

Note that there are two ways of specifying the digital pin: using the GPIO label (e.g. `P8_07`), 
or using the digital IO index (e.g. 0). However, the GPIO label may change from one cape to another (the provided example is the label for the Bela cape).

As an exercise try and change the code so that the LED only turns off when 
the button is pressed.
*/

