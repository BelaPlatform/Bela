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


#define NUMBER_OF_SEGMENTS	10

int gAudioChannelNum; // number of audio channels to iterate over

// Two levels of audio: one follows current value, the other holds
// peaks for longer
float gAudioLocalLevel = 0, gAudioPeakLevel = 0;

// Decay rates for detecting levels
float gLocalDecayRate = 0.99, gPeakDecayRate = 0.999;

// Thresholds for LEDs: set in setup()
float gThresholds[NUMBER_OF_SEGMENTS + 1];
int gSamplesToLight[NUMBER_OF_SEGMENTS];

// High-pass filter on the input
float gLastX[2] = {0};
float gLastY[2] = {0};

// These coefficients make a high-pass filter at 5Hz for 44.1kHz sample rate
double gB0 = 0.99949640;
double gB1 = -1.99899280;
double gB2 = gB0;
double gA1 = -1.99899254;
double gA2 = 0.99899305;

bool setup(BelaContext *context, void *userData)
{	
	// This project makes the assumption that the audio and digital
	// sample rates are the same. But check it to be sure!
	if(context->audioFrames != context->digitalFrames) {
		rt_printf("Error: this project needs the audio and digital sample rates to be the same.\n");
		return false;
	}

	// If the amout of audio and analog input and output channels is not the same
	// we will use the minimum between input and output
	gAudioChannelNum = std::min(context->audioInChannels, context->audioOutChannels);

	// Initialise threshold levels in -3dB steps. One extra for efficiency in render()
	// Level = 10^(dB/20)
	for(int i = 0; i < NUMBER_OF_SEGMENTS + 1; i++) {
		gThresholds[i] = powf(10.0f, (-1.0 * (NUMBER_OF_SEGMENTS - i)) * .05);
	}

	for(int i = 0; i < NUMBER_OF_SEGMENTS; i++) {
		gSamplesToLight[i] = 0;
		pinMode(context, 0, i, OUTPUT);
	}

	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
			
		// Get average of audio input channels
		float sample = 0;
		for(unsigned int ch = 0; ch < context->audioInChannels; ch++) {
			sample += audioRead(context, n, ch);
		}

		// Audio loopback
		for(unsigned int ch = 0; ch < gAudioChannelNum; ch++)
			audioWrite(context, n, ch, audioRead(context, n, ch));

		// Do DC-blocking on the sum
		float out = gB0 * sample + gB1 * gLastX[0] + gB2 * gLastX[1]
						- gA1 * gLastY[0] - gA2 * gLastY[1];

		gLastX[1] = gLastX[0];
		gLastX[0] = sample;
		gLastY[1] = gLastY[0];
		gLastY[0] = out;

		out = fabsf(out / (float)gAudioChannelNum);
		
		// Do peak detection: fast-responding local level
		if(out > gAudioLocalLevel)
			gAudioLocalLevel = out;
		else
			gAudioLocalLevel *= gLocalDecayRate;
		
		// Do peak detection: slow-responding peak level
		if(out > gAudioPeakLevel)
			gAudioPeakLevel = out;
		else {
			// Make peak decay slowly by only multiplying
			// every few samples
			if(((context->audioFramesElapsed + n) & 31) == 0)
				gAudioPeakLevel *= gPeakDecayRate;
		}	
		// LED bargraph on digital outputs 0-9
		for(int led = 0; led < NUMBER_OF_SEGMENTS; led++) {
			// All LEDs up to the local level light up. The LED
			// for the peak level also remains lit.
			int state = LOW;
				
			if(gAudioLocalLevel > gThresholds[led]) {
				state = HIGH;
				gSamplesToLight[led] = 1000;
			}
			/*else if(gAudioPeakLevel > gThresholds[led] && gAudioPeakLevel <= gThresholds[led + 1]) {
				state = HIGH;
				gSamplesToLight[led] = 1000;
			}*/
			else if(--gSamplesToLight[led] > 0)
				state = HIGH;
			
			// Write LED
			digitalWriteOnce(context, n, led, state);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{

}

/**
\example level-meter/render.cpp

Visualise music with leds
-------------------------

This example shows how to make an audio level meter with a set of ten LEDs.

- Connect an LED in series with a 470ohm resistor between every Digital pin 0 - 9 and ground.

You will also need to connect an audio adapter to the audio input pins and connect something 
that can produce an audio signal to this (a laptop, mp3 player, phone or keyboard). The code 
preforms peak detection on the audio input and lights the LEDs once the amplitude of the 
input signal passes a certain threshold stored in `gThresholds[i]`. Each LED has its 
own threshold, the values of which are set in `setup()` and are steps of -3dB. All digital 
pins are set to output `pinMode(context, 0, i, OUTPUT);` and they are toggled on and off 
in `render()` when the amplitude passes the threshold for that LED. The LEDs below the 
current peak value always remain lit to create a classic amplitude peak meter. The audio 
input is passed through to the output so you can listen as you watch the light show.

*/