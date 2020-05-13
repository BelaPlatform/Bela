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
int gTaskSleepTime = 5000; // microseconds

// Time period (in seconds) after which data will be sent to the GUI
float gTimePeriod = 0.015;

int gRawRange[2] = {0, 0};

int bitResolution = 12;

void loop(void*)
{
	while(!gShouldStop)
	{
		touchSensor.readI2C();
		for(unsigned int i = 0; i < sizeof(touchSensor.rawData)/sizeof(int); i++) {
			// printf("%5d ", touchSensor.rawData[i]);
		}
		printf("\n");
		usleep(50000);
	}
}

bool setup(BelaContext *context, void *userData)
{
	if(touchSensor.setup(1, 0x20, Trill::DIFF) != 0) { // default for Trill Craft
		fprintf(stderr, "Unable to initialise touch sensor\n");
		return false;
	}

	int newSpeed = Trill::speedValues[0];
	if(touchSensor.setScanSettings(newSpeed, bitResolution) == 0) {
		fprintf(stderr, "Scan speed set to %d.\n", newSpeed);
	} else {
		return false;
	}

	int newPrescaler = Trill::prescalerValues[1];
	if(touchSensor.setPrescaler(newPrescaler) == 0) {
		fprintf(stderr, "Prescaler set to %d.\n", newPrescaler);
	} else {
		return false;
	}

	int newThreshold = Trill::thresholdValues[1];
	if(touchSensor.setNoiseThreshold(newThreshold) == 0) {
		fprintf(stderr, "Threshold set to %d.\n", newThreshold);
	} else {
		return false;
	}

	if(touchSensor.updateBaseLine() != 0)
		return false;

	Bela_scheduleAuxiliaryTask(Bela_createAuxiliaryTask(loop, 50, "I2C-read", NULL));

	gui.setup(context->projectName);

	// Setup buffer of floats (holding a maximum of 2 values)
	gui.setBuffer('d', 2); // Index = 0

	return true;
}

void render(BelaContext *context, void *userData)
{
	static unsigned int count = 0;

	// Get buffer 0
	DataBuffer& buffer = gui.getDataBuffer(0);
	// Retrieve contents of the buffer as ints
	int* data = buffer.getAsInt();
	// data[0] is prescalar
	// touchSensor.setPrescaler(data[1]);
	// data[1] is noise threshold
	// touchSensor.setNoiseThreshold(data[1]);

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
	touchSensor.cleanup();
}
