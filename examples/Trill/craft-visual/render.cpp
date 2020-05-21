/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io

\example Trill/craft-visual

Trill Visual Raw
================

This example visualises the reading from a Trill Craft sensor.

The Trill sensor is scanned on an auxiliary task running parallel to the audio thread
and is read in DIFF mode giving the differential reading of each pad on the sensor.

Once the project is running click the GUI button to see the reading on each channel.

From this GUI you can also adjust the setting of the Craft sensor to best suit your needs.

There are two important sensor settings that you may want to adjust when working
with the Trill Craft: the `threshold` and the `prescalar`.

The `threshold` setting is simply the threshold above which to read and is for
ignoring any noise that might be present in the lowest regions of the sensor reading.
This only applies to `DIFF` mode and is a float between 0.0 and 1.0. Typically values
would stay below 0.1.

The `prescalar` setting equates to the sensitivity of the sensor. Technically, this
value is a divider for the clock on the cypress chip and so it decides how long the
chip charges the connected material for before taking a reading. There are 8 different
settings for the prescalar.

The rule of thumb when adjusting these values is:
- A higher value prescaler (i.e. longer charging time as it is a divider of the clock)
  is better for more resistive materials and larger conductive objects connected.
- A lower value prescaler is better for proximity sensing.

When connecting different materials to Trill Craft we recommend experimenting with
the settings using this example. This example allows you to experiment with different
settings from within the GUI which you can then hard code in your project
once you're happy with the behaviour of the sensors.
*/

#include <Bela.h>
#include <libraries/Trill/Trill.h>
#include <libraries/Gui/Gui.h>

// Trill objet declaration
Trill touchSensor;

// Gui object declaration
Gui gui;

AuxiliaryTask readI2cTask;

// Interval for reading from the sensor
int readInterval = 500; //ms
int readIntervalSamples = 0;
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
	// Setup a Trill Craft on i2c bus 1, using the default mode and address
	if(touchSensor.setup(1, Trill::CRAFT)) {
		fprintf(stderr, "Unable to initialise touch sensor\n");
		return false;
	}

	readI2cTask = Bela_createAuxiliaryTask(loop, 50, "I2C-read", NULL);
	Bela_scheduleAuxiliaryTask(readI2cTask);

	readIntervalSamples = context->audioSampleRate*(readInterval/1000.0);

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
