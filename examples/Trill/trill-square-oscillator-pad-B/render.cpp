 /**
 * \example Trill/trill-square-oscillator-pad-B 
 *
 * Trill Square oscillator pad 
 * ===========================
 *
 * This project showcases an example of how to communicate with the Trill Square sensor using
 * the Trill library and sonifies the X-Y position and size of the touch via a pair of
 * detuned oscillators.
 *
 * The Trill sensor is scanned on an auxiliary task running parallel to the audio thread 
 * and the X-Y position and size stored on global variables.
 *
 * The vertical position of the touch is mapped to frequency, while the horizontal position
 * maps to amplitude. Touch size is used to control the detuning (difference in frequency)
 * between the otherwise identic pair of oscillators. 
 * Changes in frequency and amplitude are smoothed using LP filters to avoid artifacts.
 *
 **/

#include <Bela.h>
#include <libraries/Trill/Trill.h>
#include <cmath>
#include <libraries/OnePole/OnePole.h>
#include <libraries/Oscillator/Oscillator.h>

// Trill object declaration
Trill touchSensor;

// Prescaler options for Trill sensor
int gPrescalerOpts[6] = {1, 2, 4, 8, 16, 32};
// Threshold options for Trill sensor
int gThresholdOpts[7] = {0, 10, 20, 30, 40, 50, 60};

// Horizontal and vertical position for Trill sensor
float gTouchPosition[2] = { 0.0 , 0.0 };
// Touch size
float gTouchSize = 0.0;
// Touch range on which the re-mapping will be done
// // Touch range on which the re-mapping will be done
int gTouchSizeRange[2] = { 500, 6000 };

// Oscillators object declaration
Oscillator osc[2];

// Range for oscillator frequency mapping
float gFreqRange[2] = { 200.0, 1500.0 };
// Range for oscillator amplitude mapping
float gAmplitudeRange[2] = { 0.0, 1.0 } ;
// Range for oscillator detuning mapping
float gDetuneRange[2] = { 0.0, 50.0 };

// One Pole filters objects declaration
OnePole freqFilt, ampFilt;

// Sleep time for auxiliary task
int gTaskSleepTime = 5000;

/*
 * Function to be run on an auxiliary task that reads data from the Trill sensor.
 * Here, a loop is defined so that the task runs recurrently for as long as the 
 * audio thread is running.
 */
void loop(void*)
{
	// loop
	while(!gShouldStop)
	{
		// Read locations from Trill sensor
		touchSensor.readLocations(); 

		/*
		 * The Trill Square sensor can detect multiple touches but will not be
		 * able to clearly differentiate their locations. 
		 * The sensor should be used for 1-touch detections but, just in the case
		 * there is a multitouch event, we will average the position and size to 
		 * obtain a single touch behaviour.
		 */
		int avgLocation = 0;
		int avgSize = 0;
		int numTouches = 0;
		// Calculate vertical position and size and map to a 0-1 range
		for(int i = 0; i < touchSensor.numberOfTouches(); i++) {
			if(touchSensor.touchLocation(i) != 0) {
				avgLocation += touchSensor.touchLocation(i);
				avgSize += touchSensor.touchSize(i);
			numTouches += 1;
			}
		}
		avgLocation = floor(1.0f * avgLocation / numTouches);
		avgSize = floor(1.0f * avgSize / numTouches);
		gTouchSize = map(avgSize, gTouchSizeRange[0], gTouchSizeRange[1], 0, 1);
		gTouchSize = constrain(gTouchSize, 0, 1);
		gTouchPosition[1] = map(avgLocation, 0, 1792, 0, 1);
		gTouchPosition[1] = constrain(gTouchPosition[1], 0, 1);

		int avgHorizontalLocation = 0;
		int numHorizontalTouches = 0;
		// Calculate horizontal position and map to a 0-1 range
		for(int i = 0; i < touchSensor.numberOfHorizontalTouches(); i++) {
			if(touchSensor.touchHorizontalLocation(i) != 0) {
				avgHorizontalLocation += touchSensor.touchHorizontalLocation(i);
				numHorizontalTouches += 1;
			}
		}
		avgHorizontalLocation = floor(1.0f * avgHorizontalLocation / numHorizontalTouches);
		
		gTouchPosition[0] = map(avgHorizontalLocation, 0, 1792, 0, 1);
		gTouchPosition[0] = constrain(gTouchPosition[0], 0, 1);

		// Sleep for ... milliseconds
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	if(touchSensor.setup(1, 0x18, Trill::NORMAL, gThresholdOpts[6], gPrescalerOpts[0]) != 0) {
		fprintf(stderr, "Unable to initialise touch sensor\n");
		return false;
	}

	touchSensor.printDetails();

	if(touchSensor.deviceType() != Trill::TWOD) {
		fprintf(stderr, "This example is supposed to work only with the Trill SQUARE. \n You may have to adapt it to make it work with other Trill devices.\n");
		return false;
	}

	Bela_scheduleAuxiliaryTask(Bela_createAuxiliaryTask(loop, 50, "I2C-read", NULL));	
		
	// Setup low pass filters for smoothing frequency and amplitude
	freqFilt.setup(1, context->audioSampleRate); // Cut-off frequency = 1Hz
	ampFilt.setup(1, context->audioSampleRate); // Cut-off frequency = 1Hz
	
	osc[0].setup(gFreqRange[0], context->audioSampleRate, Oscillator::square);
	osc[1].setup(gFreqRange[0], context->audioSampleRate, Oscillator::square);

	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
	
		float frequency;
		// Map Y-axis to a frequency range	
		frequency = map(gTouchPosition[1], 0, 1, gFreqRange[0], gFreqRange[1]);
		// Smooth frequency using low-pass filter
		frequency = freqFilt.process(frequency);
		// Map touch size to a frequency detuning range
		float detuning;
		detuning = map(gTouchSize, 0, 1, gDetuneRange[0], gDetuneRange[1]);
		// Set frequency of both oscillators, taking into account the detuning		
		osc[0].setFrequency(frequency);
		osc[1].setFrequency(frequency+ detuning);

		// Smooth changes in the amplitude of the oscillator (mapped to X-axis)
		// using a low-pass filter
		float amplitude = ampFilt.process(gTouchPosition[0]);
		// Calculate output of both oscillators and sum	
		float out = amplitude * 0.5 * (osc[0].process() + osc[1].process());
		
		// Write to output channels 
		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			audioWrite(context, n, channel, .2f * out);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{
	touchSensor.cleanup();
}
