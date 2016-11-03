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

int gInputPin = 1; // digital pin 1 - check the pin diagram in the IDE
int gOutputPin = 0; // digital pin 0 - check the pin diagram in the IDE

bool setup(BelaContext *context, void *userData)
{
	// Set the mode of digital pins
	pinMode(context, 0, gInputPin, INPUT); //set input
	pinMode(context, 0, gOutputPin, OUTPUT); // setoutput
	return true;
}


void render(BelaContext *context, void *userData)
{
	for(unsigned int n=0; n<context->digitalFrames; n++){
		int status=digitalRead(context, 0, gInputPin); //read the value of the button
		digitalWriteOnce(context, n, gOutputPin, status); //write the status to the LED
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

- connect an LED in series with a 470ohm resistor between gOutputPin (digital pin 0) and ground.
- connect a 1k resistor to +3.3V.
- connect the other end of the resistor to both a button and gInputPin (digital pin 1)
- connect the other end of the button to ground.

Before using the digital pins we need to set whether they are input or output.
This is done via `pinMode(context, 0, gInputPin, INPUT);`.

You will notice that the LED will normally stay off and will turn on as long as 
the button is pressed. This is due to the fact that the LED is set to the same 
value read at gInputPin. When the button is not pressed, gInputPin is `LOW` and so 
gOutputPin is set to `LOW` as well, so that the LED conducts and emits light. When 
the button is pressed, gInputPin goes `HIGH` and gOutputPin is set to `HIGH`, turning off the LED.

As an exercise try and change the code so that the LED only turns off when 
the button is pressed.
*/

