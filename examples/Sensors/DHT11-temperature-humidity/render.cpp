/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Sensors/DHT-11-temperature-humidity/render.cpp

Measuring temperature and humidity
---------------------------

The DHT-11 temperature and humidity sensor uses a 1-wire bidirectional serial
communication protocol. On most platform, this involves bit-banging the
protocol on a single pin and running chunks of code with interrupts disabled in
order to respect the timing requirements of the device. The library provided
here, based on the one developed by Adafruit for the Arduino boards, instead
uses Bela's digital I/Os high sampling rate and tri-state capabilities to
perform the same from the audio thread with high accuracy.

Connect the sensor as follows:
- VCC to 3v3 on Bela
- GND to GND on Bela
- DATA to the Bela digital pin set in `digitalPin` below. Also connect it to VCC via a 4k7 pull-up resistor.

Datasheet: https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf
*/
#include <Bela.h>
#include "DHT.h"

const unsigned digitalPin = 0;

DHT dht(digitialPin, DHT11);
bool setup(BelaContext *context, void *userData)
{
	return true;
}

void render(BelaContext *context, void *userData) {
	static int count = 0;
	for(size_t n = 0; n < context->digitalFrames; ++n)
	{
		if(count > 2 * context->digitalSampleRate)
			count = 0;
		if(0 == count)
			dht.state = DHT::kShouldStart;
		if(count == 0.5f * context->digitalSampleRate)
			rt_printf("========%.1f C, %.1f %%=======\n", dht.readTemperature(), dht.readHumidity());
		count++;
	}
	dht.process(context);
}

void cleanup(BelaContext *context, void *userData)
{

}
