/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Sensors/shift-register-out/render.cpp

Example to use a 74HC595 (or similar) shift register to output data.
*/

#include <Bela.h>
#include <vector>
#include <libraries/ShiftRegister/ShiftRegister.h>

// Array for storing the values that are written to the register.
std::vector<bool> data = {1, 0, 1, 0, 1, 0, 1, 0};

//Connects to pin DS of 74HC595
unsigned int dataPin = 0;
//Connects to pin  SH_CP of 74HC595
unsigned int clockPin = 1;
//Connects to pin ST_CP of 74HC595
unsigned int latchPin = 2;

// For cycling through the LEDs
int gCounter = 0;
const int gIntervalSamples = 2000; // samples between updates of the LEDs
int litLED = 0;

ShiftRegister shiftRegister;

bool setup(BelaContext *context, void *userData)
{
	shiftRegister.setup({.data = dataPin, .clock = clockPin, .latch = latchPin}, data.size());
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->digitalFrames; ++n)
	{
		shiftRegister.process(context, n);
		// once all previous data has been shifted out,
		// start sending new data
		if(shiftRegister.dataSent())
			shiftRegister.setData(data);

		// Cycle through LEDs, updating the data that is sent out every gIntervalSamples samples
		if(gIntervalSamples == gCounter) {
			for (unsigned int j = 0; j < data.size(); ++j){
				// Start with all LEDs clear
				data[j] = 0;
			}
			// only set one LED at a time
			data[litLED] = 1;
			++litLED;
			if(litLED >= data.size())
				litLED = 0;
			gCounter = 0;
			rt_printf("Interval passed, litLED %d\n", litLED);
		}
		++gCounter;
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
