/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
https://bela.io
*/
/**
\example Gui/sliders/render.cpp

Sliders for your GUI
--------------------

This example demonstrates how to create some GUI sliders to control the behaviour of your program while it
is running. It uses the GuiController library, which uses dat.gui to auto create some control sliders which appear
at the GUI page: bela.local/gui/

The sliders are created in setup() with the function controller.addSlider("Pitch (MIDI note)", 60, 48, 84, 1);.
The arguments are: name, initial value, minimum, maximum, and increment.

We read from the sliders in render() with the following function: controller.getSliderValue(slider-name);
*/

#include <Bela.h>
#include <libraries/Oscillator/Oscillator.h>
#include <libraries/Gui/Gui.h>
#include <libraries/GuiController/GuiController.h>
#include <cmath>

Gui gui;
GuiController controller;
Oscillator oscillator;

unsigned int gPitchSliderIdx;
unsigned int gAmplitudeSliderIdx;

bool setup(BelaContext *context, void *userData)
{
	oscillator.setup(context->audioSampleRate);

	// Set up the GUI
	gui.setup(context->projectName);
	// and attach to it
	controller.setup(&gui, "Controls");

	// Arguments: name, default value, minimum, maximum, increment
	// store the return value to read from the slider later on
	gPitchSliderIdx = controller.addSlider("Pitch (MIDI note)", 60, 48, 84, 1); // step is 1: quantized semitones
	gAmplitudeSliderIdx = controller.addSlider("Amplitude", 0.1, 0, 0.5, 0.0001);
	return true;
}

void render(BelaContext *context, void *userData)
{
	// Access the sliders specifying the index we obtained when creating then
	float pitch = controller.getSliderValue(gPitchSliderIdx);
	float amplitude = controller.getSliderValue(gAmplitudeSliderIdx);

	float frequency = 440 * powf(2, (pitch-69)/12); // compute the frequency based on the MIDI pitch
	oscillator.setFrequency(frequency);
	// notice: no smoothing for amplitude and frequency, you will get clicks when the values change

	for(unsigned int n = 0; n < context->audioFrames; n++) {
		float out = oscillator.process() * amplitude;
		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			// Write the sample to every audio output channel
			audioWrite(context, n, channel, out);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{}
