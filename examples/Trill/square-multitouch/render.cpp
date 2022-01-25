/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Trill/square-multitouch/render.cpp

Trill Square Multitouch GUI
===================

This example shows how to communicate with the Trill Square
sensor using the Trill library. It visualises the X-Y position of the
touch in real time on the GUI. Unlike the simpler square-visual example,
this example displays multiple touches on the sensor. Trill Square can detect
multiple touches in each axis (X and Y), but it cannot detect which X touch belongs
with which Y touch, so the multitouch support is limited. This example displays
touches at each X-Y intersection.

In this file Trill sensor is scanned in an AuxiliaryTask running in parallel with the
audio thread and the horizontal and vertical position and size are stored
in global variables.

Click the GUI button to see the visualisation.
Touch position and size are displayed in the sketch.
*/

#include <Bela.h>
#include <cmath>
#include <libraries/Trill/Trill.h>
#include <libraries/Gui/Gui.h>

#define NUM_TOUCH 4 // Number of touches on Trill Square sensor

// Gui object declaration
Gui gui;

// Trill object declaration
Trill touchSensor;

// Location of touches on Trill Square
float gTouchVerticalLocation[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0 };
float gTouchHorizontalLocation[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0 };
// Size of touches on Trill bar
float gTouchSize[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0 };
// Number of active touches
unsigned int gNumVerticalTouches = 0;
unsigned int gNumHorizontalTouches = 0;

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
	while(!Bela_stopRequested())
	{
		// Read locations from Trill sensor
		touchSensor.readI2C();

		// The Trill Square sensor can detect multiple touches
		// in each axis, but it is not able to differentiate between
		// which X-axis touches correspond to which Y-axis touches.
		// Nonetheless, multi-touch data can be useful in some
		// circumstances and it is gathered here.

		gNumVerticalTouches = touchSensor.getNumTouches();
		gNumHorizontalTouches = touchSensor.getNumHorizontalTouches();
		if(gNumVerticalTouches > NUM_TOUCH)
			gNumVerticalTouches = NUM_TOUCH;
		if(gNumHorizontalTouches > NUM_TOUCH)
			gNumHorizontalTouches = NUM_TOUCH;

		for(unsigned int i = 0; i < gNumVerticalTouches; i++) {
			gTouchVerticalLocation[i] = touchSensor.touchLocation(i);
			gTouchSize[i] = touchSensor.touchSize(i);
		}
		for(unsigned int i = 0; i < gNumHorizontalTouches; i++) {
			gTouchHorizontalLocation[i] = touchSensor.touchHorizontalLocation(i);
		}

		// For all inactive touches, set location and size to 0
		for(unsigned int i = gNumVerticalTouches; i < NUM_TOUCH; i++) {
			gTouchVerticalLocation[i] = 0.0;
			gTouchSize[i] = 0.0;
		}
		for(unsigned int i = gNumHorizontalTouches; i < NUM_TOUCH; i++) {
			gTouchHorizontalLocation[i] = 0.0;
		}

		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	// Setup a Trill Square on i2c bus 1, using the default mode and address
	if(touchSensor.setup(1, Trill::SQUARE) != 0) {
		fprintf(stderr, "Unable to initialise Trill Square\n");
		return false;
	}

	touchSensor.printDetails();

	// Set and schedule auxiliary task for reading sensor data from the I2C bus
	Bela_runAuxiliaryTask(loop);

	// Setup GUI
	gui.setup(context->projectName);
	return true;
}

void render(BelaContext *context, void *userData)
{
	static unsigned int count = 0;
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		// Send X-Y position and size of each touch to the GUI
		// after some time has elapsed.
		if(count >= gTimePeriod*context->audioSampleRate)
		{
			gui.sendBuffer(0, gNumVerticalTouches);
			gui.sendBuffer(1, gNumHorizontalTouches);
			gui.sendBuffer(2, gTouchHorizontalLocation);
			gui.sendBuffer(3, gTouchVerticalLocation);
			gui.sendBuffer(4, gTouchSize);

			count = 0;
		}
		count ++;
	}
}

void cleanup(BelaContext *context, void *userData)
{}
