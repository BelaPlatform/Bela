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

Only two adjacent channels are active at each time. Resets in the sawtooth LFO are detected to increment channel count and the
absolute value of the LFO is employed to compute panning within the active adjacent channels to achieve constant power
panning via a sine function.

A GUI slider is provide to adjust the oscillator frequency and another one to change the direction of rotation.
The scope displays panning gains for each channel and the LFO.
*/
#include <Bela.h>
#include <cmath>
#include <libraries/Oscillator/Oscillator.h>
#include <libraries/Gui/Gui.h>
#include <libraries/GuiController/GuiController.h>
#include <libraries/Scope/Scope.h>

Gui gui;
GuiController controller;
Scope scope;

#define NUM_OSC 2 // Number of audio-rate oscillators
// Oscillator object declaration
Oscillator osc[NUM_OSC]; // Audio-rate oscillators
Oscillator lfo; // LFO

float gOscFreq = 320; // Oscillator frequency
float gOscDetune = 3.0; // Oscillator detuning
float gLfoFreqRange[2] = { 0.1, 100 }; // LFO frequency range

unsigned int gCurrentChannel = 0; // Current active channel
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
	scope.setup(context->audioOutChannels + 1, context->audioSampleRate);
	// Set up the GUI
	gui.setup(context->projectName);
	// and attach controller to it
	controller.setup(&gui, "Controls");

	// Add slider to control LFO frequency
	controller.addSlider("LFO Frequency", 10, gLfoFreqRange[0], gLfoFreqRange[1], 0.01);
	controller.addSlider("Panning Direction", 1, 0, 1, 1);

	// Setup LFO
	lfo.setup(context->audioSampleRate, Oscillator::sawtooth); // a phasor

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

		// Modulate panning with LFO
		float panning = lfo.process(lfoFreq) * 0.5f + 0.5f; // between 0 and 1

		// Increment current channel when the sawtooth resets
		if( (panning < 0.5) && (gPrevPanning > 0.5))
		{
			gCurrentChannel = getNextChannel(gCurrentChannel, context->audioOutChannels, counterwisePanning);
		}
		gPrevPanning = panning;
		// Get index for next channel
		unsigned int nextChannel = getNextChannel(gCurrentChannel, context->audioOutChannels, counterwisePanning);

		// Compute panning for audio audio channels
		float logs[context->audioOutChannels + 1];
		for(unsigned int ch = 0; ch < context->audioOutChannels; ch++)
		{
			float chPanning = 0.0;
			// constant power panning.
			// Remove sinf to obtain constant amplitude (linear) panning (and save CPU)
			if(ch == gCurrentChannel)
			{
				chPanning = sinf(1.f - panning);
			} else if(ch == nextChannel)
			{
				chPanning = sinf(panning);
			}
			else
				chPanning = 0.0;

			// Write output scaled by panning value
			audioWrite(context, n, ch, out * chPanning);
			// log to the scope the gain of each channel with a vertical scale and offset
			logs[ch] = chPanning / float(context->audioOutChannels) + ch / float(context->audioOutChannels);
		}
		// the last channel logged to the scope if the LFO (offsetted)
		logs[context->audioOutChannels] = panning - 1;
		scope.log(logs);
	}
}

void cleanup(BelaContext *context, void *userData)
{}
