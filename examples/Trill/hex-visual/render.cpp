/**
 * \example Trill/trill-square-gui
 *
 * Trill Hex GUI
 * ===================
 *
 * This project shows an example of how to communicate with the Trill
 * Hex sensor using the Trill library and visualise the X-Y position of the
 * touch in real time via the integrated Bela p5.js GUI.
 *
 * The Trill sensor is scanned in an AuxiliaryTask running in parallel with the
 * audio thread and the horizontal and vertical position and size are stored
 * in global variablex.
 *
 * A p5.js sketch is included in this example with a p5 class representation of
 * the Trill Hex sensor and touch. Touch position and size are displayed in
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

// Horizontal and vertical position for Trill sensor
float gTouchPosition[2] = { 0.0 , 0.0 };
// Touch size
float gTouchSize = 0.0;

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
		/*
		* The Trill Hex sensor can detect multiple touches but will
		* not be able to clearly differentiate their locations, so we
		* normally use the compoundTouch... methods to retrieve the
		* average of the location and size of the detected touches
		*/
		gTouchSize = touchSensor.compoundTouchSize();
		gTouchPosition[0] = touchSensor.compoundTouchHorizontalLocation();
		gTouchPosition[1] = touchSensor.compoundTouchLocation();
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{

 if(touchSensor.setup(1, 0x40, Trill::CENTROID) != 0) {
	 fprintf(stderr, "Unable to initialise touch sensor\n");
	 return false;
 }

 touchSensor.printDetails();

 // Exit program if sensor is not a Trill Hex
 if(touchSensor.deviceType() != Trill::HEX) {
	 fprintf(stderr, "This example is supposed to work only with the Trill HEX. \n You may have to adapt it to make it work with other Trill devices.\n");
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
