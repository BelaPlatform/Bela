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
#include <PulseIn.h>
#include <stdlib.h>
#include <rtdk.h>
#include <cmath>

PulseIn pulseIn;
int gPulseInPin = 0;
int gDigitalOutPin = 1;
int gPulseLength = 1234;
int gSamplesBetweenPulses = 10000;

bool setup(BelaContext *context, void *userData)
{
	pinMode(context, 0, gDigitalOutPin, OUTPUT);
	pulseIn.init(context, gPulseInPin, 1); //third parameter is direction
	return true;
}

void render(BelaContext *context, void *userData)
{
	static bool pulseOut = 0;
	static int count = 0;
	for(unsigned int n = 0; n < context->digitalFrames; n++){
		// detect if a pulse just ended
		int duration = pulseIn.hasPulsed(context, n);
		if(duration > 0){
			rt_printf("duration = %d\n", duration);
		}

		// generate a rectangular waveform as a test signal.
		// Connect gDigitalOutPin to gPulseInPin
		// to verify that the detected pulse length is gPulseLength
		if(count == gPulseLength ){
			pulseOut = false;
		}
		if(count == (gPulseLength + gSamplesBetweenPulses)){
			pulseOut = true;
			count = 0;
		}
		digitalWrite(context, n, gDigitalOutPin, pulseOut);
		count++;
	}
}

void cleanup(BelaContext *context, void *userData)
{

}
