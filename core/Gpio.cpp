#include "../include/Gpio.h"

int Gpio::open(unsigned int newPin, unsigned int direction, bool unexport){
	if(newPin >= 128){
		return -1;
	}
	if(fd != -1){
		close();
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
	fd = ::open("/dev/mem", O_RDWR);
	int bank = pin / 32;
	pin = pin - bank * 32;
	pinMask = 1 << pin;
	uint32_t gpioBase = GPIO_ADDRESSES[bank];
	gpio = (uint32_t *)mmap(0, GPIO_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, fd, gpioBase); // NOWRAP
	if(gpio == MAP_FAILED){
		fprintf(stderr, "Unable to map GPIO pin %u\n", pin);
		return -2;
	}
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
	::close(fd);
	pin = -1;
	fd = -1;
}
