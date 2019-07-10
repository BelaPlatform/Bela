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

(c) 2016 Augmented Instruments Laboratory: Andrew McPherson,
  Astrid Bin, Liam Donovan, Christian Heinrichs, Robert Jack,
  Giulio Moro, Laurel Pardue, Victor Zappi. All rights reserved.

The Bela software is distributed under the GNU Lesser General Public License
(LGPL 3.0), available here: https://www.gnu.org/licenses/lgpl-3.0.txt
*/


#include <Bela.h>

const int numPins = 4;
int pins[numPins] = {0, 1, 2, 3}; // Digital pins 0 to 3
bool useHardwarePwm = false; // if you want to use hardware PWM, check out the help text at the bottom - check the pin diagram in the IDE
int softPwmPin = 4; // Digital pin 4 - check the pin diagram in the IDE
int period = 176; // duration (in samples) of a "brightness period", affects resolution of dimming. Larger values will cause flickering.
bool useSequencer = true; // if disabled, control the brightness of each LED from the respective analog input

const int numLeds = numPins * 2;
const int numSteps = 16;
float steps[numSteps][numLeds]; // built-in sequencer

bool setup(BelaContext *context, void *userData)
{
	int n = 0;
	int j = 0;
	// fill the first numLeds positions with one LED at a time
	for(; j < numLeds; ++j)
	{
		for(int led = 0; led < numPins * 2; ++led)
		{
			steps[j][led] = (j == led);
		}
	}
	// fill the subsequent steps with one LED full-on, the other half-on and viceversa
	n += j;
	j = 0;
	for(; j < numLeds * 2; j += 2)
	{
		for(int led = 0; led < numPins * 2; ++led)
		{
			if(led == j)
			{
				steps[n+j][led] = 1;
				steps[n+j][led+1] = 0.2;
				steps[n+j+1][led] = 0.2;
				steps[n+j+1][led+1] = 1;
			}
		}
	}
	if(!useHardwarePwm)
	{
		pinMode(context, 0, softPwmPin, OUTPUT);	
	}
	return true;
}

void render(BelaContext *context, void *userData)
{
	float brightness[numPins][2];
	if(!useSequencer)
	{
		// read the analog input at block rate to determine each LED brightness
		for(unsigned int n = 0; n < numPins; ++n)
		{
			if(context->analogInChannels >= n * 2 + 1)
			{
				brightness[n][0] = analogRead(context, 0, n * 2) / 0.84f;
				brightness[n][1] = analogRead(context, 0, n * 2 + 1) / 0.84f;
			} else {
				brightness[n][0] = 1;
				brightness[n][1] = 1;
			}
		}
	} else {
		// use the step sequencer
		static int step = 0;
		static int stepCounter = 0;
		float stepLength;
		float masterBrightness;
		if(context->analogInChannels >= 1)
		{
			stepLength = analogRead(context, 0, 0) * context->digitalSampleRate;
			masterBrightness = analogRead(context, 0, 1) / 0.84f;
		} else {
			stepLength = 0.5f * context->digitalSampleRate;
			masterBrightness = 1;
		}
		if(stepCounter >= stepLength)
		{
			// select the next step
			stepCounter = 0;
			++step;
			if(step == numSteps)
				step = 0;
		}
		for(unsigned int n = 0; n < numPins; ++n)
		{
			brightness[n][0] = steps[step][n * 2] * masterBrightness;
			brightness[n][1] = steps[step][n * 2 + 1] * masterBrightness;
		}
		stepCounter += context->digitalFrames;
	}

	for(unsigned int n = 0; n < context->digitalFrames; ++n){
		static unsigned int count = 0;
		if(useHardwarePwm == false)
		{
			// do the software PWM if needed, toggling every sample
			int pwmValue = n & 1;
			digitalWriteOnce(context, n, softPwmPin, pwmValue);
		}

		int led; // find which LED in a pair we are controlling in this sample
		if(useHardwarePwm == false)
		{
			led = (count >> 1) & 1; // hold a given led for two samples, so that the soft PWM is effective

		} else {
			led = count & 1; // hardware PWM runs at much higher clock speed: we can change LED every sample
		}

		for(unsigned int channel = 0; channel < numPins; ++channel)
		{
			float bright = brightness[channel][led];
			int direction = count >= bright * period ? INPUT : OUTPUT; // if the pin is set to INPUT, the LED will be OFF
			int pin = pins[channel];
			int value = led; 
			pinModeOnce(context, n, pin, direction);
			if(direction == OUTPUT)
				digitalWriteOnce(context, n, pin, value);
		}
		
		count++;
		if(count == period)
			count = 0;

	}
}

