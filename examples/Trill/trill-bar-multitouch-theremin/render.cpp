/**
* \example Trill/trill-bar-multitouch-theremin
*
* Trill Bar Multitouch Theremin
* =============================
*
* This example shows how to communicate with the Trill Bar sensor using
* the Trill library. Each touch on the sensor controls the pitch and volume of an oscillator.
*
* The Trill sensor is scanned on an auxiliary task running parallel to the audio thread
* and the number of active touches, their position and size stored as global variables.
*
* Position and size for each touch are then mapped to frequency and amplitude of their
* corresponding oscillator. Changes in frequency and amplitude are smoothed using LP
* filters to avoid artifacts.
*
**/

#include <Bela.h>
#include <cmath>
#include <libraries/Trill/Trill.h>
#include <libraries/OnePole/OnePole.h>
#include <libraries/Oscillator/Oscillator.h>

#define NUM_TOUCH 5 // Number of touches on Trill sensor

// Trill object declaration
Trill touchSensor;

// Prescaler options for Trill sensor
int gPrescalerOpts[6] = {1, 2, 4, 8, 16, 32};
// Threshold options for Trill sensor
int gThresholdOpts[7] = {0, 10, 20, 30, 40, 50, 60};

// Location of touches on Trill Bar
float gTouchLocation[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Size of touches on Trill Bar
float gTouchSize[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Number of active touches
int gNumActiveTouches = 0;
// Touch range on which the re-mapping will be done
int gTouchSizeRange[2] = { 1500, 6000 };

// Sleep time for auxiliary task in microseconds
int gTaskSleepTime = 5000;

// One Pole filters objects declaration
OnePole freqFilt[NUM_TOUCH], ampFilt[NUM_TOUCH];
// Frequency of one pole filters
float gCutOffFreq = 5, gCutOffAmp = 15;
// Oscillators objects declaration
Oscillator osc[NUM_TOUCH];
// Range for oscillator frequency mapping
float gFreqRange[2] = { 200.0, 1500.0 };
// Range for oscillator amplitude mapping
float gAmplitudeRange[2] = { 0.0, 1.0 } ;

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
	 // Remap location and size so that they are expressed in a 0-1 range
	 for(int i = 0; i <  touchSensor.numberOfTouches(); i++) {
		 gTouchLocation[i] = map(touchSensor.touchLocation(i), 0, 3200, 0, 1);
		 gTouchLocation[i] = constrain(gTouchLocation[i], 0, 1);
		 gTouchSize[i] = map(touchSensor.touchSize(i), gTouchSizeRange[0], gTouchSizeRange[1], 0, 1);
		 gTouchSize[i] = constrain(gTouchSize[i], 0, 1);
	 }
	 gNumActiveTouches = touchSensor.numberOfTouches();
	 // For all innactive touches, set location and size to 0
	 for(int i = gNumActiveTouches; i <  NUM_TOUCH; i++) {
		 gTouchLocation[i] = 0.0;
		 gTouchSize[i] = 0.0;
	 }

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

 // Exit render if sensor is not a Trill Bar
 if(touchSensor.deviceType() != Trill::ONED) {
	 fprintf(stderr, "This example is supposed to work only with the Trill BAR. \n You may have to adapt it to make it work with other Trill devices.\n");
	 return false;
 }

 // Set and schedule auxiliary task for reading sensor data from the I2C bus
 Bela_scheduleAuxiliaryTask(Bela_createAuxiliaryTask(loop, 50, "I2C-read", NULL));

 // For each possible touch...
 for(unsigned int i = 0; i < NUM_TOUCH; i++) {
	 // Setup corresponding oscillator
	 osc[i].setup(gFreqRange[0], context->audioSampleRate, Oscillator::sine);
	 // Setup low pass filters for smoothing frequency and amplitude
	 freqFilt[i].setup(gCutOffFreq, context->audioSampleRate);
	 ampFilt[i].setup(gCutOffAmp, context->audioSampleRate);
 }

 return true;
}

void render(BelaContext *context, void *userData)
{
 for(unsigned int n = 0; n < context->audioFrames; n++) {

	 float out = 0.0;

	 /* For each touch:
		*
		* 	- Map touch location to frequency of the oscillator
		* 	and smooth value changes using a single pole LP filter
		* 	- Map touch size toa amplitude of the oscillator and
		* 	smooth value changes using a single pole LP filter
		* 	- Compute oscillator value and add to output.
		* 	- The overall output will be scaled by the number of touches.
		*/
	 for(unsigned int i = 0; i < NUM_TOUCH; i++) {
		 float frequency, amplitude;
		 frequency = map(gTouchLocation[i], 0, 1, gFreqRange[0], gFreqRange[1]);
		 // Uncomment the line below to apply a filter to the frequency of the oscillators
		 // frequency = freqFilt[i].process(frequency);
		 osc[i].setFrequency(frequency);

		 amplitude = map(gTouchSize[i], 0, 1, gAmplitudeRange[0], gAmplitudeRange[1]);
		 amplitude = ampFilt[i].process(amplitude);

		 out += (1.f/NUM_TOUCH) * amplitude * osc[i].process();
	 }
	 // Write computed output to audio channels
	 for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
		 audioWrite(context, n, channel, out);
	 }

 }
}

void cleanup(BelaContext *context, void *userData)
{

}
// 
