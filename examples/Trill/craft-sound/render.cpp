/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io

\example Trill/craft-sound

Trill Craft Oscillator Bank
===========================

This project sonifies the readings from the different channels of Trill craft
using a bank of oscillators.

The Trill sensor is scanned on an auxiliary task running parallel to the audio thread
and stored in a global variable.

The reading from each channel on Trill craft are used to control the amplitudes of a
bank of harmonically-tuned oscillators. You can hear the effect by running your
finger across each pad of the sensor.
*/

#include <Bela.h>
#include <libraries/Trill/Trill.h>
#include <libraries/Biquad/Biquad.h>
#include <vector>
#include <cstring>
#include <cmath>

#define NUM_SENSORS 30

// Oscillator bank info -- for passing across threads
int gNumOscillators;
int gWavetableLength = 1024;

float *gWavetable;		// Buffer holding the precalculated sine lookup table
float *gPhases;			// Buffer holding the phase of each oscillator
float *gFrequencies;	// Buffer holding the frequencies of each oscillator
float *gAmplitudes;		// Buffer holding the amplitudes of each oscillator
float *gDFrequencies;	// Buffer holding the derivatives of frequency
float *gDAmplitudes;	// Buffer holding the derivatives of amplitude

bool initialise_oscillators(float fundamental_frequency);

extern "C" {
	// Function prototype for ARM assembly implementation of oscillator bank
	void oscillator_bank_neon(int numAudioFrames, float *audioOut,
							  int activePartialNum, int lookupTableSize,
							  float *phases, float *frequencies, float *amplitudes,
							  float *freqDerivatives, float *ampDerivatives,
							  float *lookupTable);
}

// Trill object declaration
Trill touchSensor;
std::vector<Biquad> filters;

// Readings for all the different pads on the Trill Craft
float gSensorReading[NUM_SENSORS] = { 0.0 };

// Sleep time for auxiliary task
unsigned int gTaskSleepTime = 12000; // microseconds

/*
 * Function to be run on an auxiliary task that reads data from the Trill sensor.
 * Here, a loop is defined so that the task runs recurrently for as long as the
 * audio thread is running.
 */
void loop(void*)
{
	// loop
	while(!Bela_stopRequested())
	{
		// Read raw data from sensor
		touchSensor.readI2C();
		for(unsigned int i = 0; i < NUM_SENSORS; i++)
			gSensorReading[i] = touchSensor.rawData[i];
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	if(context->audioOutChannels != 2) {
		rt_printf("Error: this example needs stereo audio enabled\n");
		return false;
	}

	// Setup a Trill Craft sensor on i2c bus 1, using the default mode and address
	if(touchSensor.setup(1, Trill::CRAFT) != 0) {
		fprintf(stderr, "Unable to initialise Trill Craft\n");
		return false;
	}

	touchSensor.printDetails();

	// Set and schedule auxiliary task for readin sensor data from the I2C bus
	Bela_runAuxiliaryTask(loop);

	filters.resize(NUM_SENSORS, {50, context->audioSampleRate, Biquad::lowpass});
	// Initiliase the oscillator bank in a harmonic series, one for each input
	gNumOscillators = NUM_SENSORS;
	if(!initialise_oscillators(55.0))
		return false;

	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->analogFrames; n++) {
		for(unsigned int i = 0; i < NUM_SENSORS; i++) {
			// Get sensor reading
			float input = gSensorReading[i];

			float output = filters[i].process(input);
			// Use output to control oscillator amplitude (with some headroom)
			// Square it to de-emphasise low but nonzero values
			gAmplitudes[i] = output * output / 4.f;
		}
	}

	// Render oscillator bank:

	// Initialise buffer to 0
	memset(context->audioOut, 0,
		context->audioOutChannels * context->audioFrames * sizeof(float));

	// Render audio frames
	oscillator_bank_neon(context->audioFrames * 2, context->audioOut,
			gNumOscillators, gWavetableLength,
			gPhases, gFrequencies, gAmplitudes,
			gDFrequencies, gDAmplitudes,
			gWavetable);
}

void cleanup(BelaContext *context, void *userData)
{
	free(gWavetable);
	free(gPhases);
	free(gFrequencies);
	free(gAmplitudes);
	free(gDFrequencies);
	free(gDAmplitudes);
}

// Set up the oscillator bank
bool initialise_oscillators(float fundamental_frequency)
{
	// Initialise the sine wavetable
	if(posix_memalign((void **)&gWavetable, 8, (gWavetableLength + 1) * sizeof(float))) {
		fprintf(stderr, "Error allocating wavetable\n");
		return false;
	}
	for(int n = 0; n < gWavetableLength + 1; n++)
		gWavetable[n] = sinf(2.0 * M_PI * (float)n / (float)gWavetableLength);

	// Allocate the other buffers
	if(posix_memalign((void **)&gPhases, 16, gNumOscillators * sizeof(float))) {
		fprintf(stderr, "Error allocating phase buffer\n");
		return false;
	}
	if(posix_memalign((void **)&gFrequencies, 16, gNumOscillators * sizeof(float))) {
		fprintf(stderr, "Error allocating frequency buffer\n");
		return false;
	}
	if(posix_memalign((void **)&gAmplitudes, 16, gNumOscillators * sizeof(float))) {
		fprintf(stderr, "Error allocating amplitude buffer\n");
		return false;
	}
	if(posix_memalign((void **)&gDFrequencies, 16, gNumOscillators * sizeof(float))) {
		fprintf(stderr, "Error allocating frequency derivative buffer\n");
		return false;
	}
	if(posix_memalign((void **)&gDAmplitudes, 16, gNumOscillators * sizeof(float))) {
		fprintf(stderr, "Error allocating amplitude derivative buffer\n");
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

	return true;
}
