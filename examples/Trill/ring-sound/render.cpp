 /*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io

\example Trill/ring-sound

Trill Ring – Interactive Shepard-Risset Glissando
=================================================

This example sonifies the position readings from a Trill Ring
sensor using the Trill library. It also visualises the touch position
and size of a single touche in real time on the GUI.
Click the GUI button to see the visualisation.

The position on the Ring sensor is used to control a Shepard-Risset
infinite glissando effect. This auditory illusion involves a bank of sinetones
which are tuned an octave apart whose pitch changes in unison. The pitch
changing across all of the sinetones at the same time creates an auditory
illusion of a tone that is forever increasing or decreasing in pitch.

In this example we have mapped position around the ring to pitch with
one full rotation around the Ring being mapped to an octave.
To hear the auditory illusion to its full effect try moving your finger
around the Trill Ring sensor at a steady pace.

In this file Trill sensor is scanned in an AuxiliaryTask running in parallel with the
audio thread and the horizontal and vertical position and size are stored
in global variables.

In `void loop()` there is also a very useful cycle counter which increments for
every rotation around the Ring. This is a useful bit of reusable code for working
with the Ring in general.
*/

#include <Bela.h>
#include <libraries/Scope/Scope.h>
#include <libraries/Gui/Gui.h>
#include <libraries/Trill/Trill.h>
#include <libraries/Oscillator/Oscillator.h>
#include <cmath>
#include <vector>

// *** Constants: change these to alter the sound of the Shepard-Risset effect
// How many simultaneous oscillators?
const unsigned int kNumOscillators = 8;

// Ratio between oscillators. 2.0 = octave. Try also powf(2.0, 1.0/3.0)
// together with setting kNumOscillators = 24;
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
std::vector<Oscillator> gOscillators; // Oscillator bank
std::vector<float> gLogFrequencies; // Log-scale frequencies for each oscillator
std::vector<float> gAmplitudes; // Amplitudes of each oscillator
std::vector<float> gSpectralWindow; // Window defining spectral rolloff

Scope gScope; // The Bela oscilloscope
Gui gGui; // The custom browser-based GUI
Trill touchSensor; // Trill object declaration

// Location of touch on Trill Ring
float gTouchLocation = 0;
// Size of touch on Trill Ring
float gTouchSize = 0;

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
	int wraps = 0;
	float pastRead = 0;
	while(!Bela_stopRequested())
	{
		// Read locations from Trill sensor
		touchSensor.readI2C();
		if(touchSensor.numberOfTouches())
		{
			float newRead = touchSensor.compoundTouchLocation();
			// Keep track of how many times we have gone around the sensor.
			// If we have crossed the end of the sensor...
			if(pastRead > 0.92 && newRead < 0.08) { // increment if we were going forward
				wraps++;
			} else if(newRead > 0.92 && pastRead < 0.08) { // decrement if we were going backwards
				wraps--;
			}
			// We only need to keep track of up to kNumOscillators revolutions
			wraps = (wraps + kNumOscillators) % kNumOscillators;
			gTouchLocation = newRead + wraps;
			gTouchSize = touchSensor.compoundTouchSize();
			pastRead = newRead;
			// optionally, print the current location and see how it keeps track of the revolutions around the circle
			// printf("%.3f\n", gTouchSize);
		} else {
			// if there was no touch, we keep in mind the location of the last one ...
			// ... by simply doing nothing
		}
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	// Setup a Trill Ring on i2c bus 1, using the default mode and address
	if(touchSensor.setup(1, Trill::RING) != 0) {
		fprintf(stderr, "Unable to initialise Trill Ring\n");
		return false;
	}

	touchSensor.printDetails();

	// Set and schedule auxiliary task for reading sensor data from the I2C bus
	Bela_scheduleAuxiliaryTask(Bela_createAuxiliaryTask(loop, 50, "I2C-read", NULL));

	// Initialise the oscillator bank and set its sample rate
	gOscillators.resize(kNumOscillators, Oscillator(context->audioSampleRate));
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
	// update the frequencies based on the touch location
	for(unsigned int i = 0; i < kNumOscillators; i++)
	{
		// In the space of one full rotation on the ring, the frequency should go up by the spacing between oscillators
		// (i.e. complete one cycle)
		gLogFrequencies[i] = fmodf((float)i / (float)kNumOscillators + gTouchLocation/kNumOscillators, 1);
		// Calculate the amplitude of this oscillator by finding its position in the
		// window on a normalised logarithmic frequency scale
		gAmplitudes[i] = gSpectralWindow[(int)(gLogFrequencies[i] * kSpectralWindowSize)];
	}
	// Iterate through all the samples in this block
	for(unsigned int n = 0; n < context->audioFrames; n++)
	{

		if(gUpdateCount >= kUpdateInterval)
		{
			gUpdateCount = 0;

			// Update the oscillator frequencies and amplitudes
			for(unsigned int i = 0; i < kNumOscillators; i++)
			{
				// Calculate the actual frequency from the normalised log-frequency
				float frequency = kLowestBaseFrequency * powf(2.0, gLogFrequencies[i] * kMaxFrequencyRatio);
				gOscillators[i].setFrequency(frequency);


			}
		}
		++gUpdateCount;

		float out = 0;
		// Compute the oscillator outputs every sample
		for(unsigned int i = 0; i < kNumOscillators; i++)
		{
			// Mix this oscillator into the audio output
			out += gOscillators[i].process() * gAmplitudes[i] * kAmplitude;
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
			gGui.sendBuffer(0, 1);
			gGui.sendBuffer(1, gTouchLocation);
			gGui.sendBuffer(2, gTouchSize);
		}
		++gGuiCount;
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
