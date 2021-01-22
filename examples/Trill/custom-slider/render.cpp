#include <Bela.h>
#include <cmath>
#include <libraries/Trill/Trill.h>
#include <libraries/Gui/Gui.h>
#include <libraries/Trill/CentroidDetection.h>

#define NUM_TOUCH 2 // Number of touches on our custom slider

// Gui object declaration
Gui gui;

// Trill object declaration
Trill touchSensor;

CentroidDetection cd;
// Location of touches on Trill Bar
float gTouchLocation[NUM_TOUCH] = {0.0};
// Size of touches on Trill bar
float gTouchSize[NUM_TOUCH] = {0.0};
// Number of active touches
int gNumActiveTouches = 0;

// Sleep time for auxiliary task
unsigned int gTaskSleepTime = 12000; // microseconds
// Time period (in seconds) after which data will be sent to the GUI
float gTimePeriod = 0.015;

/*
* Function to be run on an auxiliary task that reads data from the Trill sensor.
* Here, a loop is defined so that the task runs recurrently for as long as the
* audio thread is running.
*/
void loop(void*)
{
	while(!Bela_stopRequested())
	{
		// Read raw pads from Trill sensor
		touchSensor.readI2C();
		cd.process(touchSensor.rawData.data());
		for(unsigned int i = 0; i < cd.getNumTouches() ; i++) {
			gTouchLocation[i] = cd.touchLocation(i);
			gTouchSize[i] = cd.touchSize(i);
		}
		gNumActiveTouches = cd.getNumTouches();
		/* you could use compound touch instead
		gTouchLocation[0] = cd.compoundTouchLocation();
		gTouchSize[0] = cd.compoundTouchSize();
		gNumActiveTouches = !(!gTouchSize[0]);
		*/
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{

	// Setup a Trill Craft sensor on i2c bus 1, using the default mode and address
	if(touchSensor.setup(1, Trill::CRAFT)) {
		fprintf(stderr, "Unable to initialise Trill\n");
		return false;
	}
	// set it to DIFF mode: we will only use some pads from it, which we set up next
	touchSensor.setMode(Trill::DIFF);
	// specify which pads to use (and in which order), how many touches and
	// the rescaling divisor for centroid size (depends on the shape and
	// material of your sensing surface)
	cd.setup({0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14}, NUM_TOUCH, 3200);

	touchSensor.printDetails();

	// Set and schedule auxiliary task for reading sensor data from the I2C bus
	Bela_runAuxiliaryTask(loop);

	// Setup GUI
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
			gui.sendBuffer(0, gNumActiveTouches);
			gui.sendBuffer(1, gTouchLocation);
			gui.sendBuffer(2, gTouchSize);

			count = 0;
		}
		count++;
	}
}

void cleanup(BelaContext *context, void *userData)
{}
