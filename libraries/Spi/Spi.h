/*
MIT License

Copyright (c) 2020 Jeremiah Rose

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

#pragma once

#include <stddef.h>
#include <linux/spi/spidev.h>

class Spi {
public:
	/* Enum SPI Modes*/
	typedef enum {
		MODE0 = SPI_MODE_0,
		MODE1 = SPI_MODE_1,
		MODE2 = SPI_MODE_2,
		MODE3 = SPI_MODE_3
	} Mode;
	struct Settings {
		const char* device; ///< device path to the device file (e.g.: `/dev/spidev2.1`)
		unsigned long speed; ///< requested clock rate in Hz
		unsigned short delay; ///< delay after the last bit transfer before deselecting the device
		unsigned char numBits; ///< numBits No. of bits per transaction. 8, 16, 24 or 32
		unsigned int mode; ///< SPI mode (e.g.: Spi::MODE3). This is not a Mode because the user can specify a custom mode by OR'ing flags together
	};

	Spi();
	~Spi();
	/**
	* Initialize the device
	*
	* @return 0 on success, an error code otherwise.
	*/
	int setup(const Settings& settings);
	/**
	* Perform one SPI transaction.
	*
	* @send: Points to the buffer containing the data to be sent
	* @receive: Points to the buffer into which the received
	* bytes will be stored
	* @numBytes: length of buffers in bytes.
	*
	* @return 0 on success, -1 on failure
	*/
	int transfer(unsigned char *send, unsigned char *receive,
		 size_t numBytes);
	/**
	 * Set the device mode.
	 *
	 * @param mode a set of flags that will be passed to ioctl(... SPI_IOC_xx_MODE ...)
	 * @return 0 upon success or an error code otherwise.
	 */
	int setMode(unsigned char mode);
	/**
	 * Set the number of bits per word.
	 *
	 * @param numBits the number of bits. Valid values are 8, 16, 24, 32
	 * @return 0 upon success or an error code otherwise.
	 */
	int setNumBits(unsigned char numBits);
	/**
	 * Set the clock frequency of the SPI bus.
	 *
	 * @param speed the clock frequency.
	 *
	 * @return 0 upon success or an error code otherwise.
	 */
	int setSpeed(unsigned long speed);
	/**
	* Close the device.
	*/
	void cleanup();
private:
	const char* device;
	unsigned long speed;
	unsigned short delay;
	unsigned char numBits;
	unsigned char mode;
	int fd = -1;
	struct spi_ioc_transfer transaction;
	int openDevice(const char* device);
};
