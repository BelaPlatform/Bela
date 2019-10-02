/**
 * \example Trill/trill-print-raw
 *
 * Trill Print Raw Values
 * ======================
 *
 * This example uses the Trill library and will work with any Trill sensor connected.
 *
 * The Trill sensor is scanned on an auxiliary task running parallel to the audio thread
 * and is read in DIFF mode giving the differential reading of each pad on the sensor.
 *
 * Once you run the project you will see the value of each capacitive pad on the sensor
 * being printed. This is a good project to run to debug your sensors and make sure they
 * are connected correctly.
 *
 **/

#include <Bela.h>
#include <libraries/Trill/Trill.h>

Trill touchSensor;

AuxiliaryTask readI2cTask;

// Interval for reading from the sensor
int readInterval = 500; //ms
int readIntervalSamples = 0;
// Sleep time for auxiliary task
int gTaskSleepTime = 5000; // microseconds

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
	return true;
}

void render(BelaContext *context, void *userData)
{
	static int readCount = 0;
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		if(readCount >= readIntervalSamples) {
			readCount = 0;
			if(touchSensor.isReady()) {
				for(unsigned int i = 0; i < touchSensor.numSensors(); i++)
					rt_printf("%5d ", touchSensor.rawData[i]);
				rt_printf("\n");
			}
		}
		readCount++;
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
