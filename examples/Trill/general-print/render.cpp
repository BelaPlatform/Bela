/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Trill/general-print/render.cpp

Trill Print Raw Values
======================

This example will work with all types of Trill sensor and will print the raw
reading from each pad.

We are using the Trill library to read from the sensor.
The first thing to do is make sure that the correct sensor type is
given to `touchSensor.setup()`. If you have changed the address of the sensor
then you will need to add the new address that to this function too.

The Trill sensor is scanned on an auxiliary task running parallel to the audio thread
and is read in DIFF mode giving the differential reading of each pad on the sensor.

Once you run the project you will see the value of each capacitive pad on the sensor
being printed. This is a good project to run to debug your sensors and make sure they
are connected correctly.
*/

#include <Bela.h>
#include <libraries/Trill/Trill.h>

Trill touchSensor;

// Interval for reading from the sensor
int gPrintInterval = 500; //ms
int gPrintIntervalSamples = 0;
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
	// Look for a connected Trill on I2C bus 1
	if(touchSensor.setup(1) != 0) {
		return false;
	}
	// ensure the device is in DIFF mode for printing raw values
	touchSensor.setMode(Trill::DIFF);
	touchSensor.printDetails();

	Bela_runAuxiliaryTask(loop);

	gPrintIntervalSamples = context->audioSampleRate*(gPrintInterval/1000.0);
	return true;
}

void render(BelaContext *context, void *userData)
{
	static int readCount = 0;
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		if(readCount >= gPrintIntervalSamples) {
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
