#include "../include/Gpio.h"
#include "GPIOcontrol.h"
#include <vector>
#include <stdexcept>
#include <stdio.h>

static const unsigned int kBitsPerGpioBank = 32;
static const uint32_t GPIO_SIZE =  0x198;
#ifdef IS_AM572x
static const int kGpioBankIndexed = 1;
#else // IS_AM572x
static const int kGpioBankIndexed = 0;
#endif // IS_AM572x

Gpio::Gpio() : pin(-1), gpio(nullptr)
{}

Gpio::~Gpio()
{
	close();
}

int Gpio::open(unsigned int newPin, Direction direction, bool unexport){
	unsigned int bank = getBankNumber(newPin);
	uint32_t gpioBase;
	try {
		gpioBase = getBankAddress(bank);
	} catch (std::exception&) {
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
	pinMask = getMask(pin);
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

uint32_t Gpio::getMask(unsigned int pin)
{
	unsigned int bit = pin % kBitsPerGpioBank;
	return 1 << bit;
}

uint32_t Gpio::getBankNumber(unsigned int pin)
{
	return pin / kBitsPerGpioBank + kGpioBankIndexed;
}

uint32_t Gpio::getBankAddress(unsigned int bank)
{
	// GPIO_ADDRESSES is private to this function so that there is no ambiguity
	// about whether it should be 0- or 1- indexed
	static const std::vector<uint32_t> GPIO_ADDRESSES = {
	#ifdef IS_AM572x
		0x4AE10000,
		0x48055000,
		0x48057000,
		0x48059000,
		0x4805B000,
		0x4805D000,
		0x48051000,
		0x48053000,
	#else // IS_AM572x
		0x44E07000,
		0x4804C000,
		0x481AC000,
		0x481AE000,
	#endif // IS_AM572x
	};
	return GPIO_ADDRESSES.at(bank - kGpioBankIndexed);
}
