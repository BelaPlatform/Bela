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

float gInterval = 0.5;
float gSecondsElapsed = 0;
int gCount = 0;

bool setup(BelaContext *context, void *userData)
{
    
    // Print a string
	rt_printf("This Bela example has just started running!\n");
	// Print a string containing a float
    rt_printf("Here's the value of pi: %f\n",M_PI);
    
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		
		// Increment a counter on every frame
		gCount++;
		
		// Print a message every second indicating the number of seconds elapsed
		if(gCount % (int)(context->audioSampleRate*gInterval) == 0) {
		    gSecondsElapsed += gInterval;
		    rt_printf("Time elapsed: %f\n",gSecondsElapsed);
		}
		
	}
}

void cleanup(BelaContext *context, void *userData)
{

}


/**
\example print/render.cpp

Printing to the console
-----------------------

This example demonstrates how to print to the console. When working within the audio thread
use the function rt_printf(). This has the same functionality as printf() but is safe to call
from the audio thread. However, make sure to not make too many calls to this function within a
render loop as this may overload the CPU and/or stall communication with the board.
In the render() function above a counter is implemented in order to only print to the console
after a specified interval has passed. A counter variable is used to keep track of the amount
of samples elapsed after starting the program.
The usage of rt_printf() is identical to printf(): http://en.cppreference.com/w/cpp/io/c/fprintf

*/
