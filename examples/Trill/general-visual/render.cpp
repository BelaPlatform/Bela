/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io

\example Trill/general-visual

Trill Visualiser
================

This example will work with all types of Trill sensor and will visualise the raw
reading from each pad.

We are using the Trill library to read from the sensor and the Gui library for
the visualisation. The first thing to do is make sure that the correct sensor type is
given to `touchSensor.setup()`. If you have changed the address of the sensor
then you will need to add the new address to this function too.

The Trill sensor is scanned on an auxiliary task running parallel to the audio thread
and is read in DIFF mode giving the differential reading of each pad on the sensor.

Readings are sent to the integrated p5.js GUI every few milliseconds.

Once you run the project you will be able to visualise the value of each capacitive pad
on the sensor by clicking the GUI button in the IDE. Each bar represents a pad on the sensor.
*/

#include <Bela.h>
#include <libraries/Trill/Trill.h>
#include <libraries/Gui/Gui.h>

// Trill objet declaration
Trill touchSensor;

// Gui object declaration
Gui gui;

// Sleep time for auxiliary task
unsigned int gTaskSleepTime = 12000; // microseconds

// Time period (in seconds) after which data will be sent to the GUI
float gTimePeriod = 0.015;

void loop(void*)
{
	while(!Bela_stopRequested()) {
		touchSensor.readI2C();
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	// Setup a Trill Craft on i2c bus 1, using the default address.
	// Set it to differential mode for bargraph display
	if(touchSensor.setup(1, Trill::CRAFT, Trill::DIFF) != 0) {
		fprintf(stderr, "Unable to initialise Trill Craft\n");
		return false;
	}

	Bela_runAuxiliaryTask(loop);
	gui.setup(context->projectName);

	return true;
}

void render(BelaContext *context, void *userData)
{
	static unsigned int count = 0;
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		// Send raw data to the GUI after some time has elapsed
		if(count >= gTimePeriod*context->audioSampleRate)
		{
			gui.sendBuffer(0, touchSensor.getNumChannels());
			gui.sendBuffer(1, touchSensor.rawData);
			count = 0;
		}
		count++;
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
