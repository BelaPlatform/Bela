 /**
 * \example Gui/mouse-tracker
 *
 * GUI mouse tracker
 * =================
 *
 * New GUI fuctionality for Bela!
 *
 * Is this project you can find a sketch.js file which is a p5.js file that is rendered
 * in a browser tab. Click the GUI button (next to the Scope button) in the IDE to see the rendering of this file.
 * 
 * This example receives a buffer of data from the GUI with the X-Y coordinates of the mouse (normalised to the size of the window). The Y axis controls the pitch of an oscillator while the X axis controls L/R panning.
 * In order to receive a buffer from the GUI, the type of the buffer and maximum number of values that it will hold need to be specified in setup:
 * 	`myGUi.setBuffer('f', 2);`
 *
 * In this case we are expecting to receive a buffer of floats with a maximum of 2 elements. 
 * This function will return the index of the buffer (which is given automatically based on the order they are set on).
 * This buffer will have index = 0.
 * The buffer can then be accessed using this index:
 * 	`DataBuffer buffer = myGui.getDataBuffer(0);`
 *
 * And its contents retrieved in the desired format (floats in this case): 
 * 	`float* data = buffer.getAsFloat();`
 * 
 * Additionally, two One-pole low pass filters are used to smooth the values read from the GUI and avoid glitches.
 * 
 * If you want to edit sketch.js you can do so in the browser but must write your p5.js code in instance mode.
 * 
 **/

#include <Bela.h>
#include <libraries/Gui/Gui.h>
#include <libraries/OnePole/OnePole.h>
#include <cmath>

// GUI object declaration
Gui myGui;
// One Pole filter object declaration
OnePole freqFilt, ampFilt;

// Default frequency and panning values for the sinewave
float gFrequency = 440.0;
float gAmpL = 1.0;
float gAmpR = 1.0;

float gPhase;
float gInverseSampleRate;

bool setup(BelaContext *context, void *userData)			
{
	gInverseSampleRate = 1.0 / context->audioSampleRate;
	gPhase = 0.0;
	
	// Setup GUI. By default, the Bela GUI runs on port 5555 and address 'gui'
	myGui.setup(context->projectName);

	// Setup buffer of floats (holding a maximum of 2 values)
	myGui.setBuffer('f', 2); // Index = 0
	
	// Setup low pass filters for smoothing frequency and amplitude
	freqFilt.setup(1, context->audioSampleRate); // Cut-off frequency = 1Hz
	ampFilt.setup(1, context->audioSampleRate); // Cut-off frequency = 1Hz
	
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
	
		// Get buffer 0		
		DataBuffer buffer = myGui.getDataBuffer(0);
		// Retrieve contents of the buffer as floats
		float* data = buffer.getAsFloat();

		// Map Y-axis (2nd element in the buffer) to a frequency range	
		gFrequency = map(data[1], 0, 1, 600, 320);
		// Constrain frequency
		gFrequency = constrain(gFrequency, 320, 600);
		// Smooth frequency using low-pass filter
		gFrequency = freqFilt.process(gFrequency);
	
		// Constrain amplitude (given by the X-axis, 1st element in the buffer) 
		// between 0 and 1.
		// Smooth value using low-pass filter
		float amplitude = ampFilt.process(constrain(data[0], 0, 1));
		// Calculate amplitude of left and right channels
		gAmpL = 1 - amplitude; 
		gAmpR = amplitude;
		
		float out = 0.4f * sinf(gPhase);
		// Write sinewave to left and right channels
		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			if(channel == 0) {
				audioWrite(context, n, channel, gAmpL*out);
			} else if (channel == 1) {
				audioWrite(context, n, channel, gAmpR*out);	
			}
		}

		// Update and wrap phase of sine tone
		gPhase += 2.0f * (float)M_PI * gFrequency * gInverseSampleRate;
		if(gPhase > M_PI)
			gPhase -= 2.0f * (float)M_PI;

	}
	
}

void cleanup(BelaContext *context, void *userData)
{

}
