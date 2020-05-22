/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io

\example Trill/general-settings

Adjusting Trill Settings
========================

This example will work with all types of Trill sensor and will allow you to adjust
the sensitivity and threshold settings.

We are using the Trill library to read from the sensor and the Gui library for
a visualisation. The first thing to do is make sure that the correct address is
given to `touchSensor.setup();`. Every different type of Trill sensor has different
address which you can see in the below table:

| Type:  | Address |
|--------|---------|
| BAR    |  0x20   |
| SQUARE |  0x28   |
| CRAFT  |  0x30   |
| RING   |  0x38   |
| HEX    |  0x40   |
| FLEX   |  0x48   |

The Trill sensor is scanned on an auxiliary task running parallel to the audio thread
and is read in DIFF mode giving the differential reading of each pad on the sensor.

Launch the GUI to visualise the value of each capacitive pad on the sensor.

There are two important sensor settings that you may want to adjust when working
with the Trill sensors: the `threshold` and the `prescalar`.

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

Trill touchSensor;

// Gui object declaration
Gui gui;

// Sleep time for auxiliary task
unsigned int gTaskSleepTime = 12000; // microseconds

// Time period (in seconds) after which data will be sent to the GUI
float gTimePeriod = 0.015;

int bitResolution = 12;

int gButtonValue = 0;

void loop(void*)
{
	DataBuffer& buffer = gui.getDataBuffer(0);
	float oldBuffer[5] = {0};
	int numBits;
	int speed = 0;
	while(!Bela_stopRequested())
	{
		touchSensor.readI2C();

		// Retrieve contents of the buffer as ints
		float* data = buffer.getAsFloat();
		if(data[0] != oldBuffer[0]) {
			oldBuffer[0] = data[0];
			printf("setting prescaler to %.0f\n", data[0]);
			touchSensor.setPrescaler(data[0]);
		}
		if(data[1] != oldBuffer[1]) {
			oldBuffer[1] = data[1];
			printf("setting noiseThreshold to %f\n", data[1]);
			touchSensor.setNoiseThreshold(data[1]);
		}
		if(data[2] != oldBuffer[2]) {
			oldBuffer[2] = data[2];
			printf("reset baseline\n");
			touchSensor.updateBaseLine();
		}
		if(data[3] != oldBuffer[3]) {
			numBits = oldBuffer[3] = data[3];
			printf("setting number of bits to %d\n", numBits);
			touchSensor.setScanSettings(speed, numBits);
		}
		if(data[4] != oldBuffer[4]) {
			oldBuffer[4] = data[4];
			printf("setting mode to %.0f\n", data[4]);
			touchSensor.setMode((Trill::Mode)data[4]);
		}
		usleep(50000);
	}
}

bool setup(BelaContext *context, void *userData)
{
	// Setup a Trill Craft on i2c bus 1, using the default mode and address
	if(touchSensor.setup(1, Trill::CRAFT) != 0) {
		fprintf(stderr, "Unable to initialise touch sensor\n");
		return false;
	}

	// Change sensor to differential mode for bargraph display
	touchSensor.setMode(Trill::DIFF);

	gui.setup(context->projectName);

	// Setup buffer of integers (holding a maximum of 3 values)
	gui.setBuffer('f', 5); // buffer index == 0

	Bela_scheduleAuxiliaryTask(Bela_createAuxiliaryTask(loop, 50, "I2C-read", NULL));
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
