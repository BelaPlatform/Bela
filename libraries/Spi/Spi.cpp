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

#include "Spi.h"
#include <stdio.h>
#include <fcntl.h>
#include <unistd.h>
#include <sys/ioctl.h>

#include <linux/spi/spidev.h>

Spi::Spi() {}
Spi::~Spi() {
	cleanup();
}

int Spi::setup (const Spi::Settings& settings)
{
	delay = settings.delay;
	device = settings.device;

	if (openDevice(device) < 0) {
		fprintf(stderr, "SPI: Failed to open %s", device);
		perror(" |");
		return -1;
	}

	/* Set the SPI mode for RD and WR operations */
	if(setMode(settings.mode) == -1)
	{
		perror("SPI: Failed to set SPIMODE |");
		return -1;
	}

	/* Set the No. of bits per transaction */
	if(setNumBits(settings.numBits) == -1)
	{
		perror("SPI: Failed to set No. of bits per word |");
		return -1;
	}

	/* Set the SPI bus speed in Hz */
	if(setSpeed(settings.speed) == -1)
	{
		perror("SPI: Failed to set SPI bus frequency |");
		fprintf(stderr, "speed: %ld\n", speed);
		return -1;
	}

	/* Initialize the spi_ioc_transfer structure that will be passed to the
	* KERNEL to define/configure each SPI Transactions */

	transaction.pad = 0;
	transaction.tx_nbits = 0;
	transaction.rx_nbits = 0;
	transaction.delay_usecs = delay;
	transaction.cs_change = true; //deselect device before starting the next transfer
	// .tx_buf, .rx_buf, numBytes Set in transfer()
	// .speed_hz Set in setSpeed()
	// .bits_per_word Set in setNumBits()

	return 0;
}

int Spi::openDevice(const char* device){
	this->device = device;
	if(fd > 0)
		close(fd);
	fd = open(device, O_RDWR);
	return fd;
}

int Spi::setMode(unsigned char mode)
{
	this->mode = mode;
	int ret = 0;
	if(ioctl(fd, SPI_IOC_WR_MODE, &mode)==-1)
		ret = -1;
	return (ret);
}

int Spi::setNumBits(unsigned char numBits)
{
	this->numBits = numBits;
	transaction.bits_per_word = numBits;
	int ret = 0;
	if(ioctl(fd, SPI_IOC_WR_BITS_PER_WORD, &numBits)==-1)
		ret = -1;
	return (ret);
}

int Spi::setSpeed(unsigned long speed)
{
	this->speed = speed;
	transaction.speed_hz = speed;
	int ret = 0;
	if(ioctl(fd, SPI_IOC_WR_MAX_SPEED_HZ, &speed)==-1)
		ret = -1;
	return (ret);
}

int Spi::transfer(unsigned char *send, unsigned char *receive, size_t numBytes)
{
	/* Points to the Tx and Rx buffer */
	transaction.tx_buf = (unsigned long)send;
	transaction.rx_buf = (unsigned long)receive;

	/* Override No. of bytes per transaction */
	transaction.len = numBytes;

	/* Perform a SPI Transaction */
	if (ioctl(fd, SPI_IOC_MESSAGE(1), &transaction)<0)
	{
		perror("SPI: SPI_IOC_MESSAGE Failed |");
		return -1;
	}
	return 0;
}

void Spi::cleanup() {
	close(fd);
}
