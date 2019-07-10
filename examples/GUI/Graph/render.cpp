#include <Bela.h> 
#include <string>
#include <vector>
#include <math.h>
#include <ctime>
#include <libraries/Gui/Gui.h>

Gui gui;
	

std::vector <float> gTimestamps;
std::vector <float> gVoltage;

int gSensorChanel = 0;

float gReadPeriod = 0.01;
float gSendPeriod = 1;

float gLastTimeRecorded = 0;

float gInverseAnalogSampleRate = 0;

float gAnalogScale = 4.096; //volt


bool setup(BelaContext *context, void *userData)
{
	gui.setup(5555, "gui", context->projectName);
	
	gInverseAnalogSampleRate = 1/context->analogSampleRate;
	return true; 
}

void render(BelaContext *context, void *userData)
{
	static int readFramesElapsed = 0;
	static int sendFramesElapsed = 0;

	for(unsigned int n = 0; n < context->analogFrames; ++n) {
		
		// Read Analog Input
		if(readFramesElapsed > gReadPeriod * context->analogSampleRate) {
			float millis = gLastTimeRecorded + 1000*readFramesElapsed*gInverseAnalogSampleRate;
 			gLastTimeRecorded = millis;
			float analogVolt = gAnalogScale * analogRead(context, n, gSensorChanel);
			gTimestamps.push_back(millis);
			gVoltage.push_back(analogVolt);

			readFramesElapsed = 0;
		} 
		++readFramesElapsed;
		
		// Send data to GUI for visualisation
		if(sendFramesElapsed > gSendPeriod * context->analogSampleRate) {
			
			// Send buffers
			if(gui.isConnected()) {
				gui.sendBuffer(0, gTimestamps);
				gui.sendBuffer(1, gVoltage);
				
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

