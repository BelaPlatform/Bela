#pragma once
#include <cstdint>
#include "Mmap.h"

class Gpio{
public:
	Gpio();

	~Gpio();

	typedef enum {
		INPUT,
		OUTPUT,
	} Direction;

	/**
	 * Opens a GPIO pin.
	 *
	 * @param pin the GPIO pin ( 0 <= pin < 128)
	 * @param direction one of `INPUT` or `OUTPUT`
	 * @param unexport if `false`, it will not try to unexport the pin when calling `close()`
	 *
	 * @return 0 if success, -1 otherwise;
	 */
	int open(unsigned int pin, Direction direction, bool unexport = true);
	
	/**
	 * Closes a currently open GPIO
	 */
	void close();

	/**
	 * Read the GPIO value.
	 * @return the GPIO value
	 */
	bool read(){
		return (gpio[GPIO_DATAIN] & pinMask);
	}

	/**
	 * Set the output to 1.
	 */
	void set(){
		gpio[GPIO_SETDATAOUT] = pinMask;
	}

	/** Clear the output
	 */
	void clear(){
		gpio[GPIO_CLEARDATAOUT] = pinMask;
	}

	/**
	 * Write an output value
	 * @param value the value to write
	 */
	void write(bool value){
		if(value){
			set();
		} else {
			clear();
		}
	}

	/**
	 * Check if the GPIO is enabled.
	 *
	 * @return true if enabled, false otherwise
	 */
	bool enabled(){
		return nullptr != gpio;
	}

	/**
	 * A utility function to return the mask from a Gpio number.
	 */
	static uint32_t getMask(unsigned int pin);
	/**
	 * A utility function to return the bank from a Gpio number.
	 */
	static uint32_t getBankNumber(unsigned int pin);
	/**
	 * A utility function to return the base address of a Gpio bank.
	 */
	static uint32_t getBankAddress(unsigned int bank);
private:
	static constexpr uint32_t GPIO_DATAIN = (0x138 / 4);
	static constexpr uint32_t GPIO_CLEARDATAOUT = (0x190 / 4);
	static constexpr uint32_t GPIO_SETDATAOUT = (0x194 / 4);
	bool shouldUnexport;
	Mmap mmap;
	int pin;
	uint32_t pinMask;
	volatile uint32_t* gpio;
};
