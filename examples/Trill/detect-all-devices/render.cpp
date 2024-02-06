/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Trill/detect-all-devices/render.cpp

Detect All I2C Devices
======================

This example is a handy utility which will identify all connected
I2C devices and print information on them to the console.

When the program runs it will print the address and sensor type
of all the Trill sensors you currently have connected to the I2C bus.

This is particularly useful if you are unsure of the address of the sensor after
changing it via the solder bridges on the back. This example will also give
you a total count of the amount of Trill sensors connected to Bela.

NOTE: as this example scans several addresses on the i2c bus
it could cause non-Trill peripherals connected to it to malfunction.
*/

#include <Bela.h>
#include <libraries/Trill/Trill.h>

bool setup(BelaContext *context, void *userData)
{
	unsigned int i2cBus = 1;
	printf("Trill devices detected on bus %d\n", i2cBus);
	printf("Address    | Type\n");
	auto devices = Trill::probeRange(i2cBus);
	for(auto& d : devices) {
		const std::string& device = Trill::getNameFromDevice(d.first);
		int addr = d.second;
		printf("%#4x (%2d) | %s\n", addr, addr, device.c_str());
	}
	printf("Total: %d devices\n", devices.size());
	return true;
}

void render(BelaContext *context, void *userData)
{
	// we do not actually need to do any audio processing in this program, so as soon as it starts , we stop it
	Bela_requestStop();
	rt_printf("Done\n");
}

void cleanup(BelaContext *context, void *userData)
{
}
