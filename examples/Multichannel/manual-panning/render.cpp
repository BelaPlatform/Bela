/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
https://bela.io
*/
/**
\example Multichannel/manual-panning/render.cpp

Simple Manual Panner
====================

This example generates three different audio sources and provides a GUI slider for each of these to pan over an arbitrary number of channels.

The number of channels is set to be equal to the number of audio output channels.

A simple panning strategy is followed so that the slider value is mapped to the number of channels and for each channel the distance to the slider
value is computed as the difference. If such difference is between -1 and 1 then a panning value is applied to the channel. Otherwise the channel is
muted completely.
**/
#include <Bela.h>
#include <cmath>
#include <libraries/Oscillator/Oscillator.h>
#include <libraries/Gui/Gui.h>
#include <libraries/GuiController/GuiController.h>
#include <libraries/OnePole/OnePole.h>
#include <vector>

Gui gui;
GuiController controller;

#define NUM_SOURCES 3 // Number of sources
// Oscillator objects declaration
#define NUM_OSC 2 // number of oscillators per source

std::vector<Oscillator*> sources;

OnePole panFilt[NUM_SOURCES]; // Filter for processing panning sliders

float gOscFreqRange[2] = { 320.0, 640.0 }; // Range of requency for oscillaotrs
float gOscFreq[NUM_SOURCES]; // Array holding frequency for each source
float gOscDetune = 3.0; // Detuning value in Hz

float gPanning[NUM_SOURCES] = {-1.0, -1.0}; // Panning value for each audio source

bool setup(BelaContext *context, void *userData)
{
	// Set up the GUI
	gui.setup(context->projectName);
	// and attach controller to it
	controller.setup(&gui, "Controls");

	for(unsigned int s = 0; s < NUM_SOURCES; s++)
	{
		// Get slider name based on source index
		std::string sliderName = std::string("Panning [Source ") + std::to_string(s) + std::string("]");

		// Compute initial value based on number of sources
		float initialValue = s / (NUM_SOURCES-1.0);
		// Add panning sliders
		controller.addSlider(sliderName, initialValue, 0, 1, 0.001);

		// Set up filters for processing slider values
		panFilt[s].setup(20, context->audioSampleRate); // Cut-off frequency = 2Hz

		// Compute source frequency
		gOscFreq[s] = map(s, 0, NUM_SOURCES-1, gOscFreqRange[0], gOscFreqRange[1]);
		printf("Oscillator %d frequency %.3f (Hz)\n", s, gOscFreq[s]);
	}

	// Prepare oscillators
	for(unsigned int i = 0; i < NUM_OSC+NUM_SOURCES; i++)
	{
		sources.push_back(new Oscillator);
		sources[i]->setup(context->audioSampleRate, Oscillator::sine);
	}

	return true;
}


void render(BelaContext *context, void *userData)
{
	// Read value from sliders
	float panning[NUM_SOURCES];
	for(unsigned int s = 0; s < NUM_SOURCES; s++)
	{
		panning[s] = controller.getSliderValue(s);
	}

	for(unsigned int n = 0; n < context->audioFrames; n++) {

		// Filter with a one-pole to smooth between readings
		for(unsigned int s = 0; s < NUM_SOURCES;  s ++)
			panning[s] = panFilt[s].process(panning[s]);

		// Output for each source
		float out[NUM_SOURCES];
		// Generate output for each difference source by summing detuned oscillators
		for(unsigned int s = 0; s < NUM_SOURCES;  s ++)
		{
			out[s] = 0.0;
			// For each oscilator in source
			for(unsigned int i = 0; i < NUM_OSC; i++)
				out[s] += (0.05 / NUM_OSC) * sources[s + NUM_OSC]->process(gOscFreq[s] + i * gOscDetune);
		}

		//Map panning to number of channels
		float multichannelPanning[NUM_SOURCES];
		for(unsigned int s = 0; s < NUM_SOURCES; s++)
		{
			multichannelPanning[s] = map(panning[s], 0, 1, 0, context->audioOutChannels-1);
			// Constrain to range (this should not be necessary but added for precaution)
			multichannelPanning[s] = constrain(multichannelPanning[s], 0, context->audioOutChannels-1);
		}

		// Simple multichannel panning strategy:
		// For each channel...
		for(unsigned int ch=0; ch<context->audioOutChannels; ch++)
		{
			float chOut = 0.0;
			// ... and for each source
			for(unsigned int s = 0; s < NUM_SOURCES; s++)
			{
				// Compute distance from current channel index to  multichannel panning value
				float chPanning = multichannelPanning[s] - ch;
				// If difference between (-1, 1) then compute channel panning, else panning is 0
				// Panning direction depends on the sign of the difference
				if(chPanning <= 1 && chPanning >= 0)
				{
					chPanning = 1.0 - chPanning;
				}
				else if (chPanning >= -1 && chPanning < 0)
				{
					chPanning = 1.0 + chPanning;
				}
				else
				{
					chPanning = 0.0;
				}
				// Compute output for channel
				chOut += out[s] * chPanning;
			}
			// Write output
			audioWrite(context, n, ch, chOut);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{}
