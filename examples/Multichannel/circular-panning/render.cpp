/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Multichannel/circular-panning/render.cpp

Circular Panner
===============

This example demonstrates the use of a low frequency oscillator to modulate panning within an arbitray number of
audio channels.

A pair of detuned oscillators are used as a single audio source that is 'rotated' around the available audio output channels
based on the frequency of the LFO.

Only two adjacent channels are active at each time. Zero-crossings in the LFO are counted to increment channel count and the absolute value of the LFO is employed to compute
panning within the active adjacent channels.

A GUI slider is provide to adjust the oscillator frequency and another one to change the direction of rotation.
**/
#include <Bela.h>
#include <cmath>
#include <libraries/Oscillator/Oscillator.h>
#include <libraries/Gui/Gui.h>
#include <libraries/GuiController/GuiController.h>

Gui gui;
GuiController controller;

#define NUM_OSC 2 // Number of audio-rate oscillators
// Oscillator object declaration
Oscillator osc[NUM_OSC]; // Audio-rate oscillators
Oscillator lfo; // LFO

float gOscFreq = 320; // Oscillator frequency
float gOscDetune = 3.0; // Oscillator detuning
float gLfoFreqRange[2] = { 0.1, 10 }; // LFO frequency range

int gCurrentChannel = 0; // Current active channel
float gPrevPanning = 0.0; // Previous panning value

/*
 * Function for incrementing channel number and wrapping in both directions, ascending order of id (clockwise) or descending order (counterwise).
 *
 * @param channel Channel Id
 * @param numChannels Number of channels used for rotation
 * @param counterwise Boolean specifying counterwise direction of panning. If False rotation will be assumed to occur counterwise (decrementing channel id) instead of clockwise.
 *
 * @return next channel in rotation
 */
int getNextChannel(int channel, int numChannels, bool counterwise = false)
{
	int nextChannel = channel;
	if(counterwise) // If rotation counterwise
	{
		// Decrement
		nextChannel--;
		// Wrap
		if(nextChannel < 0)
			nextChannel = numChannels-1;
	}
	else // If rotation clockwise
	{
		// Increment
		nextChannel++;
		// Wrap
		if(nextChannel >= numChannels)
			nextChannel = 0;
	}
	return nextChannel;
}

bool setup(BelaContext *context, void *userData)
{
	// Set up the GUI
	gui.setup(context->projectName);
	// and attach controller to it
	controller.setup(&gui, "Controls");

	// Add slider to control LFO frequency
	controller.addSlider("LFO Frequency", 2, gLfoFreqRange[0], gLfoFreqRange[1], 0.01);
	controller.addSlider("Panning Direction", 1, 0, 1, 1);

	// Setup LFO
	lfo.setup(context->audioSampleRate, Oscillator::sine);

	// Setup oscillators
	for(unsigned int i = 0; i < NUM_OSC; i++)
		osc[i].setup(context->audioSampleRate, Oscillator::sine);

	return true;
}


void render(BelaContext *context, void *userData)
{
	// Get LFO frequency from slider
	float lfoFreq = controller.getSliderValue(0);
	// Set panning direction based on slider value
	// 0 -> counterclockwise, 1 -> clockwise
	bool counterwisePanning = (controller.getSliderValue(1) < 0.5);

	for(unsigned int n = 0; n < context->audioFrames; n++) {

		// Generate output by summing and scaling detuned oscillators
		float out = 0.0;
		for(unsigned int i = 0; i<NUM_OSC; i++)
			out += (0.05 / NUM_OSC) * osc[i].process(gOscFreq+i*gOscDetune);

		// Get index for next channel
		unsigned int nextChannel = getNextChannel(gCurrentChannel, context->audioOutChannels, counterwisePanning);

		// Modulate panning with LFO
		// Note that the frequency of the lfo has been divided by 2 since we take the absolute value
		// effectively doubling the frequency of the modulation
		float panning = lfo.process(0.5 * lfoFreq);

		// Increment current channel when there is a zero crossing
		// zero crossing estimaed by comparing changes of sign of current and previous value
		if( (panning < 0) != (gPrevPanning < 0) )
		{
			gCurrentChannel = getNextChannel(gCurrentChannel, context->audioOutChannels, counterwisePanning);
		}
		gPrevPanning = panning;
		// Rectify panning value to modulate panning from 0 to 1
		panning = fabsf(panning);

		// Compute panning for audio audio channels
		for(unsigned int ch = 0; ch < context->audioOutChannels; ch++)
		{
			float chPanning = 0.0;
			if(ch == gCurrentChannel)		// If channel is the current channel...
				chPanning = panning;		// Set panning value
			else if(ch == nextChannel)		// If channel is the next channel...
				chPanning = 1 - panning;	// Compute and set panning value
			else							// Otherwise...
				chPanning = 0.0;			// Set to 0

			// Write output multiplied by panning value
			audioWrite(context, n, ch, out * chPanning);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{}
