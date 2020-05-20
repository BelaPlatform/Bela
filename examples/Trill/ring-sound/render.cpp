/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io

\example Trill/ring-sound

Trill Ring GUI
==============

This example shows how to communicate with the Trill Ring
sensor using the Trill library. It visualises the touch position and size
of up to five touches in real time on the GUI.

In this file Trill sensor is scanned in an AuxiliaryTask running in parallel with the
audio thread and the horizontal and vertical position and size are stored
in global variables.

Click the GUI button to see the visualisation.
Touch position and size are displayed in the sketch.
*/

#include <Bela.h>
#include <libraries/Scope/Scope.h>
#include <libraries/Gui/Gui.h>
#include <libraries/Trill/Trill.h>
#include <cmath>
#include <vector>
#include "Sine.h"

#define NUM_TOUCH 5 // Number of touches on Trill sensor

// *** Constants: change these to alter the sound of the Shepard-Risset effect
// How many simultaneous oscillators?
const unsigned int kNumOscillators = 8;

// Ratio between oscillators. 2.0 = octave. Try also powf(2.0, 1.0/3.0)
const float kFrequencyRatio = 2.0;

// Starting frequency of the lowest oscillator
// The highest frequency will be L*2^N where L is the lowest frequency and N is the number of oscillators
// Make sure the highest frequency is less than the Nyquist rate (22050Hz in this case)
const float kLowestBaseFrequency = 30.0;

// Size of the window that provides spectral rolloff
const unsigned int kSpectralWindowSize = 1024;

// Amplitude normalisation to avoid clipping. Adjust depending on kNumOscillators.
const float kAmplitude = 0.1;

// This value is pre-calculated for efficiency in render(). Don't change it,
// change the values above.
const float kMaxFrequencyRatio = log(powf(kFrequencyRatio, kNumOscillators)) / log(2.0);

// How often to update the oscillator frequencies
// Don't do this every sample as it's inefficient and will run into
// numerical precision issues
const unsigned int kUpdateInterval = 64;
unsigned int gUpdateCount = 0; // counting samples to update the oscillators

// Time period to send to the GUI in seconds
const float kGuiTimePeriod = 1.0 / 25.0;
unsigned int gGuiCount = 0; // counting samples to update the GUI

// *** Global variables: these keep track of the current state of the
std::vector<Sine> gOscillators; // Oscillator bank
std::vector<float> gLogFrequencies; // Log-scale frequencies for each oscillator
std::vector<float> gAmplitudes; // Amplitudes of each oscillator
std::vector<float> gSpectralWindow; // Window defining spectral rolloff

Scope gScope; // The Bela oscilloscope
Gui gGui; // The custom browser-based GUI
Trill touchSensor; // Trill object declaration

