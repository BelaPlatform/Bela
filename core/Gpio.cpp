#include "../include/Gpio.h"
#include "GPIOcontrol.h"

static const uint32_t GPIO_SIZE =  0x198;
static const uint32_t GPIO_ADDRESSES[4] = {
	0x44E07000,
	0x4804C000,
	0x481AC000,
	0x481AE000,
};

Gpio::Gpio() : pin(-1), gpio(nullptr)
{}

Gpio::~Gpio()
{
	close();
}

int Gpio::open(unsigned int newPin, Direction direction, bool unexport){
	if(newPin >= 128){
		return -1;
	}
	pin = newPin;
	// gpio_export can fail if the pin has already been exported.
	// if that is the case, let's make a note of it so we do not 
	// unexport it when we are done.
	int ret = gpio_export(pin);
	if(ret == 0 && unexport)
		shouldUnexport = true;
	else
		shouldUnexport = false;
	if(gpio_set_dir(pin, direction) < 0){
		return -1;
	}
	int bank = pin / 32;
	pin = pin - bank * 32;
	pinMask = 1 << pin;
	uint32_t gpioBase = GPIO_ADDRESSES[bank];
	gpio = (uint32_t*)mmap.map(gpioBase, GPIO_SIZE);
	if(!gpio)
		return -2;

	// actually use the memmapped memory,
	// to avoid mode switches later:
	// read the current value
	int value = read();
	// and write it back
	write(value);
	return 0;
}

void Gpio::close(){
	if(shouldUnexport && pin >= 0)
	{
		gpio_unexport(pin);
	}
	pin = -1;
}

uint32_t Gpio::getBankAddress(unsigned int bank)
{
	return GPIO_ADDRESSES[bank];
}
