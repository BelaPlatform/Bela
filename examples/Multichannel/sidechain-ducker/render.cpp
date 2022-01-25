/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Multichannel/sidechain-ducker/render.cpp

Multichannel Sidechain Ducker
=============================

This example implements a multichannel ducker based on a feedfoward compressor architecture which makes use
of the Envelope Detector library for peak detection.

The sidechain ducker works similarly to a compressor: a gain-reduction control signal is computed based on
envelope of an incoming signal. However, in this case, the gain reduction is applied to a different channel
instead of the one being used to compute the envelope. This way, the gain of the sidechain channels is reduced
according to the estimated envelope of the input channel.

The detection channel for this example is set to channel 0 by default and the gain of all other channels is
reduced based on the envelope of the audio input for that channel.

A control GUI has been prepared to be able to change the parameters of the ducker/compressor.
Sliders for attack time and release time (in milliseconds) as well as threshold (dB), compression ratio, knee
width (dB) and makeup gain (dB) are provided to make the example fully customisable.

Input channels are assigned to the same number of outptut channel.
If the number of outputs is greater than the number of inputs then the remaining output channels will be silent.
If the number of inputs is greater than the number of outputs then only the first few channels will be used.
**/
#include <Bela.h>
#include <libraries/Scope/Scope.h>
#include <libraries/Gui/Gui.h>
#include <libraries/GuiController/GuiController.h>
#include <libraries/EnvelopeDetector/EnvelopeDetector.h>

//Gui object
Gui gGui;
// Gui Controller
GuiController gGuiController;

// Bela oscilloscope
Scope gScope;

// Envelope detector and parameters
EnvelopeDetector gDetector;
// Envelope detector parameters
float gAttackMs = 100; // attack time (ms)
float gReleaseMs = 50; // release time (ms)

unsigned int gDetectChannel = 0; // Input channel used to trigger the envelope detector

bool setup(BelaContext *context, void *userData)
{
	// Check that we have the same number of inputs and outputs.
	if(context->audioInChannels != context->audioOutChannels) 
	{
		printf("Different number of audio outputs and inputs available. Working with what we have.\n");
	}

	// Detector setup
	gDetector.setup(gAttackMs, gReleaseMs, context->audioSampleRate);
	// Set detection  mode to preprocessed (assumes input is processed externally)
	gDetector.setDetectionMode(EnvelopeDetector::PREPROCESSED);

	gScope.setup(2, context->audioSampleRate);

	// Setup GUI and controller
	gGui.setup(context->projectName);
	gGuiController.setup(&gGui, "Compressor Controller");

	// Add sliders for compressor/ducker control
	gGuiController.addSlider("Attack Time (ms)", 20, 1, 300, 0.001);	// Attack Time
	gGuiController.addSlider("Release Time (ms)", 220, 10, 2000, 0.001);	// Release Time
	gGuiController.addSlider("Threshold (dB)", -20, -50, 0, 0.1);		// Threshold
	gGuiController.addSlider("Ratio", 4, 2, 20, 1);				// Ratio
	gGuiController.addSlider("Knee Width (dB)", 0, 3, 20, 1);		// Knee Width
	gGuiController.addSlider("Makeup Gain (dB)", 0, -15, 15, 1);		// Makeup Gain

	return true;
}

void render(BelaContext *context, void *userData)
{

	// Get slider values from GUI controls
	float attack = gGuiController.getSliderValue(0);
	float release = gGuiController.getSliderValue(1);
	float threshold = gGuiController.getSliderValue(2);
	float ratio = gGuiController.getSliderValue(3);
	float knee = gGuiController.getSliderValue(4);
	float makeupG = gGuiController.getSliderValue(5);

	// Set attack value if slider has changed
	if(attack != gAttackMs)
	{
		gAttackMs = attack;
		gDetector.setAttackTime(gAttackMs);
	}
	// Set release value if slider has changed
	if(release != gReleaseMs)
	{
		gReleaseMs = release;
		gDetector.setReleaseTime(gReleaseMs);
	}
	for(unsigned int n = 0; n < context->audioFrames; n++)
	{
		// Read input from designated detect channel
		float in = audioRead(context, n, gDetectChannel);

		// Get absolute value of input
		float processInput = fabsf(in);

		// Get input level in decibels
		if(processInput <  1e-6)
			processInput = -120;
		else
			processInput = 20.0*log10(processInput);

		// Compressor's Gain Computer (soft-knee compressor)
		float gainComputerOut;
		// Compute value to compare against knee value
		float compareVal = 2 * (processInput - threshold);
		if(compareVal <= -knee)
		{
			gainComputerOut = processInput;
		}
		else if(compareVal <= knee)
		{
			gainComputerOut = processInput + (1/ratio - 1) * pow(processInput - threshold + 0.5* knee, 2) / (2 * knee);
		}
		else // compareVal > knee -> hard-knee behaviour
		{
			gainComputerOut = threshold + (processInput - threshold) / ratio;
		}
		// Extract envelope of control signal from gain computer
		float envelopeOut = gDetector.process(processInput - gainComputerOut);

		// Compute gain control based on make-up gain and envelope and convert from dB to linear
		float gainControl = pow(10.0, (makeupG - envelopeOut) / 20.0);

		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++)
		{
			// Write the sample to every audio output channel
			float out = 0.0;
 			if(channel == gDetectChannel)
			{
				out = in;
			}
			else
			{
				if(channel < context->audioInChannels)
					// Apply gain reduction
					out = audioRead(context, n, channel) * gainControl;
				else 
					out = 0.0;
			}
			audioWrite(context, n, channel, out);
		}
		// Log input and gainControl signals to oscilloscope
		gScope.log(in, gainControl);
	}
}

void cleanup(BelaContext *context, void *userData)
{

}
