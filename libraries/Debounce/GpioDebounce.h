#pragma once
#include <Gpio.h>
#include <libraries/Debounce/Debounce.h>
#include <memory>

/**
 * A debounced reading from a Gpio.
 */

class GpioDebounce : public Debounce
{
public:
	/**
	 * Same as setup(), but throws on error.
	 */
	GpioDebounce(unsigned int interval, unsigned int channel);
	/**
	 * Set up the Gpio and debouncer.
	 *
	 * @param debounce the number of calls to process() during which
	 * changes are ignored after a change in the input vaulue has been
	 * detected.
	 * @param channel the GPIO channel, as passed to Gpio::open()
	 * @return 0 on success or an error code otherwise.
	 */
	int setup(unsigned int interval, unsigned int channel);
	/**
	 * Read an input from the Gpio and provide an output.
	 */
	bool process() { return Debounce::process(gpio->read()); }
private:
	std::shared_ptr<Gpio> gpio;
};
