/**
 * \example Trill/trill-bar-gui
 *
 * Trill Bar GUI
 * ================
 * 
 * New GUI fuctionality for Bela! 
 *
 * This project showcases an example of how to communicate with the Trill Bar
 * sensor using the Trill library and visualise position of different touches
 * in real time via the integrated Bela p5.js GUI.
 *
 * The Trill sensor is scanned in an AuxiliaryTask running in parallel with the
 * audio thread and the number of active touches, their position and size are
 * stored in global variables.
 *
 * A p5.js sketch is included in this example with a p5 class representation of
 * the Trill Bar sensor and the different touches. Touch position and size are
 * displayed in the sketch.
 *
 **/

#include <Bela.h>
#include <cmath>
#include <libraries/Trill/Trill.h>
#include <libraries/Gui/Gui.h>

#define NUM_TOUCH 5 // Number of touches on Trill sensor

// Gui object declaration
Gui gui;

// Trill object declaration
Trill touchSensor;

// Prescaler options for Trill sensor
int gPrescalerOpts[6] = {1, 2, 4, 8, 16, 32};
// Threshold options for Trill sensor
int gThresholdOpts[7] = {0, 10, 20, 30, 40, 50, 60};

// Location of touches on Trill Bar
float gTouchLocation[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Size of touches on Trill bar
float gTouchSize[NUM_TOUCH] = { 0.0, 0.0, 0.0, 0.0, 0.0 };
// Number of active touches
int gNumActiveTouches = 0;
// Touch range on which the re-mapping will be done
int gTouchSizeRange[2] = { 100, 6000 };

// Sleep time for auxiliary task
int gTaskSleepTime = 100;
// Time period (in seconds) after which data will be sent to the GUI
float gTimePeriod = 0.015;

/*
* Function to be run on an auxiliary task that reads data from the Trill sensor.
* Here, a loop is defined so that the task runs recurrently for as long as the
* audio thread is running.
*/
void loop(void*)
{
 // loop
 while(!gShouldStop)
 {
	 // Read locations from Trill sensor
	 touchSensor.readLocations();
	 // Remap location and size so that they are expressed in a 0-1 range
	 for(int i = 0; i <  touchSensor.numberOfTouches(); i++) {
		 gTouchLocation[i] = map(touchSensor.touchLocation(i), 0, 3200, 0, 1);
		 gTouchLocation[i] = constrain(gTouchLocation[i], 0, 1);
		 gTouchSize[i] = map(touchSensor.touchSize(i), gTouchSizeRange[0], gTouchSizeRange[1], 0, 1);
		 gTouchSize[i] = constrain(gTouchSize[i], 0, 1);
	 }
	 gNumActiveTouches = touchSensor.numberOfTouches();
	 // For all innactive touches, set location and size to 0
	 for(int i = gNumActiveTouches; i <  NUM_TOUCH; i++) {
		 gTouchLocation[i] = 0.0;
		 gTouchSize[i] = 0.0;
	 }

	 // Sleep for ... milliseconds
	 usleep(gTaskSleepTime);
 }
}

bool setup(BelaContext *context, void *userData)
{

 if(touchSensor.setup(1, 0x18, Trill::NORMAL, gThresholdOpts[6], gPrescalerOpts[0]) != 0) {
	 fprintf(stderr, "Unable to initialise touch sensor\n");
	 return false;
 }

 touchSensor.printDetails();

 // Exit program if sensor is not a Trill Bar
 if(touchSensor.deviceType() != Trill::ONED) {
	 fprintf(stderr, "This example is supposed to work only with the Trill BAR. \n You may have to adapt it to make it work with other Trill devices.\n");
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
