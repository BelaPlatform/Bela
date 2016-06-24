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
#include <rtdk.h>
#include <cstdlib>
#include <cmath>
#include <cstring>
#include <time.h>

const float kMinimumFrequency = 20.0f;
const float kMaximumFrequency = 8000.0f;

float *gWavetable;		// Buffer holding the precalculated sine lookup table
float *gPhases;			// Buffer holding the phase of each oscillator
float *gFrequencies;	// Buffer holding the frequencies of each oscillator
float *gAmplitudes;		// Buffer holding the amplitudes of each oscillator
float *gDFrequencies;	// Buffer holding the derivatives of frequency
float *gDAmplitudes;	// Buffer holding the derivatives of amplitude

float gAudioSampleRate;
int gSampleCount;		// Sample counter for indicating when to update frequencies
float gNewMinFrequency;
float gNewMaxFrequency;

// Task for handling the update of the frequencies using the matrix
AuxiliaryTask gFrequencyUpdateTask;

// These settings are carried over from main.cpp
// Setting global variables is an alternative approach
// to passing a structure to userData in setup()

extern int gNumOscillators;
extern int gWavetableLength;

void recalculate_frequencies();

extern "C" {
	// Function prototype for ARM assembly implementation of oscillator bank
	void oscillator_bank_neon(int numAudioFrames, float *audioOut,
							  int activePartialNum, int lookupTableSize,
							  float *phases, float *frequencies, float *amplitudes,
							  float *freqDerivatives, float *ampDerivatives,
							  float *lookupTable);
}

// setup() is called once before the audio rendering starts.
// Use it to perform any initialisation and allocation which is dependent
// on the period size or sample rate.
//
// userData holds an opaque pointer to a data structure that was passed
// in from the call to initAudio().
//
// Return true on success; returning false halts the program.
bool setup(BelaContext *context, void *userData)
{
	srandom(time(NULL));

	if(context->audioOutChannels != 2) {
		rt_printf("Error: this example needs stereo audio enabled\n");
		return false;
	}

	// Initialise the sine wavetable
	if(posix_memalign((void **)&gWavetable, 8, (gWavetableLength + 1) * sizeof(float))) {
		rt_printf("Error allocating wavetable\n");
		return false;
	}
	for(int n = 0; n < gWavetableLength + 1; n++)
		gWavetable[n] = sinf(2.0 * M_PI * (float)n / (float)gWavetableLength);

	// Allocate the other buffers
	if(posix_memalign((void **)&gPhases, 16, gNumOscillators * sizeof(float))) {
		rt_printf("Error allocating phase buffer\n");
		return false;
	}
	if(posix_memalign((void **)&gFrequencies, 16, gNumOscillators * sizeof(float))) {
		rt_printf("Error allocating frequency buffer\n");
		return false;
	}
	if(posix_memalign((void **)&gAmplitudes, 16, gNumOscillators * sizeof(float))) {
		rt_printf("Error allocating amplitude buffer\n");
		return false;
	}
	if(posix_memalign((void **)&gDFrequencies, 16, gNumOscillators * sizeof(float))) {
		rt_printf("Error allocating frequency derivative buffer\n");
		return false;
	}
	if(posix_memalign((void **)&gDAmplitudes, 16, gNumOscillators * sizeof(float))) {
		rt_printf("Error allocating amplitude derivative buffer\n");
		return false;
	}

	// Initialise buffer contents

	float freq = kMinimumFrequency;
	float increment = (kMaximumFrequency - kMinimumFrequency) / (float)gNumOscillators;

	for(int n = 0; n < gNumOscillators; n++) {
		gPhases[n] = 0.0;

		if(context->analogFrames == 0) {
			// Random frequencies when used without matrix
			gFrequencies[n] = kMinimumFrequency + (kMaximumFrequency - kMinimumFrequency) * ((float)random() / (float)RAND_MAX);
		}
		else {
			// Constant spread of frequencies when used with matrix
			gFrequencies[n] = freq;
			freq += increment;
		}

		// For efficiency, frequency is expressed in change in wavetable position per sample, not Hz or radians
		gFrequencies[n] *= (float)gWavetableLength / context->audioSampleRate;
		gAmplitudes[n] = ((float)random() / (float)RAND_MAX) / (float)gNumOscillators;
		gDFrequencies[n] = gDAmplitudes[n] = 0.0;
	}

	increment = 0;
	freq = 440.0;

	for(int n = 0; n < gNumOscillators; n++) {
		// Update the frequencies to a regular spread, plus a small amount of randomness
		// to avoid weird phase effects
		float randScale = 0.99 + .02 * (float)random() / (float)RAND_MAX;
		float newFreq = freq * randScale;

		// For efficiency, frequency is expressed in change in wavetable position per sample, not Hz or radians
		gFrequencies[n] = newFreq * (float)gWavetableLength / context->audioSampleRate;

		freq += increment;
	}

	// Initialise auxiliary tasks
	if((gFrequencyUpdateTask = Bela_createAuxiliaryTask(&recalculate_frequencies, 85, "bela-update-frequencies")) == 0)
		return false;

	//for(int n = 0; n < gNumOscillators; n++)
	//	rt_printf("%f\n", gFrequencies[n]);

	gAudioSampleRate = context->audioSampleRate;
	gSampleCount = 0;

	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available). If only audio is available, numMatrixFrames
// will be 0.

void render(BelaContext *context, void *userData)
{
	// Initialise buffer to 0
	memset(context->audioOut, 0, 2 * context->audioFrames * sizeof(float));

	// Render audio frames
	oscillator_bank_neon(context->audioFrames, context->audioOut,
			gNumOscillators, gWavetableLength,
			gPhases, gFrequencies, gAmplitudes,
			gDFrequencies, gDAmplitudes,
			gWavetable);

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
		//Bela_scheduleAuxiliaryTask(gFrequencyUpdateTask);
	}
}

// This is a lower-priority call to update the frequencies which will happen
// periodically when the matrix is enabled. By placing it at a lower priority,
// it has minimal effect on the audio performance but it will take longer to
// complete if the system is under heavy audio load.

void recalculate_frequencies()
{
	float freq = gNewMinFrequency;
	float increment = (gNewMaxFrequency - gNewMinFrequency) / (float)gNumOscillators;

	for(int n = 0; n < gNumOscillators; n++) {
		// Update the frequencies to a regular spread, plus a small amount of randomness
		// to avoid weird phase effects
		float randScale = 0.99 + .02 * (float)random() / (float)RAND_MAX;
		float newFreq = freq * randScale;

		// For efficiency, frequency is expressed in change in wavetable position per sample, not Hz or radians
		gFrequencies[n] = newFreq * (float)gWavetableLength / gAudioSampleRate;

		freq += increment;
	}
}


// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BelaContext *context, void *userData)
{
	free(gWavetable);
	free(gPhases);
	free(gFrequencies);
	free(gAmplitudes);
	free(gDFrequencies);
	free(gDAmplitudes);
}

/**
\example oscillator-bank/render.cpp

Oscillator Bank
----------------------

These files demonstrate an oscillator bank implemented in assembly code 
that is used as part of the d-box project.
*/

