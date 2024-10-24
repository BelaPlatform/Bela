/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Trill/bar-led/render.cpp

Trill Bar LED
=============

This is example of how to communicate with the Trill Bar sensor using
the Trill library. It also visualises position of different touches in real time via
a series of LEDs connected to the digital outputs.

The Trill sensor is scanned on an auxiliary task running parallel to the audio thread
and the number of active touches, their position and size stored on global variables.

Twelve LEDs are used to represent positions on the Trill sensor. The length of the
Trill Bar sensor is divided into 12 different sections. When a touch
occurs on one of these sections, the corresponding LED turns on.
*/

#include <Bela.h>
#include <libraries/Trill/Trill.h>
#include <cmath>

#define NUM_TOUCH 5 // Number of touches on Trill sensor
#define NUM_LED 12 // Number of LEDs used for visualisation

// Trill object declaration
Trill touchSensor;

// Location of touches on Trill Bar
float gTouchLocation[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Size of touches on Trill bar
float gTouchSize[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Number of active touches
unsigned int gNumActiveTouches = 0;

// Sleep time for auxiliary task
unsigned int gTaskSleepTime = 12000; // microseconds
// Time period for printing
float gTimePeriod = 0.01; // seconds

// Digital pins assigned to LEDs used for visualisation
unsigned int gLedPins[NUM_LED] = { 0, 1, 2, 3, 4, 5, 8, 9, 11, 12, 13, 14 };
// Status of LEDs (1: ON, 0: OFF)
bool gLedStatus[NUM_LED] = { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 };


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
		for(unsigned int i = 0; i < gNumActiveTouches; i++)
		{
			gTouchLocation[i] = touchSensor.touchLocation(i);
			gTouchSize[i] = touchSensor.touchSize(i);
		}
		// For all inactive touches, set location and size to 0
		for(unsigned int i = gNumActiveTouches; i <  NUM_TOUCH; i++)
		{
			gTouchLocation[i] = 0.0;
			gTouchSize[i] = 0.0;
		}
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	// Setup a Trill Bar sensor on i2c bus 1, using the default mode and address
	if(touchSensor.setup(1, Trill::BAR) != 0) {
		fprintf(stderr, "Unable to initialise Trill Bar\n");
		return false;
	}

	touchSensor.printDetails();

	// Set and schedule auxiliary task for reading sensor data from the I2C bus
	Bela_runAuxiliaryTask(loop);
	// Set all digital pins corresponding to LEDs as outputs
	for(unsigned int l = 0; l < NUM_LED; l++)
		pinMode(context, 0, gLedPins[l], OUTPUT);

	return true;
}

void render(BelaContext *context, void *userData)
{
	// Active sections of the Trill BAR
	bool activeSections[NUM_LED] = { false };

	// Printing counter
	static unsigned int count = 0;

	// Each audio frame, check location of active touches and round to the the number
	// of sections on which the Trill bar has been devided.
	// Set LED status based on activations of corresponding sections.
	// Print LED status.
	for(unsigned int n = 0; n < context->audioFrames; n++) {

		for(unsigned int t = 0; t < gNumActiveTouches; t++) {
			int section = floor( NUM_LED * gTouchLocation[t] );
			activeSections[section] = activeSections[section] || 1;
		}

		for(unsigned int l = 0; l < NUM_LED; l++) {
			gLedStatus[l] = activeSections[l];
			digitalWrite(context, n, gLedPins[l], gLedStatus[l]);
		}

		if(count >= gTimePeriod*context->audioSampleRate)
		{
			for(unsigned int l = 0; l < NUM_LED; l++)
				rt_printf("%d ",gLedStatus[l]);
			rt_printf("\n");
			count = 0;
		}
		count++;
	}
}

void cleanup(BelaContext *context, void *userData)
{}
