 /**
 * \example Gui/graph
 *
 * GUI graph 
 * =========
 *
 * New GUI fuctionality for Bela!
 *
 * Is this project you can find a sketch.js file which is a p5.js file that is rendered
 * in a browser tab. Click the GUI button (next to the Scope button) in the IDE to see the rendering of this file.
 * 
 * This example sends voltage readings from one of the analog inputs in Bela and the corresponding timestamp (in milliseconds) to be represented as a graph in the browser.
 * Buffers are sent with id 0 and 1 corresponding to the timestamps and the voltage respectively:
 * 	`gui.sendBuffer(0, gTimestamps);`
 * 	`gui.sendBuffer(1, gVoltage);`
 * 
 * The p5.js file displays the received data in a graph using a library called grafica.js
 * The graph will be updated with new values until the page is refreshed,
 * Pressing the space bar will stop the auto scrolling and allow to scroll manually and zoom in to se the values of the different points.
 * Pressing the space bar again will resume the auto scrolling.
 * 
 * If you want to edit sketch.js you can do so in the browser but must write your p5.js code in instance mode.
 * 
 **/

#include <Bela.h> 
#include <vector>
#include <libraries/Gui/Gui.h>

// GUI object declaration
Gui gui;
	
// Vector that will hold the timestamps
std::vector <float> gTimestamps;
// Vector that will hold the voltage readings 
std::vector <float> gVoltage;

// Analog sensor channel
int gSensorChanel = 0;

// Period after which a reading from the analog input will be taken (seconds)
float gReadPeriod = 0.01;
// Period after which buffers will be sent to the browser (seconds)
float gSendPeriod = 1;

float gLastTimeRecorded = 0;

float gInverseAnalogSampleRate = 0;

// Range of analog inputs
float gAnalogScale = 4.096; //volt


bool setup(BelaContext *context, void *userData)
{
	// Setup GUI. By default, the Bela GUI runs on port 5555 and address 'gui'
	gui.setup(context->projectName);
	// maximum number of elements to have in the array ()
	unsigned int numElements = gSendPeriod / gReadPeriod + 0.5;
	gTimestamps.reserve(numElements);
	gVoltage.reserve(numElements);
	
	gInverseAnalogSampleRate = 1/context->analogSampleRate;
	return true; 
}

void render(BelaContext *context, void *userData)
{
	static int readFramesElapsed = 0;
	static int sendFramesElapsed = 0;

	for(unsigned int n = 0; n < context->analogFrames; ++n) {
		
		// Read analog input once enough frames have elapsed 
		if(readFramesElapsed > gReadPeriod * context->analogSampleRate) {
			// Get milliseconds elapsed since last reading.
			float millis = gLastTimeRecorded + 1000*readFramesElapsed*gInverseAnalogSampleRate;
 			gLastTimeRecorded = millis;
			// Scale analog reading to voltage
			float analogVolt = gAnalogScale * analogRead(context, n, gSensorChanel);
			// Update vectors
			gTimestamps.push_back(millis);
			gVoltage.push_back(analogVolt);

			readFramesElapsed = 0;
		} 
		++readFramesElapsed;
		
		// Send data to GUI for visualisation once enough frames have elapsed
		if(sendFramesElapsed > gSendPeriod * context->analogSampleRate) {
			// If GUI is connected
			if(gui.isConnected()) {
				// send buffers 
				gui.sendBuffer(0, gTimestamps);
				gui.sendBuffer(1, gVoltage);
				
				// delete vectors holding timestamps and readings		
				gTimestamps.clear();
				gVoltage.clear();
			}
			
			sendFramesElapsed = 0;
		} 
		++sendFramesElapsed;

	}
}

void cleanup(BelaContext *context, void *userData)
{
}

