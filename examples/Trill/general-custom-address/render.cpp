/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
https://bela.io
*/
/**
\example Trill/general-custom-address/render.cpp

Trill use a custom address
======================

In this example we specify an address instead of relying on the default one.

Every different type of Trill sensor has a different default
address and range of additional addresses which you can see in the below table:

| Type:  | Address | Additional addresses                    |
|--------|---------------------------------------------------|
| BAR    | 0x20    | 0x21 0x22 0x23 0x24 0x25 0x26 0x27 0x28 |
| SQUARE | 0x28    | 0x29 0x2A 0x2B 0x2C 0x2D 0x2E 0x2F 0x30 |
| CRAFT  | 0x30    | 0x31 0x32 0x33 0x34 0x35 0x36 0x37 0x38 |
| RING   | 0x38    | 0x39 0x3A 0x3B 0x3C 0x3D 0x3E 0x3F 0x40 |
| HEX    | 0x40    | 0x41 0x42 0x43 0x44 0x45 0x46 0x47 0x48 |

You can change the address of your device by jumpering some solder pads
on the device itself. This is needed when you have several devices of the
same type on the same bus, as there can be no two devices with the same
address. This is explained in detail here:
https://learn.bela.io/products/trill/all-about-i2c/#about-i2c-addresses

In this example we use a Trill Bar where we bridged together the two left-most
pads of the ADR0 line, which corresponds to an address of 0x21 (in hexadecimal
notation), or 33 (in decimal notation).

We have to pass this address as the third argument to the
`touchSensors.setup()` function in order to be able to use this sensor.

If no device is detected at the specified address, or a device of a different
type from the one we requested is detected, setup() will return an error
code and will stop.
*/

#include <Bela.h>
#include <libraries/Trill/Trill.h>

Trill touchSensor;

// Interval for printing the readings from the sensor
float printInterval = 0.1; //s
unsigned int printIntervalSamples = 0;
// Sleep time for auxiliary task
unsigned int gTaskSleepTime = 12000; // microseconds

void loop(void*)
{
	while(!Bela_stopRequested()) {
		touchSensor.readI2C();
		usleep(gTaskSleepTime);
	}
}

bool setup(BelaContext *context, void *userData)
{
	// Setup a Trill Bar on i2c bus 1, using the custom address 0x21 (or 33 in decimal).
	if(touchSensor.setup(1, Trill::BAR, 0x21) != 0) {
		fprintf(stderr, "Unable to initialise Trill device. Are the address and device type correct?\n");
		return false;
	}
	touchSensor.printDetails();

	Bela_runAuxiliaryTask(loop);

	printIntervalSamples = context->audioSampleRate*(printInterval);
	return true;
}

void render(BelaContext *context, void *userData)
{
	static unsigned int readCount = 0;
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		if(readCount >= printIntervalSamples) {
			readCount = 0;
			// we print the sensor readings depending on the device mode,
			// so that if you change the device type above, you get meaningful
			// values for your device
			if(Trill::CENTROID == touchSensor.getMode()) {
				rt_printf("Touches: %d:", touchSensor.getNumTouches());
				for(unsigned int i = 0; i < touchSensor.getNumTouches(); i++) {
					rt_printf("%1.3f ", touchSensor.touchLocation(i));
					if(touchSensor.is2D())
						rt_printf("%1.3f ", touchSensor.touchHorizontalLocation(i));
				}
			}
			else {
				for(unsigned int i = 0; i < touchSensor.getNumChannels(); i++)
					rt_printf("%1.3f ", touchSensor.rawData[i]);
			}
			rt_printf("\n");
		}
		readCount++;
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
