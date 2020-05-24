#include <Bela.h>
#include <libraries/Trill/Trill.h>

bool setup(BelaContext *context, void *userData)
{
	unsigned int i2cBus = 1;
	printf("Trill devices detected on bus %d\n", i2cBus);
	printf("Address    | Type\n");
	unsigned int total = 0;
	for(uint8_t n = 0x20; n <= 0x50; ++n) {
		Trill::Device device = Trill::probe(i2cBus, n);
		if(device != Trill::NONE) {
			printf("%#4x (%3d) | %s\n", n, n, Trill::getNameFromDevice(device).c_str());
			++total;
		}
	}
	printf("Total: %d devices\n", total);
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
