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
#include <Scope.h>
#include <cmath>

float gPhase;
float gPhase2;
float gPhase3;
float gInverseSampleRate;

// instantiate the scope
Scope scope;

bool setup(BelaContext *context, void *userData)
{
    // tell the scope to create three sliders
    // they will be visible in the third column of the scope's control panel
    scope.setup(3, context->audioSampleRate, 3);
    
    // set the minimum, maximum, step increment, initial value and name of the three sliders
    // note: this function must only be called in setup(), never in render()
    scope.setSlider(0, 10.0f, 22050.0f, 1.0f, 100.0f, "Freq (channel 1)");
    scope.setSlider(1, 10.0f, 22050.0f, 1.0f, 1000.0f, "Freq (channel 2)");
    scope.setSlider(2, 10.0f, 22050.0f, 1.0f, 10000.0f, "Freq (channel 3)");

    gPhase = 0;
    gPhase2 = 0;
    gPhase3 = 0;
    gInverseSampleRate = 1.0f/context->audioSampleRate;
    
	return true;
}

void render(BelaContext *context, void *userData)
{

    for (unsigned int n=0; n<context->audioFrames; n++){
        
        // create three oscillators
        float out = 0.8f * sinf(gPhase);
        float out2 = 0.8f * sinf(gPhase2);
		float out3 = 0.8f * sinf(gPhase3);
		
		// set the frequencies of the oscillators to the values read from the sliders
		gPhase += 2.0 * M_PI * scope.getSliderValue(0) * gInverseSampleRate;
		gPhase2 += 2.0 * M_PI * scope.getSliderValue(1) * gInverseSampleRate;
		gPhase3 += 2.0 * M_PI * scope.getSliderValue(2) * gInverseSampleRate;
		
		if(gPhase > 2.0 * M_PI)
			gPhase -= 2.0 * M_PI;
		if(gPhase2 > 2.0 * M_PI)
			gPhase2 -= 2.0 * M_PI;
		if(gPhase3 > 2.0 * M_PI)
			gPhase3 -= 2.0 * M_PI;
			
		// log the three oscillators to the scope
        scope.log(out, out2, out3);
    }
}

void cleanup(BelaContext *context, void *userData)
{

}


/**
\example scope-sliders/render.cpp

Live-Controllable Sliders
-----------------------

This example demonstrates the scope's integrated sliders.

By passing a third parameter to scope.setup() three sliders are created, which
can be seen and modified from the scope's control panel (click the 'controls' 
button in the scope window). 

The initial values and parameters of these sliders are set in setup() using 
scope.setSlider(). The live values of the sliders are then read in render()
using scope.getSliderValue(), and mapped to the frequencies of three oscillators.
The slider values are updated at most once per audio block.

This example is best viewed using the scope's FFT mode.

*/
