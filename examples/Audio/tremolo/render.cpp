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
#include <cmath>
#include <algorithm>


int gAudioChannelNum; // number of audio channels to iterate over
float gFrequency = 4.0;
float gPhase;
float gInverseSampleRate;
int gAudioFramesPerAnalogFrame = 0;


bool setup(BelaContext *context, void *userData)
{
	// If the amout of audio input and output channels is not the same
	// we will use the minimum between input and output
	gAudioChannelNum = std::min(context->audioInChannels, context->audioOutChannels);
	
	// Check that we have the same number of inputs and outputs.
	if(context->audioInChannels != context->audioOutChannels){
		printf("Different number of audio outputs and inputs available. Using %d channels.\n", gAudioChannelNum);
	}

	if(context->analogSampleRate > context->audioSampleRate)
	{
		fprintf(stderr, "Error: for this project the sampling rate of the analog inputs has to be <= the audio sample rate\n");
		return false;
	}

	if(context->audioFrames)
		gAudioFramesPerAnalogFrame = context->audioFrames / context->analogFrames;
	gInverseSampleRate = 1.0 / context->audioSampleRate;
	gPhase = 0.0;

	return true;
}

void render(BelaContext *context, void *userData)
{
	// Nested for loops for audio channels
	for(unsigned int n = 0; n < context->audioFrames; n++) {

		if(gAudioFramesPerAnalogFrame && !(n % gAudioFramesPerAnalogFrame)) {
			// Read analog channel 0 and map the range from 0-1 to 0.25-20
			// use this to set the value of gFrequency
			gFrequency = map(analogRead(context, n, 0), 0.0, 1.0, 0.25, 20.0);
		}

		// Generate a sinewave with frequency set by gFrequency
		// and amplitude from -0.5 to 0.5
		float lfo = sinf(gPhase) * 0.5f;
		// Keep track and wrap the phase of the sinewave
		gPhase += 2.0f * (float)M_PI * gFrequency * gInverseSampleRate;
		if(gPhase > M_PI)
			gPhase -= 2.0f * (float)M_PI;

		for(unsigned int channel = 0; channel < gAudioChannelNum; channel++) {
			// Read the audio input and half the amplitude
			float input = audioRead(context, n, channel) * 0.5f;
			// Write to audio output the audio input multiplied by the sinewave
			audioWrite(context, n, channel, (input*lfo));
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{

}


/**
\example tremolo/render.cpp

A simple tremolo effect
-----------------------

This sketch demonstrates how to make a simple tremolo effect with one potiometer to
control the rate of the effect. A tremolo effect is a simple type of amplitude modulation
where the amplitude of one signal is continuous modulated by the amplitude of another.
This is achieved by multiplying two signals together.

In this example we want to create a tremolo effect like that you would find in a guitar
effects box so our first signal will be our audio input into which we could plug a guitar
or external sound source. This will be our 'carrier' signal.

The second signal that we will use, the 'modulator', will be a low freqeuncy oscillator (LFO),
in this case a sinetone which we will generate in the same way as the 01-Basic/sinetone example. 
The frequency of this sinetone is determined by a global variable, `gFrequency`. Again, the 
sinetone is produced by incrementing the phase of a sine function on every audio frame.

In `render()` you'll see two nested for loop structures, one for audio and the other for the 
analogs. You should be pretty familiar with this structure by now. In the first of these loops
we deal with all the audio -- in the second with reading the analog input channels. We read the 
value of analog input 0 and map it to an appropriate range for controlling the frequency
of the sine tone.

The lfo is then mulitplied together with the audio input and sent to the audio output.

Hardware
-----------------------
- connect a 10K pot to 3.3V and GND on its 1st and 3rd pins.
- connect the 2nd middle pin of the pot to analogIn 0.

*/
