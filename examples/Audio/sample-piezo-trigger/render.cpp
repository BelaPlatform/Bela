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
#include <libraries/Scope/Scope.h>
#include <SampleLoader.h>
#include <SampleData.h>

#define NUM_CHANNELS 1

std::string gFilename = "sample.wav";

SampleData gSampleData[NUM_CHANNELS];

int gReadPtr;	// Position of last read sample from file

Scope scope;

float gPiezoInput; // Piezo sensor input

// DC OFFSET FILTER
float prevReadingDCOffset = 0;
float prevPiezoReading = 0;
float readingDCOffset = 0;
float R = 0.99;//1 - (250/44100);

// For onset detection
float peakValue = 0;
float thresholdToTrigger = 0.001;
float amountBelowPeak = 0.001;
float rolloffRate = 0.00005;
int triggered = 0;

int gAudioFramesPerAnalogFrame = 0;

bool setup(BelaContext *context, void *userData)
{

	if(context->analogSampleRate > context->audioSampleRate)
	{
		fprintf(stderr, "Error: for this project the sampling rate of the analog inputs has to be <= the audio sample rate\n");
		return false;
	}

	for(int ch=0;ch<NUM_CHANNELS;ch++) {
        	gSampleData[ch].sampleLen = getNumFrames(gFilename);
    		gSampleData[ch].samples = new float[gSampleData[ch].sampleLen];
        	getSamples(gFilename,gSampleData[ch].samples,ch,0,gSampleData[ch].sampleLen);
	}

	gReadPtr = -1;
	
	if(context->analogFrames)
		gAudioFramesPerAnalogFrame = context->audioFrames / context->analogFrames;

	// setup the scope with 3 channels at the audio sample rate
	scope.setup(3, context->audioSampleRate);

	return true;
}

void render(BelaContext *context, void *userData)
{
    float currentSample;
    float out = 0;

	for(unsigned int n = 0; n < context->audioFrames; n++) {

		if(gAudioFramesPerAnalogFrame && !(n % gAudioFramesPerAnalogFrame)) {
			// Read analog input 0, piezo disk
			gPiezoInput = analogRead(context, n % gAudioFramesPerAnalogFrame, 0);
		}
		
		// Re-centre around 0
		// DC Offset Filter    y[n] = x[n] - x[n-1] + R * y[n-1]
		readingDCOffset = gPiezoInput - prevPiezoReading + (R * prevReadingDCOffset);
		prevPiezoReading = gPiezoInput;
		prevReadingDCOffset = readingDCOffset;
		currentSample = readingDCOffset;

		// Full wave rectify
	    if(currentSample < 0)
			currentSample *= -1.0f;
		
		// Onset Detection
		if(currentSample >= peakValue) { // Record the highest incoming sample
			peakValue = currentSample;
			triggered = 0;
		}
	  	else if(peakValue >= rolloffRate) // But have the peak value decay over time
	    	peakValue -= rolloffRate;       // so we can catch the next peak later
		    
	  	if(currentSample < peakValue - amountBelowPeak && peakValue >= thresholdToTrigger && !triggered) {
	    	rt_printf("%f\n", peakValue);
	    	triggered = 1; // Indicate that we've triggered and wait for the next peak before triggering
		                   // again.
	    	gReadPtr = 0;  // Start sample playback
	  	}

        for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
            
            // If triggered...
		    if(gReadPtr != -1)
		    	out = gSampleData[channel%NUM_CHANNELS].samples[gReadPtr++];	// ...read each sample...

	    	if(gReadPtr >= gSampleData[channel%NUM_CHANNELS].sampleLen)
		    	gReadPtr = -1;
		    	
    		audioWrite(context, n, channel, out);
    	}
    	
	}
	
	// log the piezo input, peakValue from onset detection and audio output on the scope
    scope.log(gPiezoInput, peakValue, out);
}


void cleanup(BelaContext *context, void *userData)
{
    for(int ch=0;ch<NUM_CHANNELS;ch++)
    	delete[] gSampleData[ch].samples;
}


/**
\example sample-piezo-trigger/render.cpp

Piezo strike to WAV file playback
--------------------------------

This sketch shows how to playback audio samples from a buffer using
onset detection of strikes detected by a piezo sensor.

An audio file is loaded into a buffer `SampleData` as `gSampleData`. This is 
accessed with a read pointer that is incremented at audio rate within the render 
function: `out += gSampleData.samples[gReadPtr++]`.

Note that the read pointer is stopped from incrementing past the length of the 
`gSampleData`. This is achieved by comparing the read pointer value against the 
sample length which we can access as follows: `gSampleData.sampleLen`.

The piezo is connected to Bela through a simple voltage divider circuit.

- Connect a 1.8 MOhm resistor between the positive (red) and negative (black) leads of the piezo
- Also connect the negative side to ground
- Connect analog input 0 to the positive side
- Connect another 1.8 MOhm resistor between positive and 3.3V

In order to get a coherent trigger from the piezo disk we have to go through a few stages of 
signal taming. The first is a DC offset filter which recentres the signal around 0. This is necessary
as our voltage divider circuit pushes the piezo input signal to half the input voltage range, 
allowing us to read the piezo's full output.

As a piezo disk behaves like a microphone it outputs both negative and positive values. A second
step we have to take before detecting strikes is to fullwave rectify the signal, this gives us only
positive values.

Next we perform the onset detection. We do this by looking for a downwards trend in the sensor data
after a rise. Once we've identified this we can say that a peak has occured and trigger the sample
to play. We do this by setting `gReadPtr = 0;`.

This type of onset detection is by no means perfect. Really we should lowpass filter the 
piezo signal before performing the onset detection algorithm and implement some kind of 
debounce on the stikes to avoid multiple strikes being detected for a single strike.
*/
