#include <Bela.h>
#include <typeinfo> 
#include <libraries/Gui/Gui.h>
#include <cmath>
#include <libraries/OnePole/OnePole.h>

Gui myGui;
OnePole freqFilt, ampFilt;

float gFrequency = 440.0;
float gAmpL = 1.0;
float gAmpR = 1.0;
float gPhase;
float gInverseSampleRate;

bool setup(BelaContext *context, void *userData)			
{
	gInverseSampleRate = 1.0 / context->audioSampleRate;
	gPhase = 0.0;
	
	myGui.setup(5555, "gui", context->projectName);
	myGui.setBuffer('f', 2);
	
	freqFilt.setup(1, context->audioSampleRate);
	ampFilt.setup(1, context->audioSampleRate);
	
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
	
			
		DataBuffer buffer = myGui.getDataBuffer(0);
		float* data = buffer.getAsFloat();
		
		gFrequency = map(data[1], 0, 1, 600, 320);
		gFrequency = constrain(gFrequency, 320, 600);
		gFrequency = freqFilt.process(gFrequency);
		
		float amplitude = ampFilt.process(constrain(data[0], 0, 1));
		gAmpL = 1 - amplitude; 
		gAmpR = amplitude;
		
		float out = 0.4f * sinf(gPhase);

		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			if(channel == 0) {
				audioWrite(context, n, channel, gAmpL*out);
			} else if (channel == 1) {
				audioWrite(context, n, channel, gAmpR*out);	
			}
		}

		// Update and wrap phase of sine tone
		gPhase += 2.0f * (float)M_PI * gFrequency * gInverseSampleRate;
		if(gPhase > M_PI)
			gPhase -= 2.0f * (float)M_PI;

	}
	
}

void cleanup(BelaContext *context, void *userData)
{

}
