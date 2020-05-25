// No need for an auxiliary task: it is all handled by TrillThreaded, which automatically does
// readI2C(). We can send commands and read sensor values from the audio thread with no problems.
// In this case we updated the baseline every 2s and print values every 0.1s

#include <Bela.h>
#include <libraries/Trill/Trill.h>

TrillThreaded touchSensor;

// Interval for reading from the sensor
int updateBaselineInterval = 2; //s
int updateBaselineIntervalSamples;

//How often to scan the sensors
unsigned int gTaskSleepTime = 12000; //microseconds

bool setup(BelaContext *context, void *userData)
{
	// Setup a Trill Craft on i2c bus 1, using the default address.
	// Set it to differential mode for bargraph display
	if(touchSensor.setup(1, Trill::CRAFT, Trill::DIFF) != 0) {
		fprintf(stderr, "Unable to initialise Trill Craft\n");
		return false;
	}
	// tell the thread to sleep gTaskSleepTime between scans and to stop if 
	// Bela_stopRequested() will return true
	TrillThreaded::start(gTaskSleepTime, Bela_stopRequested);
	updateBaselineIntervalSamples = context->audioSampleRate*(updateBaselineInterval);
	return true;
}

void render(BelaContext *context, void *userData)
{
	static int count = 0;
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		if(count >= updateBaselineIntervalSamples) {
			//update baseline every 2 seconds
			touchSensor.updateBaseline();
			count = 0;
		}
		if((count % (updateBaselineIntervalSamples / 20)) == 0)
		{
			//print every 0.1sec
			for(unsigned int i = 0; i < touchSensor.getNumChannels(); i++)
				rt_printf("%1.3f ", touchSensor.rawData[i]);
			rt_printf("\n");
		}
		count++;
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
