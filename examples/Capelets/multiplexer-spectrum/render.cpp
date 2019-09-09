/*
 ____  _____ _		  _
| __ )| ____| |		 / \
|  _ \|  _| | |		/ _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/	\_\

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
#include <cstdlib>
#include <cstring>
#include <cmath>
#include <unistd.h>

// Filter info
float *gFilterLastInputs;
float *gFilterLastOutputs;
unsigned long long *gFilterSampleCounts;
float gCoeffB0 = 0, gCoeffB1 = 0, gCoeffB2 = 0, gCoeffA1 = 0, gCoeffA2 = 0;

// Display info
AuxiliaryTask gPrintTask;
unsigned int gPrintCount = 0;
unsigned int gAnalogInChannels = 0, gMultiplexerChannels = 0;

// Oscillator bank info -- for passing across threads
int gNumOscillators = 0;
int gWavetableLength = 1024;
float gAudioSampleRate = 44100.0;
unsigned long long gAudioFramesElapsed = 0;
bool gIsStdoutTty;

float *gWavetable;		// Buffer holding the precalculated sine lookup table
float *gPhases;			// Buffer holding the phase of each oscillator
float *gFrequencies;	// Buffer holding the frequencies of each oscillator
float *gAmplitudes;		// Buffer holding the amplitudes of each oscillator
float *gDFrequencies;	// Buffer holding the derivatives of frequency
float *gDAmplitudes;	// Buffer holding the derivatives of amplitude

void calculate_coeff(float sampleRate, float cutFreq);
bool initialise_oscillators(float fundamental_frequency);
void print_results(void*);

extern "C" {
	// Function prototype for ARM assembly implementation of oscillator bank
	void oscillator_bank_neon(int numAudioFrames, float *audioOut,
							  int activePartialNum, int lookupTableSize,
							  float *phases, float *frequencies, float *amplitudes,
							  float *freqDerivatives, float *ampDerivatives,
							  float *lookupTable);
}

bool setup(BelaContext *context, void *userData)
{
	if(context->audioOutChannels != 2) {
		rt_printf("Error: this example needs stereo audio enabled\n");
		return false;
	}

	if(context->multiplexerChannels == 0 || context->analogFrames == 0) {
		rt_printf("Please enable the Multiplexer Capelet to run this example.\n");
		return false;
	}

	int totalInputs = context->multiplexerChannels * context->analogInChannels;

	// Allocate filter buffers: 2 previous samples per filter, 1 filter per input
	gFilterLastInputs = (float *)malloc(2 * totalInputs * sizeof(float));
	gFilterLastOutputs = (float *)malloc(2 * totalInputs * sizeof(float));

	if(gFilterLastInputs == 0 || gFilterLastOutputs == 0) {
		rt_printf("Unable to allocate memory buffers.\n");
		return false;
	}

	memset(gFilterLastInputs, 0, 2 * totalInputs * sizeof(float));
	memset(gFilterLastOutputs, 0, 2 * totalInputs * sizeof(float));

	// Allocate a buffer to hold sample counts (to display actual sample rate)
	gFilterSampleCounts = (unsigned long long *)malloc(totalInputs * sizeof(unsigned long long));

	if(gFilterSampleCounts == 0) {
		rt_printf("Unable to allocate memory buffers.\n");
		return false;
	}

	memset(gFilterSampleCounts, 0, totalInputs * sizeof(unsigned long long));

	// Initialise filter coefficients. Expected sample rate is 22.05kHz divided by
	// number of multiplexer channels.
	calculate_coeff(22050.0 / (float)context->multiplexerChannels, 50.0);

	// Initiliase the oscillator bank in a harmonic series, one for each input
	gNumOscillators = totalInputs;
	if(!initialise_oscillators(55.0))
		return false;

	// Set up an aux task to handle the printing
	if((gPrintTask = Bela_createAuxiliaryTask(&print_results, 90, "bela-print-results")) == 0)
		return false;

	// Copy some info from the context to global variables accessible from the aux task
	gAnalogInChannels = context->analogInChannels;
	gMultiplexerChannels = context->multiplexerChannels;
	gAudioSampleRate = context->audioSampleRate;

	gIsStdoutTty = isatty(1); // Check if stdout is a terminal
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->analogFrames; n++) {
		// Find out which multiplexer channel this frame belongs to
		int muxChannel = multiplexerChannelForFrame(context, n);

		// Assign each input to the right filter
		for(unsigned int ch = 0; ch < context->analogInChannels; ch++) {
			int filterIndex = ch * context->multiplexerChannels + muxChannel;

			// Read sample
			float input = analogRead(context, n, ch);

			// Calculate filtered output
			float output = gCoeffB0 * input
							+ gCoeffB1 * gFilterLastInputs[filterIndex * 2]
							+ gCoeffB2 * gFilterLastInputs[filterIndex * 2 + 1]
							- gCoeffA1 * gFilterLastOutputs[filterIndex * 2]
							- gCoeffA2 * gFilterLastOutputs[filterIndex * 2 + 1];

			// Save the filter history
			gFilterLastInputs[filterIndex*2 + 1] = gFilterLastInputs[filterIndex*2];
			gFilterLastInputs[filterIndex*2] = input;
			gFilterLastOutputs[filterIndex*2 + 1] = gFilterLastOutputs[filterIndex*2];
			gFilterLastOutputs[filterIndex*2] = output;

			// Increment count (for determining sample rate)
			gFilterSampleCounts[filterIndex]++;

			// Use output to control oscillator amplitude (with some headroom)
			// Square it to de-emphasise low but nonzero values
			gAmplitudes[filterIndex] = output * output / 4.f;
		}
	}

	// Render oscillator bank:

	// Initialise buffer to 0
	memset(context->audioOut, 0, context->audioOutChannels * context->audioFrames * sizeof(float));

	// Render audio frames
	oscillator_bank_neon(context->audioFrames, context->audioOut,
			gNumOscillators, gWavetableLength,
			gPhases, gFrequencies, gAmplitudes,
			gDFrequencies, gDAmplitudes,
			gWavetable);

	gPrintCount += context->analogFrames;
	gAudioFramesElapsed = context->audioFramesElapsed;

	if(gPrintCount >= (unsigned int)(context->analogSampleRate * 0.1f)) {
		gPrintCount = 0;
		Bela_scheduleAuxiliaryTask(gPrintTask);
	}
}

void cleanup(BelaContext *context, void *userData)
{
	free(gFilterLastInputs);
	free(gFilterLastOutputs);
	free(gFilterSampleCounts);
	free(gWavetable);
	free(gPhases);
	free(gFrequencies);
	free(gAmplitudes);
	free(gDFrequencies);
	free(gDAmplitudes);
}

// Calculate the filter coefficients
// second order low pass butterworth filter

void calculate_coeff(float sampleRate, float cutFreq)
{
	// Initialise any previous state (clearing buffers etc.)
	// to prepare for calls to render()
	double f = 2*M_PI*cutFreq/sampleRate;
	double denom = 4+2*sqrt(2)*f+f*f;
	gCoeffB0 = f*f/denom;
	gCoeffB1 = 2*gCoeffB0;
	gCoeffB2 = gCoeffB0;
	gCoeffA1 = (2*f*f-8)/denom;
	gCoeffA2 = (f*f+4-2*sqrt(2)*f)/denom;
}

// Set up the oscillator bank
bool initialise_oscillators(float fundamental_frequency)
{
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

	for(int n = 0; n < gNumOscillators; n++) {
		// Randomise phases so they don't all line up as a high-amplitude pulse
		gPhases[n] = (float)random() / (float)RAND_MAX;

		// For efficiency, frequency is expressed in change in wavetable position per sample, not Hz or radians
		// Stretch the partials a little bit to sound more interesting and less synthetic
		gFrequencies[n] = fundamental_frequency * powf(1.0 + n, 1.002) * (float)gWavetableLength / 44100.0;

		// Oscillators start silent
		gAmplitudes[n] = 0.0;
		gDFrequencies[n] = gDAmplitudes[n] = 0.0;
	}

	gAmplitudes[3] = 0.5;

	return true;
}

// Print the current state of each of the filters
// Do this in a separate thread to avoid loading down the audio thread
void print_results(void*)
{
	if(gIsStdoutTty)
		rt_printf("\e[1;1H\e[2J");	// Command to clear the screen (on a terminal)

	/* Uncomment to print each of the sample rates in case you want to check  */
	// rt_printf("Sample Rates:\n");
	// for(unsigned int input = 0; input < gAnalogInChannels; input++) {
	//	   rt_printf("Input %d: ", input);
	//	   for(unsigned int muxChannel = 0; muxChannel < gMultiplexerChannels; muxChannel++) {
	//		   int filterIndex = input * gMultiplexerChannels + muxChannel;
	//		   double rate = gAudioSampleRate * (double)gFilterSampleCounts[filterIndex]
	//						   / (double)gAudioFramesElapsed;
	//		   rt_printf("%f ", (float)rate);
	//	   }
	//	   rt_printf("\n");
	// }

	/* Print each of the filter outputs */
	for(unsigned int input = 0; input < gAnalogInChannels; input++) {
		rt_printf("Input %d: ", input);
		for(unsigned int muxChannel = 0; muxChannel < gMultiplexerChannels; muxChannel++) {
			int filterIndex = input * gMultiplexerChannels + muxChannel;
			float sample = gFilterLastOutputs[2*filterIndex];
			rt_printf("%f ", sample);
		}
		rt_printf("\n");
	}
}

