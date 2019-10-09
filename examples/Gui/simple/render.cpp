 /**
 * \example Gui/simple
 *
 * GUI simple
 * =========
 *
 * New GUI fuctionality for Bela!
 *
 * Is this project you can find a sketch.js file which is a p5.js file that is rendered
 * in a browser tab. Click the GUI button (next to the Scope button) in the IDE to see the rendering of this file.
 * 
 * This example sends a buffer of data from the Bela render to the browser via a web socket every few milliseconds 
 * containing the value of a sinewave LFO:
 * 	`gui.sendBuffer(0, sineValue);`
 * 
 * The p5.js file displays the position of the sinewave in two different ways.
 * 
 * If you want to edit sketch.js you can do so in the browser but must write your p5.js code in instance mode.
 * 
 **/
#include <Bela.h>
#include <cmath>
#include <libraries/Gui/Gui.h>

Gui gui;

// variable for the Low Frequency Oscillator
float gFrequency = 0.1;
float gPhase;
float gInverseSampleRate;

// Array for sending to the GUI
float sineValue[] = {0.0};

// Time period (in seconds) after which data will be sent to the GUI
float gTimePeriod = 0.04;

bool setup(BelaContext *context, void *userData)			
{
	gInverseSampleRate = 1.0 / context->audioSampleRate;
	gPhase = 0.0;
	
	gui.setup(context->projectName);
	return true;
}

void render(BelaContext *context, void *userData)
{	
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		
		float out = sinf(gPhase);

		gPhase += 2.0f * (float)M_PI * gFrequency * gInverseSampleRate;
		if(gPhase > M_PI)
			gPhase -= 2.0f * (float)M_PI;
		
		static unsigned int count = 0;
		// After time period is elapsed send to GUI
		if (count >= gTimePeriod*context->audioSampleRate)
		{
			count = 0;
			// Update Array
			sineValue[0] = out;
			// Send to GUI
			gui.sendBuffer(0, sineValue);
		}
		count++;
	}
}


void cleanup(BelaContext *context, void *userData)
{

}
