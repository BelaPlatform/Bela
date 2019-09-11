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
#include <stdlib.h> //random
#include <math.h> //sinf
#include <time.h> //time
#include <OscillatorBank.h>

const float kMinimumFrequency = 20.0f;
const float kMaximumFrequency = 8000.0f;

int gSampleCount;		// Sample counter for indicating when to update frequencies
float gNewMinFrequency;
float gNewMaxFrequency;

// Task for handling the update of the frequencies using the analog inputs
AuxiliaryTask gFrequencyUpdateTask;

// These settings are carried over from main.cpp
// Setting global variables is an alternative approach
// to passing a structure to userData in setup()
int gNumOscillators = 500;
int gWavetableLength = 1024;

void recalculate_frequencies(void*);
OscillatorBank osc;
bool setup(BelaContext *context, void *userData)
{
	if(context->audioOutChannels != 2) {
		rt_printf("Error: this example needs stereo audio enabled\n");
		return false;
	}

	srandom(time(NULL));
	osc.init(gWavetableLength, gNumOscillators, context->audioSampleRate);
	
	// Fill in the wavetable with one period of your waveform
	float* wavetable = osc.getWavetable();
	for(int n = 0; n < osc.getWavetableLength() + 1; n++){
		wavetable[n] = sinf(2.0 * M_PI * (float)n / (float)osc.getWavetableLength());
	}
	
	// Initialise frequency and amplitude
	float freq = kMinimumFrequency;
	float increment = (kMaximumFrequency - kMinimumFrequency) / (float)gNumOscillators;
	for(int n = 0; n < gNumOscillators; n++) {
		if(context->analogFrames == 0) {
			// Random frequencies when used without analogInputs
			osc.setFrequency(n, kMinimumFrequency + (kMaximumFrequency - kMinimumFrequency) * ((float)random() / (float)RAND_MAX));
		}
		else {
			// Constant spread of frequencies when used with analogInputs
			osc.setFrequency(n, freq);
			freq += increment;
		}
		osc.setAmplitude(n, (float)random() / (float)RAND_MAX / (float)gNumOscillators);
	}

	increment = 0;
	freq = 440.0;

	for(int n = 0; n < gNumOscillators; n++) {
		// Update the frequencies to a regular spread, plus a small amount of randomness
		// to avoid weird phase effects
		float randScale = 0.99 + .02 * (float)random() / (float)RAND_MAX;
		float newFreq = freq * randScale;

		// For efficiency, frequency is expressed in change in wavetable position per sample, not Hz or radians
		osc.setFrequency(n, newFreq);
		freq += increment;
	}

	// Initialise auxiliary tasks
	if((gFrequencyUpdateTask = Bela_createAuxiliaryTask(&recalculate_frequencies, 85, "bela-update-frequencies")) == 0)
		return false;

	gSampleCount = 0;

	return true;
}

void render(BelaContext *context, void *userData)
{

	float arr[context->audioFrames];
	// Render audio frames
	osc.process(context->audioFrames, arr);
	for(unsigned int n = 0; n < context->audioFrames; ++n){
		audioWrite(context, n, 0, arr[n]);
		audioWrite(context, n, 1, arr[n]);
	}
	if(context->analogFrames != 0 && (gSampleCount += context->audioFrames) >= 128) {
		gSampleCount = 0;
		gNewMinFrequency = map(context->analogIn[0], 0, 1.0, 1000.0f, 8000.0f);
		gNewMaxFrequency = map(context->analogIn[1], 0, 1.0, 1000.0f, 8000.0f);

		// Make sure max >= min
		if(gNewMaxFrequency < gNewMinFrequency) {
			float temp = gNewMaxFrequency;
			gNewMaxFrequency = gNewMinFrequency;
			gNewMinFrequency = temp;
		}

		// Request that the lower-priority task run at next opportunity
		Bela_scheduleAuxiliaryTask(gFrequencyUpdateTask);
	}
}

// This is a lower-priority call to update the frequencies which will happen
// periodically when the analog inputs are enabled. By placing it at a lower priority,
// it has minimal effect on the audio performance but it will take longer to
// complete if the system is under heavy audio load.

void recalculate_frequencies(void*)
{
	float freq = gNewMinFrequency;
	float increment = (gNewMaxFrequency - gNewMinFrequency) / (float)gNumOscillators;

	for(int n = 0; n < gNumOscillators; n++) {
		// Update the frequencies to a regular spread, plus a small amount of randomness
		// to avoid weird phase effects
		float randScale = 0.99 + .02 * (float)random() / (float)RAND_MAX;
		float newFreq = freq * randScale;

		osc.setFrequency(n, newFreq);
		freq += increment;
	}
}

void cleanup(BelaContext *context, void *userData)
{}

/**
\example oscillator-bank/render.cpp

Oscillator Bank
----------------------

These files demonstrate the ultra-efficient oscillator bank class.

OscillatorBank::init() allocates the needed buffers.

OscillatorBank::getWavetable() gives access to the wavetable. The 
user has to populate it with one period of the desired waveform. 
Note that the length of the waveform is (getWavetableLength() + 1)
and the last sample must be the same as the first sample.

OscillatorBank::setAmplitude() and OscillatorBank::setFrequency() can 
be used to set the amplitude and frequency of individual oscillators.
These can be changed at any point during the execution of the program.

OscillatorBank::process(int frames, float* output) writes *frames*
values to the *output* array.

This program can run with a large number of  oscillators (> 500, depending on the
settings in use). Updating the frequencies of a large number of oscillators from within 
render(), for every sample or for every block would add significatively to the
computational load. For this reason, we factored out the frequency update in an
AuxiliaryTask which runs at most every 128 samples. If needed, the AuxiliaryTask
will split the load over time across multiple calls to render(), thus avoiding
audio dropouts.

*/
