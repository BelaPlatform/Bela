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
This only applies to `DIFF` mode and is an integer that can be anything within
the 12-bit range (0-4095). Typical values would be between 10 and 100.

The `prescalar` setting equates to the sensitivity of the sensor. Technically, this
value is a divider for the clock on the cypress chip and so it decides how long the
chip charges the connected material for before taking a reading. The recommended
values for the prescaler are `1, 2, 4, 8, 16, 32`.

The rule of thumb when adjusting these values is:
- A higher value prescaler (i.e. longer charging time as it is a divider of the clock)
  is better for more resistive materials and larger pads.
- A lower value prescaler is better for proximity sensing.

When connecting different materials to Trill Craft we recommend experimenting with
the settings using the `raw-readings-visual` example. This example allows you to
experiment with different settings from within the GUI which you can then hard code
in your project once you're happy.
*/

#include <Bela.h>
#include <libraries/Trill/Trill.h>
#include <libraries/Gui/Gui.h>

Trill touchSensor;

// Gui object declaration
Gui gui;

// Interval for reading from the sensor
int readInterval = 500; //ms
int readIntervalSamples = 0;
// Sleep time for auxiliary task
unsigned int gTaskSleepTime = 12000; // microseconds

// Time period (in seconds) after which data will be sent to the GUI
float gTimePeriod = 0.015;

int gRawRange[2] = {0, 200};

int bitResolution = 12;

int gButtonValue = 0;


void loop(void*)
{
	DataBuffer& buffer = gui.getDataBuffer(0);
	int oldBuffer[3] = {0, 0, 0};
	while(!gShouldStop)
	{
		touchSensor.readI2C();

		// Retrieve contents of the buffer as ints
		int* data = buffer.getAsInt();
		if(data[0] != oldBuffer[0]) {
			oldBuffer[0] = data[0];
			printf("setting prescaler to %d\n", data[0]);
			touchSensor.setPrescaler(data[0]);
		}
		if(data[1] != oldBuffer[1]) {
			oldBuffer[1] = data[1];
			printf("setting noiseThreshold to %d\n", data[1]);
			touchSensor.setNoiseThreshold(data[1]);
		}
		if(data[2] != oldBuffer[2]) {
			oldBuffer[2] = data[2];
			printf("reset baseline\n");
			touchSensor.updateBaseLine();
			gRawRange[1] = 200;
		}

		usleep(50000);
	}
}

bool setup(BelaContext *context, void *userData)
{
	if(touchSensor.setup(1, 0x30, Trill::DIFF) != 0) { // default for Trill Craft
		fprintf(stderr, "Unable to initialise touch sensor\n");
		return false;
	}

	int newSpeed = Trill::speedValues[0];
	if(touchSensor.setScanSettings(newSpeed, bitResolution) == 0) {
		printf("Scan speed set to %d.\n", newSpeed);
	} else {
		fprintf(stderr, "Unable to set scan setting\n");
		return false;
	}

	int newPrescaler = Trill::prescalerValues[1];
	if(touchSensor.setPrescaler(newPrescaler) == 0) {
		printf("Prescaler set to %d.\n", newPrescaler);
	} else {
		fprintf(stderr, "Unable to set prescaler\n");
		return false;
	}

	int newThreshold = Trill::thresholdValues[1];
	if(touchSensor.setNoiseThreshold(newThreshold) == 0) {
		printf("Threshold set to %d.\n", newThreshold);
	} else {
		fprintf(stderr, "Unable to set threshold\n");
		return false;
	}

	if(touchSensor.updateBaseLine() != 0)
		return false;

	gui.setup(context->projectName);

	// Setup buffer of integers (holding a maximum of 3 values)
	gui.setBuffer('d', 3); // buffer index == 0

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
			for(unsigned int i = 0; i < touchSensor.numSensors(); i++) {
				if(touchSensor.rawData[i] > gRawRange[1])
					gRawRange[1] = touchSensor.rawData[i];
			}
			if(touchSensor.isReady()) {
				gui.sendBuffer(0, touchSensor.numSensors());
				gui.sendBuffer(1, gRawRange);
				gui.sendBuffer(2, touchSensor.rawData);
			}
			count = 0;
		}
		count++;
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