/**
\example multiplexer-spectrum/render.cpp

Display and sonify filtered signals from the multiplexer capelet
----------------------------------------------------------------

This sketch displays and sonifies the values of up to 64 analog inputs connected
by the multiplexer capelet, after lowpass filtering. The capelet is a separate
piece of hardware that attaches to the Bela cape.

This sketch demonstrates the use of frame-by-frame querying of the multiplexer
capelet. When enabled, each analog frame represents a different multiplexer
setting. This sketch checks each frame and assigns it to the correct filter.

As a demo, the amplitudes of each multiplexer input are used to control the
amplitudes of a bank of harmonically-tuned oscillators. You can hear the effect
by taking a wire connected to 5V or 3.3V, holding it in one hand while running
your finger along the (otherwise unconnected) inputs to the multiplexer capelet.
Alternatively, you can hook up each input to a separate control.

To run the sketch, the multiplexer capelet needs to be enabled using the IDE
or with the -X command line option. The multiplexer capelet requires 8 analog
inputs to work, and depending on the settings can use either 2, 4 or 8 multiplexer
channels per analog input (for a total of 16, 32 or 64 inputs).

The sample rate for each multiplexed input will be 11.025kHz (16 inputs),
5.5kHz (32 inputs) or 2.75kHz (64 inputs).
*/
