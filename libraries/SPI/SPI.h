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

#include <Bela.h>
#include <stddef.h>
#include <sys/ioctl.h>
#include <linux/spi/spidev.h>

class SPI {
public:
	/* Generic Definitions */
	static const int SS_HIGH = 1;
	static const int SS_LOW = 0;
	static const int ONE_BYTE = 1;
	
	/* Enum SPI Modes*/
	typedef enum{
		MODE0 = 0,
		MODE1 = 1,
		MODE2 = 2,
		MODE3 = 3
	} MODE;
	
    SPI();
    ~SPI();
    /**
     * Initialize the device
     *
     * @param device path to the device file (e.g.: `/dev/spidev2.1`)
     * @param speed clock rate in Hz
     * @param chipSelect SS pin
     * @param delay delay after the last bit transfer before deselecting the device 
     * @param speed SPI clock rate in Hz
     * @param numBits No. of bits per transaction
     * @param mode SPI mode for RD and WR operations
     * @return 0 on success, an error code otherwise.
     */
    int setup(const char* device = "/dev/spidev2.1", /* unsigned long numBytes,*/
    		  unsigned long speed = 500000,
              unsigned char chipSelect = SS_LOW,
              unsigned short delay = 0,
              unsigned char numBits = 8,
              unsigned char mode = MODE3);
    /**
     * Perform one or multiple SPI transactions.
     *
     * @send: Points to the buffer containing the data to be sent
     * @receive: Points to the buffer into which the received 
     * bytes will be stored
     * @numBytes: length of buffers in bytes.
     *
     * @return 0 on success, -1 on failure
     */
    int transfer(unsigned char *send, unsigned char *receive,
                 unsigned char numBytes);
    /**
     * Perform a single-byte SPI transaction.
     *
     * @send: The byte to be sent
     *
     * @return the received byte, -1 on failure
     */
    unsigned char singleTransfer(unsigned char send);
    /**
     * Close the device.
     */
    void cleanup();
private:
    const char* device;
    //unsigned long numBytes;
    unsigned long speed;
    unsigned char chipSelect;
    unsigned short delay;
    unsigned char numBits;
    unsigned char mode;
    int fd;
    struct spi_ioc_transfer transaction;
    int openDevice(const char* device);
    int setMode(unsigned char mode);
    int setNumBits(unsigned char numBits);
    int setSpeed(unsigned long speed);
};
