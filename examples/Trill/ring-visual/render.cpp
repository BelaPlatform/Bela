#include <Bela.h>
#include <cmath>
#include <libraries/Trill/Trill.h>
#include <libraries/Gui/Gui.h>

#define NUM_TOUCH 5 // Number of touches on Trill sensor

// Gui object declaration
Gui gui;

// Trill object declaration
Trill touchSensor;

// Location of touches on Trill Ring
float gTouchLocation[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Size of touches on Trill Ring
float gTouchSize[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Number of active touches
unsigned int gNumActiveTouches = 0;

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
	while(!gShouldStop)
	{
		 // Read locations from Trill sensor
		 touchSensor.readLocations();
		 gNumActiveTouches = touchSensor.numberOfTouches();
		 for(unsigned int i = 0; i < gNumActiveTouches; i++) {
			 gTouchLocation[i] = touchSensor.touchLocation(i);
			 gTouchSize[i] = touchSensor.touchSize(i);
		 }
		 // For all inactive touches, set location and size to 0
		 for(unsigned int i = gNumActiveTouches; i < NUM_TOUCH; i++) {
			 gTouchLocation[i] = 0.0;
			 gTouchSize[i] = 0.0;
		 }
		 usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{

	if(touchSensor.setup(1, 0x38, Trill::CENTROID) != 0) {
		fprintf(stderr, "Unable to initialise touch sensor\n");
		return false;
	}

	touchSensor.printDetails();

	// Exit program if sensor is not a Trill Ring
	if(touchSensor.deviceType() != Trill::RING) {
		fprintf(stderr, "This example is supposed to work only with the Trill Ring. \n You may have to adapt it to make it work with other Trill devices.\n");
		return false;
	}

	// Set and schedule auxiliary task for reading sensor data from the I2C bus
	Bela_scheduleAuxiliaryTask(Bela_createAuxiliaryTask(loop, 50, "I2C-read", NULL));

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
