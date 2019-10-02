 /**
 * \example Trill/trill-bar-led
 *
 * Trill Bar LED 
 * =============
 * 
 * This project showcases an example of how to communicate with the Trill Bar sensor using
 * the Trill library and visualise position of different touches in real time via LEDs.
 *
 * The Trill sensor is scanned on an auxiliary task running parallel to the audio thread 
 * and the number of active touches, their position and size stored on global variables.
 *
 * Twelve LEDs are used to represent positions on the Trill sensor. The longitude of the 
 * Trill Bar sensor will be virtually divided into 12 different sections. When a touch 
 * occurs on one of these sections, the corresponding LED will be turned on. 
 *
 **/

#include <Bela.h>
#include <libraries/Trill/Trill.h>
#include <cmath>

#define NUM_TOUCH 5 // Number of touches on Trill sensor
#define NUM_LED 12 // Number of LEDs used for visualisation

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
int gTaskSleepTime = 100; // microseconds
// Time period for printing 
float gTimePeriod = 0.01; // seconds

// Digital pins assigned to LEDs used for visualisation
unsigned int gLedPins[NUM_LED] = { 0, 1, 2, 3, 4, 5, 8, 9, 11, 12, 13, 14 };
// Status of LEDs (1: ON, 0: OFF)
bool gLedStatus[NUM_LED] = { 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 };


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
		for(int i = 0; i <  touchSensor.numberOfTouches(); i++)
		{
	    		gTouchLocation[i] = map(touchSensor.touchLocation(i), 0, 3200, 0, 1);
			gTouchLocation[i] = constrain(gTouchLocation[i], 0, 1);
			gTouchSize[i] = map(touchSensor.touchSize(i), gTouchSizeRange[0], gTouchSizeRange[1], 0, 1);
	    		gTouchSize[i] = constrain(gTouchSize[i], 0, 1);
	    	}
		gNumActiveTouches = touchSensor.numberOfTouches();
		// For all innactive touches, set location and size to 0
		for(int i = gNumActiveTouches; i <  NUM_TOUCH; i++)
		{
			gTouchLocation[i] = 0.0;
			gTouchSize[i] = 0.0;
		}

		// Sleep for ... milliseconds	    
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	// Setup Trill sensor in NORMAL mode
	if(touchSensor.setup(1, 0x18, Trill::NORMAL, gThresholdOpts[6], gPrescalerOpts[0]) != 0) {
		fprintf(stderr, "Unable to initialise touch sensor\n");
		return false;
	}

	touchSensor.printDetails();

	// Exit render if sensor is not a Trill Bar
	if(touchSensor.deviceType() != Trill::ONED) {
		fprintf(stderr, "This example is supposed to work only with the Trill BAR. \n You may have to adapt it to make it work with other Trill devices.\n");
		return false;
	}

	// Set and schedule auxiliary task for reading sensor data from the I2C bus
	Bela_scheduleAuxiliaryTask(Bela_createAuxiliaryTask(loop, 50, "I2C-read", NULL));	
	// Set all digital pins corresponding to LEDs as outputs
	for(unsigned int l = 0; l < NUM_LED; l++)
		pinMode(context, 0, gLedPins[l], OUTPUT); 

	return true;
}

void render(BelaContext *context, void *userData)
{
	// Active sections of the Trill BAR
	bool activeSections[NUM_LED] = { false };

	// Printing counter
	static unsigned int count = 0;

	// Each audio frame, check location of active touches and round to the the number
	// of sections on which the Trill bar has been devided.
	// Set LED status based on activations of corresponding sections. 
	// Print LED status.
	for(unsigned int n = 0; n < context->audioFrames; n++) {

		for(unsigned int t = 0; t < gNumActiveTouches; t++) {
			int section = floor( NUM_LED * gTouchLocation[t] );
			activeSections[section] = activeSections[section] || 1;
		}

		for(unsigned int l = 0; l < NUM_LED; l++) {
			gLedStatus[l] = activeSections[l];
			digitalWrite(context, n, gLedPins[l], gLedStatus[l]);	
		}
		
		if(count >= gTimePeriod*context->audioSampleRate) 
		{
			for(unsigned int l = 0; l < NUM_LED; l++)
				rt_printf("%d ",gLedStatus[l]);
			rt_printf("\n");
			count = 0;
		}
		count++;
	}
}

void cleanup(BelaContext *context, void *userData)
{}