// Location of touches on Trill Ring
float gTouchLocation[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Size of touches on Trill Ring
float gTouchSize[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Number of active touches
unsigned int gNumActiveTouches = 0;

// Sleep time for auxiliary task
unsigned int gTaskSleepTime = 12000; // microseconds
// Time period (in seconds) after which data will be sent to the GUI
float gTimePeriod = 0.015;

/*
* Function to be run on an auxiliary task that reads data from the Trill sensor.
* Here, a loop is defined so that the task runs recurrently for as long as the
* audio thread is running.
*/
void loop(void*)
{
	while(!gShouldStop)
	{
		 // Read locations from Trill sensor
		 touchSensor.readLocations();
		 gNumActiveTouches = touchSensor.numberOfTouches();
		 for(unsigned int i = 0; i < gNumActiveTouches; i++) {
			 gTouchLocation[i] = touchSensor.touchLocation(i);
			 gTouchSize[i] = touchSensor.touchSize(i);
		 }
		 // For all inactive touches, set location and size to 0
		 for(unsigned int i = gNumActiveTouches; i < NUM_TOUCH; i++) {
			 gTouchLocation[i] = 0.0;
			 gTouchSize[i] = 0.0;
		 }
		 usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	if(touchSensor.setup(1, 0x38, Trill::CENTROID) != 0) {
		fprintf(stderr, "Unable to initialise touch sensor\n");
		return false;
	}

	touchSensor.printDetails();

	// Exit program if sensor is not a Trill Ring
	if(touchSensor.deviceType() != Trill::RING) {
		fprintf(stderr, "This example is supposed to work only with the Trill Ring. \n You may have to adapt it to make it work with other Trill devices.\n");
		return false;
	}

	// Set and schedule auxiliary task for reading sensor data from the I2C bus
	Bela_scheduleAuxiliaryTask(Bela_createAuxiliaryTask(loop, 50, "I2C-read", NULL));

	// Initialise the oscillator bank and set its sample rate
	gOscillators.resize(kNumOscillators);
	for(unsigned int i = 0; i < kNumOscillators; i++)
	{
		gOscillators[i].setup(context->audioSampleRate);
	}

	// Initialise arrays of log-frequencies and set them to
	// span a range from 0 to 1. This will be used to look up
	// the amplitude from the spectral window and also to calculate
	// the actual frequency of that oscillator
	gLogFrequencies.resize(kNumOscillators);
	for(unsigned int i = 0; i < kNumOscillators; i++)
	{
		gLogFrequencies[i] = (float)i / (float)kNumOscillators;
	}

	// Initialise array of amplitudes for each oscillator. These will be updated
	// when the frequencies change.
	gAmplitudes.resize(kNumOscillators);
	for(unsigned int i = 0; i < kNumOscillators; i++)
	{
		gAmplitudes[i] = 0;
	}

	// Initialise a Hann window for spectral rolloff. This makes the lowest and highest
	// frequencies fade out smoothly, improving the realism of the effect.
	gSpectralWindow.resize(kSpectralWindowSize);
	for(unsigned int n = 0; n < kSpectralWindowSize; n++)
	{
		gSpectralWindow[n] = 0.5f * (1.0f - cosf(2.0 * M_PI * n / (float)(kSpectralWindowSize - 1)));
	}


	// Initialise the Bela oscilloscope with 1 channel
	gScope.setup(1, context->audioSampleRate);

	// Initialise the p5.js GUI. By default, the Bela GUI runs on port 5555 and address 'gui'
	gGui.setup(context->projectName);

	// Setup buffer of floats (holding a maximum of 2 values)
	gGui.setBuffer('f', 3); // Index = 0

	return true;
}

void render(BelaContext *context, void *userData)
{
	// Get buffer from the p5.js GUI
	DataBuffer& buffer = gGui.getDataBuffer(0);

	// Retrieve contents of the buffer as floats
	float* data = buffer.getAsFloat();

	// How long (in seconds) to complete one cycle, i.e. an increase by kFrequencyRatio
	// The effect is better when this is longer
	// Map Y-axis (2nd element in the buffer) to cycle time
	// Logarithmic mapping between 0.1 and 20.0
	float cycleTime = powf(10.0, map(data[1], 0.0, 1.0, log(2.0), -1.0));

	// Amount to update the frequency by on a normalised 0-1 scale
	// Controls how fast the glissando moves
	// In the time span of cycleTime, the frequency should go up to the spacing between oscillators
	// (i.e. complete one cycle) -- so it traverses a span of (1.0 / kNumOscillators) over cycleTime seconds
	float logFrequencyIncrement = (float)kUpdateInterval / (kNumOscillators * cycleTime * context->audioSampleRate);

	// Iterate through all the samples in this block
	for(unsigned int n = 0; n < context->audioFrames; n++)
	{
		float out = 0;

		if(gUpdateCount >= kUpdateInterval)
		{
			gUpdateCount = 0;

			// Update the oscillator frequencies and amplitudes
			for(unsigned int i = 0; i < kNumOscillators; i++)
			{
				// Calculate the actual frequency from the normalised log-frequency
				float frequency = kLowestBaseFrequency * powf(2.0, gLogFrequencies[i] * kMaxFrequencyRatio);
				gOscillators[i].setFrequency(frequency);

				// Calculate the amplitude of this oscillator by finding its position in the
				// window on a normalised logarithmic frequency scale
				gAmplitudes[i] = gSpectralWindow[(int)(gLogFrequencies[i] * kSpectralWindowSize)];

				// Update the frequency of this oscillator and wrap around if it falls
				// off the end of the range
				gLogFrequencies[i] += logFrequencyIncrement;
				if(gLogFrequencies[i] >= 1.0) {
					// Recalculate all the other oscillator frequencies as a function of this one
					// to prevent numerical precision errors from accumulating
					unsigned int osc = i;
					for(unsigned int k = 0; k < kNumOscillators; k++)
					{
						gLogFrequencies[osc] = (float)k / (float)kNumOscillators;
						osc++;
						if(osc >= kNumOscillators)
							osc = 0;
					}
				}
				if(gLogFrequencies[i] < 0.0)
					gLogFrequencies[i] += 1.0;
			}
		}
		++gUpdateCount;

		// Compute the oscillator outputs every sample
		for(unsigned int i = 0; i < kNumOscillators; i++)
		{
			// Mix this oscillator into the audio output
			out += gOscillators[i].nextSample() * gAmplitudes[i] * kAmplitude;
		}

		// Write the output to all the audio channels
		for(unsigned int ch = 0; ch < context->audioOutChannels; ch++)
		{
			audioWrite(context, n, ch, out);
		}

		// Log the output to the oscilloscope
		gScope.log(out);

		// Send data to the GUI at regular intervals
		if (gGuiCount >= kGuiTimePeriod * context->audioSampleRate)
		{
			gGuiCount = 0;

			// Send data to GUI
			gGui.sendBuffer(0, gNumActiveTouches);
			gGui.sendBuffer(1, gTouchLocation);
			gGui.sendBuffer(2, gTouchSize);
		}
		++gGuiCount;
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
