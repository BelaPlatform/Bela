/*
 ____  _____ _        _    
| __ )| ____| |      / \   
|  _ \|  _| | |     / _ \  
| |_) | |___| |___ / ___ \ 
|____/|_____|_____/_/   \_\

The platform for ultra-low latency audio and sensor processing

http://bela.io

A project of the Augmented Instruments Laboratory within the
Centre for Digital Music at Queen Mary University of London.
http://www.eecs.qmul.ac.uk/~andrewm

(c) 2018 Augmented Instruments Laboratory: Andrew McPherson,
  Astrid Bin, Liam Donovan, Christian Heinrichs, Robert Jack,
  Giulio Moro, Laurel Pardue, Victor Zappi. All rights reserved.

The Bela software is distributed under the GNU Lesser General Public License
(LGPL 3.0), available here: https://www.gnu.org/licenses/lgpl-3.0.txt
*/


#include <Bela.h>
#include <Gpio.h>

Gpio gpioIn;
Gpio gpioOut;
bool gShouldBlink = 1;
int gInputPin = 115; // this is the button on the Bela cape
int gOutputPin = 89; // this is the GPIO number. Check https://github.com/BelaPlatform/Bela/wiki/Pins-used-by-Bela what pin it is on your board
float gInterval = 0.1; // how often to toggle the LED (in seconds)
int gCount = 0; //counts elapsed samples
bool gStatus = false;

bool setup(BelaContext *context, void *userData)
{
	gpioIn.open(gInputPin, INPUT); // Open the pin as an output
	gpioOut.open(gOutputPin, OUTPUT); // Open the pin as an output
	return true;
}

void render(BelaContext *context, void *userData)
{
	if(gpioIn.read()) // read the Bela button.
		gShouldBlink = true; // button is not pressed
	else
		gShouldBlink = false; // button is pressed
	for(unsigned int n = 0; n < context->audioFrames; ++n){
		if(gCount == (int)(context->audioSampleRate * gInterval)){ //if enough samples have elapsed
			gCount = 0; //reset the counter
			//toggle the status
			if(gStatus == 0)
				gStatus = 1;
			else
				gStatus = 0;
			if(gShouldBlink)
				gpioOut.write(gStatus); //write the status to the LED (gOutputPin)
		}
		gCount++;
	}
}

void cleanup(BelaContext *context, void *userData)
{
	// Nothing to do here
}


/**
\example synchronous-gpio/render.cpp

Controlling a digital pin synchronously
---------------

This sketch shows how to control a digital pin synchronously from your code. This is an alternative
approach to using the Bela Digital I/Os, which are sampled at audio rate. With this approach, the
sampling time is not periodic.

Examples use cases:
- accurate, minimally invasive measurements of CPU time for specific blocks of code (simply
	toggle a pin before and after the section you want to measure and monitor it with an 
	external oscilloscope)
- performing non-time-critical digital I/O (e.g.: reading buttons or driving LEDs)
	when you need more than the 16 I/Os provided by the Bela core.
- manually driving the on-board LEDs for BelaMini (requires running with `--disable-led`).

See here for more details:
https://github.com/BelaPlatform/Bela/wiki/Using-arbitrary-GPIO-pins

In this example we use as an output GPIO pin 89, which on Bela is P8.30 and on BelaMini
is P1.04, but is also connected to the on-board red LED.
Additionally, we read the button on the Bela cape. DO NOT press the button for more than 2 seconds
at a time, unless you disabled it globally on your system, or you will trigger the default 
action (system shutdown).

Preparation:

On Bela:
- Connect an LED in series with a 470ohm resistor between digital pin P8.30 and ground.
- Make sure you run it with Bela's digitals disabled. This is not normally needed when using
the Gpio class, unless - like in this case - one of the pins in use would otherwise be used by the
Bela Digital I/Os.
On BelaMini:
- use the onboard LED, overriding its default behaviour
- make sure you run with `--disable-led`

In both cases, you have to disable the default behaviour of the button on the cape by running 
with `--disable-cape-button-monitoring`. Again, DO NOT hold-press the button for more than 2 seconds
at a time unless it is disabled globally.

The led is blinked on and off by setting the digital pin to `1` and `0` every `gInterval`
seconds, unless the button is pressed, in which case the blinking is temporarily disable.

In `setup()` the pin is opened and initialized as an output mode via a call to `Gpio::open()`.

In `render()` the output of the output digital pin is set by `Gpio::write()`, and the input
digital pin is read calling `Gpio::read()`.

To keep track of elapsed time we have a sample counter `gCount`. When `gCount` reaches 
the desired value, it switches the state of the LED pin.
*/

