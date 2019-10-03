/**
 * \example Trill/trill-square-gui
 *
 * Trill Square GUI
 * ===================
 * 
 * New GUI fuctionality for Bela! 
 *
 * This project showcases an example of how to communicate with the Trill
 * Square sensor using the Trill library and visualise the X-Y position of the
 * touch in real time via the integrated Bela p5.js GUI.
 *
 * The Trill sensor is scanned in an AuxiliaryTask running in parallel with the
 * audio thread and the horizontal and vertical position and size are stored
 * in global variablex.
 *
 * A p5.js sketch is included in this example with a p5 class representation of
 * the Trill Square sensor and touch. Touch position and size are displayed in
 * the sketch.
 *
 **/

#include <Bela.h>
#include <cmath>
#include <libraries/Trill/Trill.h>
#include <libraries/Gui/Gui.h>

// Gui object declaration
Gui gui;

// Trill object declaration
Trill touchSensor;

// Prescaler options for Trill sensor
int gPrescalerOpts[6] = {1, 2, 4, 8, 16, 32};
// Threshold options for Trill sensor
int gThresholdOpts[7] = {0, 10, 20, 30, 40, 50, 60};

// Horizontal and vertical position for Trill sensor
float gTouchPosition[2] = { 0.0 , 0.0 };
// Touch size
float gTouchSize = 0.0;
// Touch range on which the re-mapping will be done
int gTouchSizeRange[2] = { 100, 1000 };

// Sleep time for auxiliary task
int gTaskSleepTime = 5000;

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

	 /*
		* The Trill Square sensor can detect multiple touches but will not be
		* able to clearly differentiate their locations.
		* The sensor should be used for 1-touch detections but, just in the case
		* there is a multitouch event, we will average the position and size to
		* obtain a single touch behaviour.
		*/
	 int avgLocation = 0;
	 int avgSize = 0;
	 int numTouches = 0;
	 // Calculate vertical position and size and map to a 0-1 range
	 for(int i = 0; i < touchSensor.numberOfTouches(); i++) {
		 if(touchSensor.touchLocation(i) != 0) {
						 avgLocation += touchSensor.touchLocation(i);
			 avgSize += touchSensor.touchSize(i);
			 numTouches += 1;
		 }
	 }
	 avgLocation = floor(1.0f * avgLocation / numTouches);
	 avgSize = floor(1.0f * avgSize / numTouches);
	 gTouchSize = map(avgSize, gTouchSizeRange[0], gTouchSizeRange[1], 0, 1);
	 gTouchSize = constrain(gTouchSize, 0, 1);
	 gTouchPosition[1] = map(avgLocation, 0, 1792, 1, 0);
	 gTouchPosition[1] = constrain(gTouchPosition[1], 0, 1);

	 int avgHorizontalLocation = 0;
	 int numHorizontalTouches = 0;
	 // Calculate horizontal position and map to a 0-1 range
	 for(int i = 0; i < touchSensor.numberOfHorizontalTouches(); i++) {
		 if(touchSensor.touchHorizontalLocation(i) != 0) {
			 avgHorizontalLocation += touchSensor.touchHorizontalLocation(i);
			 numHorizontalTouches += 1;
				 }
	 }
	 avgHorizontalLocation = floor(1.0f * avgHorizontalLocation / numHorizontalTouches);

	 gTouchPosition[0] = map(avgHorizontalLocation, 0, 1792, 0, 1);
	 gTouchPosition[0] = constrain(gTouchPosition[0], 0, 1);

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

 // Exit program if sensor is not a Trill Square
 if(touchSensor.deviceType() != Trill::TWOD) {
	 fprintf(stderr, "This example is supposed to work only with the Trill SQUARE. \n You may have to adapt it to make it work with other Trill devices.\n");
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
	 // Send X-Y position of the touch and size to the GUI
	 // after some time has elapsed.
	 if(count >= gTimePeriod*context->audioSampleRate)
	 {
		 gui.sendBuffer(0, gTouchPosition);
		 gui.sendBuffer(1, gTouchSize);

		 count = 0;
	 }
	 count ++;
 }
}

void cleanup(BelaContext *context, void *userData)
{}
