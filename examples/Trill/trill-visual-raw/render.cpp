/**
 * \example Trill/trill-visual-raw
 *
 * Trill Visual Raw
 * ================
 *
 * New GUI fuctionality for Bela! 
 *
 * This example uses the Trill library and will work with any Trill sensor connected.
 *
 * The Trill sensor is scanned on an auxiliary task running parallel to the audio thread
 * and is read in DIFF mode giving the differential reading of each pad on the sensor.
 *
 * Readings are sent to the integrated p5 GUI every few milliseconds. 
 *
 * Once you run the project you will be able to visualise the value of each capacitive pad
 * on the sensor in the GUI.
 * 
 * A p5 sketch is included in this example that represents these values in a bar graph.
 *
 **/

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
int gTaskSleepTime = 5000; // microseconds

// Time period (in seconds) after which data will be sent to the GUI
float gTimePeriod = 0.015;

int gRawRange[2] = {0, 0};

void loop(void*)
{
	while(!gShouldStop) {
		touchSensor.readI2C();
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	// Setup a sensor on i2c 1, address 0x18 and in DIFF mode
	touchSensor.setup(1, 0x18, Trill::DIFF);

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
