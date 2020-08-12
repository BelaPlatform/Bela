#include "GpioDebounce.h"
#include <stdexcept>

GpioDebounce::GpioDebounce(unsigned int channel, unsigned int interval)
{
	if(setup(channel, interval))
		throw std::runtime_error("Invalid parameter passed to GpioDebounce constructor");
}

int GpioDebounce::setup (unsigned int interval, unsigned int channel)
{
	gpio = std::make_shared<Gpio>();
	int ret = gpio->open(channel, Gpio::INPUT);
	if(ret)
		return -1;
	Debounce::setup(interval);
	return 0;
}
