/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Multichannel/multitap-delay/render.cpp

Multichannel Multitap Delay
===========================

This example takes the input from one channel (channel 0 by default) and generates a multitap-delay version
on which the main tap is output on the same number channel as the selected input while the remaining taps
are randomly assigned on setup to each of the remaining output channels.

GUI sliders are provided to control Wet/Dry mix, Feedback and Delay Time for each tap.

Delay values from the GUI sliders are filtered using 1-pole LP filters to ensure smooth changes.
The delay line uses linear interpolation for the read pointers by default so some artifacts are still expected.
**/
#include <Bela.h>
#include <libraries/Gui/Gui.h>
#include <libraries/GuiController/GuiController.h>
#include <libraries/OnePole/OnePole.h>
#include <libraries/DelayLine/DelayLine.h>
#include <vector>
#include <algorithm>
#include <random>
#include <chrono>
#include <string>

// Gui object
Gui gGui;
// Gui controller object
GuiController gGuiController;

// Delay line object
DelayLine delay;
// Delay line parameters
float gMaxDelay = 3001; // Maximum delay time (ms)
float gDelayTime = 100; // Delay Time (ms)
unsigned int gNTaps = 1; // Number of taps
float gWetDryMix = 1; // Wet/Dry Mix
float gFeedback = 0; // Feedback

std::vector<OnePole *> gDelayFilters;

unsigned int gInputChannel = 0; // Designated input channel

std::vector<int> gTapChannels; // Channels corresponding to each tap
std::vector<int> gChannelTaps; // Taps corresponding to each channel
std::vector<float> gTapProportion; // Proportional delay of each tap with respect to main delay

bool gShuffleTaps = true; // If true shuffle tap channels

bool setup(BelaContext *context, void *userData)
{
	// Set as many taps for the delay as ouput audio channels available
	gNTaps = context->audioOutChannels;
	int ret;
	// Setup delay
	// Arguments: max. delay time, sample rate, number of taps
	if((ret = delay.setup(gMaxDelay+1, context->audioSampleRate, gNTaps)))
	{
		printf("Error setting up delay. Error code: %d/n", ret);
		return false;
	}
	// Separate taps from main delay mix
	delay.useSeparateTaps(true);
	// Set initial values for mix, delay time and feedback
	delay.setWetDryMix(gWetDryMix);
	delay.setDelayTime(gDelayTime);
	delay.setFeedbackGain(gFeedback);

	// Assign input channel to first tap
	// (so that the output channel corresponds to the same index)
	gTapChannels.push_back(gInputChannel);
	// Assign channel to tap
	for(unsigned int t=1; t<gNTaps; t++)
	{
		unsigned int channel = gInputChannel + t;
		if(channel >= gNTaps)
			channel = 0;
		gTapChannels.push_back(channel);
	}

	// If shuffle is active
	if(gShuffleTaps)
	{
		// Generate a new time-based seed
		 unsigned seed = std::chrono::system_clock::now()
                        .time_since_epoch()
                        .count();
		// Randomly huffe all taps but the first one (main delay output)
		std::shuffle(gTapChannels.begin()+1, gTapChannels.end(), std::default_random_engine(seed));
	}

	// Create vector holding taps corresponding to each channel
	gChannelTaps = gTapChannels;
	for(unsigned int t=1; t<gNTaps; t++)
	{
		int channel = gTapChannels[t];
		gChannelTaps[channel] = t;
	}


	printf("Delay tap assignment:\n");
	for(unsigned int tc=0; tc<gTapChannels.size(); tc++)
	{
		printf("\tTap: %d, Channel: %d\n", tc, gTapChannels[tc]);
	}

	// Setup Gui
	gGui.setup(context->projectName);
	// Setup Controller and attach to Gui
	gGuiController.setup(&gGui, "Delay Controller");
	// Setup controls:
	gGuiController.addSlider("Mix", gWetDryMix, 0, 1, 0.001); // Mix slider
	gGuiController.addSlider("Delay Time (ms)", gDelayTime, 10, gMaxDelay, 1); // Delay slider
	gGuiController.addSlider("Feedback", gFeedback, 0, 0.99, 0.001); // Feedback slider

	// Prepare taps:
	for(unsigned int t=1; t<gNTaps; t++)
	{
		// Add tap slider
		std::string sliderName = std::string("Tap ") + std::to_string(t) + std::string(" Delay Time (%)");
		// Compute tap as a proportion of main delay time
		int tapDelayProportion = 100 - 100 * t / gNTaps;
		gTapProportion.push_back(tapDelayProportion);
		// Setup tap slider
		gGuiController.addSlider(sliderName.c_str(), tapDelayProportion, 0, 100, 1);
		// Set tap delay time
		delay.setDelayTime(tapDelayProportion*gDelayTime, t);
	}


	// Setup filter for processing values from delay and % sliders
	for(unsigned int t=0; t<gNTaps; t++)
	{
		gDelayFilters.push_back(new OnePole());
		gDelayFilters.back()->setup(10, context->audioSampleRate); // Cut-off frequency = 10Hz

	}
	return true;
}

void render(BelaContext *context, void *userData)
{
	// Get value from mix slider
	float mix = gGuiController.getSliderValue(0);
	// Update value if the slider has been changed
	if(mix != gWetDryMix)
	{
		delay.setWetDryMix(mix);
		gWetDryMix = mix;
	}

	// Get value from delay time slider
	gDelayTime = gGuiController.getSliderValue(1);

	// Get value from feedback slider
	float feedback = gGuiController.getSliderValue(2);
	// Update value if the slider has been changed
	if(feedback != gFeedback)
	{
		delay.setFeedbackGain(gFeedback);
		gFeedback = feedback;
	}
	// Get value from each tap delay slider
	for(unsigned int t=1; t<gNTaps; t++)
	{
		float tapDelayProportion = gGuiController.getSliderValue(2+t);
		// Process slider value with one pole filter for smoother transitions
		tapDelayProportion = gDelayFilters[t]->process(tapDelayProportion);

		// Update value if the slider has been changed
		if(tapDelayProportion != gTapProportion[t-1])
		{
			// Set tap delay time
			delay.setDelayTime(0.01*tapDelayProportion*gDelayTime, t);
			// Update
			gTapProportion[t-1] = tapDelayProportion;
		}
	}

	for(unsigned int n = 0; n < context->audioFrames; n++)
	{
		// Read input channel
		float input = audioRead(context, n, gInputChannel);
		// Process delay slider value with one pole filter for smoother transitions
		gDelayTime = gDelayFilters[0]->process(gDelayTime);
		// Update delay value
		delay.setDelayTime(gDelayTime);
		// Update taps too!
		for(unsigned int t=1; t<gNTaps; t++)
			delay.setDelayTime(0.01*gTapProportion[t-1]*gDelayTime, t); // Set tap delay time
		// Compute delayed output
		float delayOutput = delay.process(input);
		for(unsigned int ch = 0; ch < context->audioOutChannels; ch++)
		{
			float output = 0.0;
			if(ch == gInputChannel)	// If input channel
				// Write main delay ouptut
				output = delayOutput;
			else // If not
				// Get output for corresponding tap
				// output = 0.0;
				output = delay.getTapOutput(gChannelTaps[ch]);
			// Write channel output
			audioWrite(context, n, ch, output);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{
	delay.cleanup();
}
