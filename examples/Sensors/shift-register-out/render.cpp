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

Many more digital outputs!
-------------------------

This examples shows how to use a 74HC595 (or similar) shift register to increase
the number of digital outputs on Bela.

The 74HC595 is what is known as a "serial-in, parallel-out shift register".
This means that you can control 8 digital outputs with only 3 digital  pins of the Bela.
The shift register requires three connections:

- data pin (DS)
- clock pin (SH_CP)
- latch pin (ST_CP)

The shift register works by receiving different sequences of pulses
to these three pins. It can store 8 bits of memory which it then outputs all at
once when the correct sequence of pulses are received. We are using the ShiftRegister.h
library to take care of the timing of the communication.

Circuit
-------

The exact pin out of each model of shift register can differ slightly so we recommend
checking the data sheet to see where the power, ground and
three serial-in connections should be made.

On the output pins you should connect 8 LEDs with a 220ohm resistor in series.
When the project runs you will see a chaser sequencer on the LEDs as they
flash in order.

You can also link multiple registers together to extend the number of digital
outputs even more.
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
