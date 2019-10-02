#include <Bela.h>
#include <libraries/Trill/Trill.h>

Trill touchSensor;

AuxiliaryTask readI2cTask;
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
					for(unsigned int i = 0; i < sizeof(touchSensor.rawData)/sizeof(int); i++)
						rt_printf("%5d ", touchSensor.rawData[i]);
					rt_printf("\n");
				}
			}
			readCount++;
		}
}

void cleanup(BelaContext *context, void *userData)
{}
