/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io

\example Trill/ring-visual

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
#include <cmath>
#include <libraries/Trill/Trill.h>
#include <libraries/Gui/Gui.h>

#define NUM_TOUCH 5 // Number of touches on Trill sensor

// Gui object declaration
Gui gui;

// Trill object declaration
Trill touchSensor;

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
	while(!Bela_stopRequested())
	{
		 // Read locations from Trill sensor
		 touchSensor.readI2C();
		 gNumActiveTouches = touchSensor.getNumTouches();
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
	// Setup a Trill Ring on i2c bus 1, using the default mode and address
	if(touchSensor.setup(1, Trill::RING) != 0) {
		fprintf(stderr, "Unable to initialise Trill Ring\n");
		return false;
	}

	touchSensor.printDetails();

	// Set and schedule auxiliary task for reading sensor data from the I2C bus
	Bela_scheduleAuxiliaryTask(Bela_createAuxiliaryTask(loop, 50, "I2C-read", NULL));

	// Setup GUI
	gui.setup(context->projectName);
	return true;
}

void render(BelaContext *context, void *userData)
{
	static unsigned int count = 0;

	for(unsigned int n = 0; n < context->audioFrames; n++) {
		// Send number of touches, touch location and size to the GUI
		// after some time has elapsed.
		if(count >= gTimePeriod*context->audioSampleRate)
		{
			gui.sendBuffer(0, gNumActiveTouches);
			gui.sendBuffer(1, gTouchLocation);
			gui.sendBuffer(2, gTouchSize);

			count = 0;
		}
		count++;
	}
}

void cleanup(BelaContext *context, void *userData)
{}
