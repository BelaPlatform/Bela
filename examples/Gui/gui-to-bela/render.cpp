/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Gui/gui-to-bela/render.cpp

Sending from the GUI to Bela
============================

This project is a minimal example on how to send data buffers from p5js to Bela.
Bela (render.cpp) receives a buffer of data from p5js (sketch.js) containing three floats:
two corresponding to slider values and the third one correponding to a button.
These values are then mapped as parameters of an oscillator object. The mapping is:
slider1-->pitch
slider2-->amplitude
button-->play/stop

HOW TO RECEIVE A BUFFER IN BELA
===============================

In order to receive a buffer from the GUI, the type of the buffer and maximum number of values
that it will hold need to be specified in setup:
```
myGUi.setBuffer('f', 3);
```
In this case we are expecting to receive a buffer of floats with a maximum of 3 elements.
This function will return the index of the buffer (which is given automatically based on the order
they are set on). This buffer will have index = 0.
The buffer can then be accessed using this index:
```
DataBuffer& buffer = myGui.getDataBuffer(0);
```
Notice that the Gui::getDataBuffer() method returns a `DataBuffer& `(that is: a
_reference_ to a DataBuffer). You should in turn always be storing the return
value in a `DataBuffer&` variable to minimize copy overhead, and ensure
that it can be used safely from within a real-time context.

And its contents retrieved in the desired format (floats in this case):
	`float* data = buffer.getAsFloat();`
*/
#include <Bela.h>
#include <libraries/Oscillator/Oscillator.h>
#include <libraries/Gui/Gui.h>
#include <cmath>

//create a gui and an oscillator object
Gui gui;
Oscillator oscillator;



bool setup(BelaContext *context, void *userData)
{
	// Set up oscillator and GUI
	oscillator.setup(context->audioSampleRate);
	gui.setup(context->projectName);

	//Set the buffer to receive from the GUI
	gui.setBuffer('f', 3);
	return true;
}

void render(BelaContext *context, void *userData)
{
	//We store the DataBuffer in 'buffer'
	DataBuffer& buffer = gui.getDataBuffer(0);
	// Retrieve contents of the buffer as floats
	float* data = buffer.getAsFloat();

	//store each element of the array in local variables
	float pitch = data[0]; //range of values is [0,1],
	pitch = map(pitch,0,1,40,80); // we map it to [20,80] for MIDI pitches
	float amplitude = data[1]; //range is [0,1]
	float play = data[2]; //0.0 or 1.0

	//for mapping
	float frequency = 440 * powf(2, (pitch-69)/12); // compute the frequency based on the MIDI pitch
	oscillator.setFrequency(frequency);
	// notice: no smoothing for amplitude and frequency, you will get clicks when the values change

	for(unsigned int n = 0; n < context->audioFrames; n++) {
		float out = oscillator.process() * amplitude * play;
		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			// Write the sample to every audio output channel
			audioWrite(context, n, channel, out);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{}