void cleanup(BelaContext *context, void *userData)
{}

/**
\example bicolor-LEDs/render.cpp

Blinking 8 LEDs with 4 GPIOs (and a PWM)
---------------

Bicolor LEDs often come in a package with two terminals only. Internally, the LEDs are connected
back-to-back with opposite polarity. By using a tri-state pin and a PWM generator, you can dim
and mix each color at will. A PWM channel can be shared across multiple LED pairs, as long as
it provides enough current.
In this example we control 8 LEDs (or 4 bi-color LEDs) using a single PWM generator and 4 tri-state
GPIOs.

Wiring:
from each GPIO channels, add a 100ohm series resistor and then connect two LEDs back-to-back
with opposite orientation from the resistor to the PWM output.

\code
          LED0 
      |---|>|---|   100ohm
PWM --|         |---/\/\/--- GPIOpin
      |---|<|---|
          LED1
\endcode

Remember that PWM oscillates between `HIGH` and `LOW` at a high rate.
LED0 turns on only when GPIO is `LOW`. LED1 turns only when GPIO is `HIGH`.
When GPIO is set to an `INPUT`, it goes to high impedance and acts as an open
circuit, therefore both LEDs are off.

Bela allows to switch GPIO between `OUTPUT`-`HIGH`, `OUTPUT`-`LOW`, `INPUT` for every sample at 44.1kHz.
For instance, to control the brightness of LED0 we can set an arbitrary `period` and set 
GPIO to `OUTPUT`-`LOW` for a number of samples (`<= period`) proportional to the brightness, setting
it to INPUT for the remainder samples. If we keep it to `OUTPUT`-`LOW` for the whole `period`, it will
have the maximum brightness, if we set it to `INPUT` for the whole `period`, it will be dark.
Intermediate values will produce intermediate brightness levels.
Similarly for LED1, except that we would alternate between `OUTPUT`-`HIGH` and `INPUT`.

Larger values of `period` allow for more resolution for the dimming, however if the value gets
too large, you may have visible flickering.

As we need to control both LEDs from a single GPIO pin, we decide to alternate between the two 
LEDs for every sample, so that during even samples we control LED0 and during odd samples we
control LED1. This way, for even samples the GPIO can only be `OUTPUT`-`LOW` or `INPUT`; for odd samples
it can only be `OUTPUT`-`HIGH` or `INPUT`. The balance between `OUTPUT`-`LOW` and `INPUT` on even samples 
controls the brightness of LED0, while the balance between `OUTPUT`-`HIGH` and `INPUT` on odd samples
controls the brightness of LED1. This way we can have independent control over the brightness of
two LEDs with a single tri-state GPIO + a shared PWM generator.

When using a hardware PWM generator, this switches at a very high frequency, many times per sample.
If this is not available, we can use a software PWM generator, toggling one of Bela's digital
outputs. For this to be effective, the GPIO needs to hold the state for at least one full PWM
period. We toggle the soft PWM output every sample (generating a 50% pulse wave at
`context->digitalSampleRate / 2` Hz), therefore we need to hold the value of an LED for 2 samples.

Varying the duty cycle of the PWM generator allows to balance between the different brightness of
different colors of LEDs. However, to achieve this with the soft PWM, you would need to slow down
the frequency of the pulse wave. This would in turn lower the resolution of the dimming, unless
the `period` is increased, again with the risk of causing visible flickering.

When `useSequencer = true`, then analogIn0 affects the speed of the steps and analogIn1 affects
the overall brightness.
When `useSequencer = false`, then each of the analogIns affects the brightness of the 
corresponding LED.

To use a hardware PWM, e.g.: on P9_14:
\code
cp MY-PWM-01-00A0.dtbo /lib/firmware
echo MY-PWM-01 > $SLOTS
config-pin P9.14 pwm
echo 3 > /sys/class/pwm/export
echo 0 > /sys/class/pwm/pwm3/duty_ns
echo 1000 > /sys/class/pwm/pwm3/period_ns
echo 700 > /sys/class/pwm/pwm3/duty_ns # adjust this to make sure the brightness is balanced between differnet LED colors
echo 1 > /sys/class/pwm/pwm3/run
\endcode
otherwise you can use soft PWM using the Bela digtal specified in the code.

Also, you will need your `pins` not to have any pull-up or pull-down (`0x2f`) otherwise they may 
be lightly dim when they should be off.

*/

