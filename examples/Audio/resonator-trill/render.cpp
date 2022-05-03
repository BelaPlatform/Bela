/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Audio/resonator-trill/render.cpp

Resonator Trill
--------------


*/

#include <Bela.h>

#include <libraries/Resonators/Resonators.h>
#include <libraries/Trill/Trill.h>
#include <libraries/OnePole/OnePole.h>

#define NUM_TOUCH 5 // Number of touches on Trill sensor

// Trill object declaration
Trill touchSensor;

// Location of touches on Trill Bar
float gTouchLocation[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Size of touches on Trill bar
float gTouchSize[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Number of active touches
int gNumActiveTouches = 0;
// Touch size range on which the re-mapping will be done
int gTouchSizeRange[2] = { 1000, 7000 };


// Sleep time for auxiliary task (in ms)
int gTaskSleepTime = 100;

// Resonator object declaration
Resonator res;
ResonatorOptions options; // will initialise to default

// Frequency range for resonator
float gFreqRange[2] = {400.0, 1000.0};
// Decay range for resonator
float gDecayRange[2] = {0.05, 0.9};
// Base frequency for the resonator
float gResFreq = gFreqRange[0];
// Base decay for the resonator
float gResDecay = gDecayRange[0];
// Number of millisecons after which resonator will be updated
float gResonatorUpdateRate = 0.01;


// One Pole filter object declaration
OnePole lowpass;
// Frequency of one pole filter
float gLpCutOff = 5;

/*
* Function to be run on an auxiliary task that reads data from the Trill sensor.
* Here, a loop is defined so that the task runs recurrently for as long as the
* audio thread is running.
*/
void loop(void*)
{
	while(!Bela_stopRequested())
	{
		// Read locations from Trill sensor
		touchSensor.readI2C();
		gNumActiveTouches = touchSensor.getNumTouches();
		for(unsigned int i = 0; i < gNumActiveTouches; i++) {
			// Location:
			gTouchLocation[i] = touchSensor.touchLocation(i);
			// Size:
			gTouchSize[i] = map(touchSensor.touchSize(i), gTouchSizeRange[0], gTouchSizeRange[1], 0, 1);
			gTouchSize[i] = constrain(gTouchSize[i], 0, 1);
		}
		// For all inactive touches, set location and size to 0
		for(unsigned int i = gNumActiveTouches; i < NUM_TOUCH; i++) {
			gTouchLocation[i] = 0.0;
			gTouchSize[i] = 0.0;
		}
		usleep(gTaskSleepTime);
	}
}

bool setup (BelaContext *context, void *userData) {

	// Resonator setup
	res.setup(options, context->audioSampleRate, context->audioFrames);
	// Set resonator parameters: frequency, gain & decay
	res.setParameters(gResFreq, 0.5, gResDecay); // freq, gain, decay
	// Update resonator state
	res.update();


	// Touch sensor setup: I2C bus, address, mode, threshold, prescaler
	if(touchSensor.setup(1, Trill::BAR) != 0) {
		fprintf(stderr, "Unable to initialise Trill Bar\n");
		return false;
	}

	touchSensor.printDetails();

	// Set and schedule auxiliary task for reading sensor data from the I2C bus
	Bela_runAuxiliaryTask(loop);

	// Setup low pass filter for smoothing frequency
	lowpass.setup(gLpCutOff, context->audioSampleRate);

	return true;
}

void render (BelaContext *context, void *userData) {

	// Set sample counter
	static unsigned int count = 0;

	for (unsigned int n = 0; n < context->audioFrames; ++n) {
		// Read left audio input (piezo)
		float in = audioRead(context, n, 0);

		// If there are any active touches
		if(gNumActiveTouches > 0) {
			// Map touch location to frequency
			gResFreq =  map(gTouchLocation[0], 0, 1, gFreqRange[0], gFreqRange[1]);
			// Map touch size to decay
			gResDecay =  map(gTouchSize[0], 0, 1, gDecayRange[0], gDecayRange[1]);
		}
		// Filter frequency changes to minimise artifacts
		float freq = lowpass.process(gResFreq);

		// If enough samples have elapsed ...
		if(count > gResonatorUpdateRate * context->audioSampleRate) {
			// Set resonator parameters
			res.setParameter(Resonator::kFreq, freq);	// freq
			res.setParameter(Resonator::kGain, 0.8);	// gain
			res.setParameter(Resonator::kDecay, gResDecay);	// decay
			// Update resonator
			res.update();

			// Reset count
			count = 0;
		}
		// Increment counter
		count++;

		// Render resonator output based on piezo signal
		float  out = res.render(in);
		// Write to output channels
		for(unsigned int ch = 0; ch < context->audioOutChannels; ch++)
			audioWrite(context, n, ch, out);
	}

}

void cleanup (BelaContext *context, void *userData) { }
