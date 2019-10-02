#include <Bela.h>
#include <libraries/Trill/Trill.h>

Trill touchSensor;

int speedOpts[4] = {0, 1, 2, 3};
int prescalerOpts[6] = {1, 2, 4, 8, 16, 32};
int thresholdOpts[7] = {0, 10, 20, 30, 40, 50, 60};
int bitResolution = 12;

void loop(void*)
{
	while(!gShouldStop)
	{
		touchSensor.readI2C();
		for(unsigned int i = 0; i < sizeof(touchSensor.rawData)/sizeof(int); i++) {
			printf("%5d ", touchSensor.rawData[i]);
		}
		printf("\n");
		usleep(50000);
	}
}

bool setup(BelaContext *context, void *userData)
{
	if(touchSensor.setup() != 0) {
		fprintf(stderr, "Unable to initialise touch sensor\n");
		return false;
	}

	int newSpeed = speedOpts[0];
	if(touchSensor.setScanSettings(newSpeed) == 0) {
		fprintf(stderr, "Scan speed set to %d.\n", newSpeed);
	} else {
		return false;
	}

	int newPrescaler = prescalerOpts[0];
	if(touchSensor.setPrescaler(newPrescaler) == 0) {
		fprintf(stderr, "Prescaler set to %d.\n", newPrescaler);
	} else {
		return false;
	}

	int newThreshold= thresholdOpts[1];
	if(touchSensor.setNoiseThreshold(newThreshold) == 0) {
		fprintf(stderr, "Threshold set to %d.\n", newThreshold);
	} else {
		return false;
	}

	if(touchSensor.updateBaseLine() != 0)
		return false;

	if(touchSensor.prepareForDataRead() != 0)
		return false;

	Bela_scheduleAuxiliaryTask(Bela_createAuxiliaryTask(loop, 50, "I2C-read", NULL));
	return true;
}

void render(BelaContext *context, void *userData)
{
}

void cleanup(BelaContext *context, void *userData)
{
	touchSensor.cleanup();
}
