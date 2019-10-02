#include <Bela.h>
#include <libraries/Trill/Trill.h>

Trill touchSensor;

AuxiliaryTask readI2cTask;
int readInterval = 500; //ms
int readIntervalSamples = 0;

void readTouchSensors(void*)
{
	touchSensor.readI2C();
	for(unsigned int i = 0; i < sizeof(touchSensor.rawData)/sizeof(int); i++) {
		printf("%5d ", touchSensor.rawData[i]);
	}
	printf("\n");
}

bool setup(BelaContext *context, void *userData)
{
	touchSensor.setup();
	readI2cTask = Bela_createAuxiliaryTask(readTouchSensors, 50, "I2C-read", NULL);
	readIntervalSamples = context->audioSampleRate*(readInterval/1000);
	return true;
}

void render(BelaContext *context, void *userData)
{
		static int readCount = 0;
		for(unsigned int n = 0; n < context->audioFrames; n++) {
			if(++readCount >= readIntervalSamples) {
				readCount = 0;
				Bela_scheduleAuxiliaryTask(readI2cTask);
			}
		}
}

void cleanup(BelaContext *context, void *userData)
{
	touchSensor.cleanup();
}
