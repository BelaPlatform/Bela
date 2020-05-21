/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io

\example Trill/general-print

Trill Print Raw Values
======================

This example will work with all types of Trill sensor and will print the raw
reading from each pad.

We are using the Trill library to read from the sensor. The first thing to do
is make sure that the correct address is given to `touchSensor.setup();`.
Every different type of Trill sensor has different address which you
can see in the below table:

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

Once you run the project you will see the value of each capacitive pad on the sensor
being printed. This is a good project to run to debug your sensors and make sure they
are connected correctly.
*/

#include <Bela.h>
#include <libraries/Trill/Trill.h>

Trill touchSensor;

AuxiliaryTask readI2cTask;

// Interval for reading from the sensor
int readInterval = 500; //ms
int readIntervalSamples = 0;
// Sleep time for auxiliary task
unsigned int gTaskSleepTime = 12000; // microseconds

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
	if(touchSensor.setup(1, Trill::CRAFT) != 0) {
		fprintf(stderr, "Unable to initialise touch sensor\n");
		return false;
	}

	readI2cTask = Bela_createAuxiliaryTask(loop, 50, "I2C-read", NULL);
	Bela_scheduleAuxiliaryTask(readI2cTask);

	readIntervalSamples = context->audioSampleRate*(readInterval/1000.0);
	return true;
}

void render(BelaContext *context, void *userData)
{
	static int readCount = 0;
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		if(readCount >= readIntervalSamples) {
			readCount = 0;
			for(unsigned int i = 0; i < touchSensor.getNumChannels(); i++)
				rt_printf("%1.3f ", touchSensor.rawData[i]);
			rt_printf("\n");
		}
		readCount++;
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
