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

int gRawRange[2] = {0, 0};

int bitResolution = 12;

void loop(void*)
{
	DataBuffer& buffer = gui.getDataBuffer(0);
	int oldBuffer[2] = {0, 0};
	while(!gShouldStop)
	{
		touchSensor.readI2C();
		for(unsigned int i = 0; i < sizeof(touchSensor.rawData)/sizeof(int); i++) {
			// printf("%5d ", touchSensor.rawData[i]);
		}
		printf("\n");

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

	// Setup buffer of integers (holding a maximum of 2 values)
	gui.setBuffer('d', 2); // buffer index == 0

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
