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

#include "SPI.h"
#include <stdio.h>
#include <fcntl.h>
#include <string.h>
#include <stdint.h>
#include <unistd.h>
#include <sys/ioctl.h>
#include <linux/spi/spidev.h>

SPI::SPI() {}
SPI::~SPI() {
    cleanup();
}

int SPI::setup (const char* device, /* unsigned long numBytes,*/ unsigned long speed,
                unsigned char chipSelect, unsigned short delay,
                unsigned char numBits, unsigned char mode) {
    //numBytes = numBytes;
    this->chipSelect = chipSelect;
    this->delay = delay;
    this->device = device;
    
    if (openDevice(device) < 0) {
        fprintf(stderr, "SPI: Failed to open %s", device);
        perror(" |");
        return -1;
    }

    /* Set the SPI mode for RD and WR operations */
    if(setMode(mode) == -1)
    {
        perror("SPI: Failed to set SPIMODE |");
        return -1;
    }

    /* Set the No. of bits per transaction */
    if(setNumBits(numBits) == -1)
    {
        perror("SPI: Failed to set No. of bits per word |");
        return -1;
    }

    /* Set the SPI bus speed in Hz */
    if(setSpeed(speed) == -1)
    {
        perror("SPI: Failed to set SPI bus frequency |");
        fprintf(stderr, "speed: %ld\n", speed);
        return -1;
    }
    
    /* Initialize the spi_ioc_transfer structure that will be passed to the
     * KERNEL to define/configure each SPI Transactions */
    
    //transaction.tx_buf = 0; // Set in transfer()
    //transaction.rx_buf = 0; // Set in transfer()
    transaction.pad = 0;
    transaction.tx_nbits = 0;
    transaction.rx_nbits = 0;
    //transaction.len = numBytes; // Set in transfer()
    //transaction.speed_hz = speed; // Set in setSpeed()
    transaction.delay_usecs = delay;
    //transaction.bits_per_word = numBits; // Set in setNumBits()
    transaction.cs_change = chipSelect;
    
    return 0;
}

int SPI::openDevice(const char* device){
    this->device = device;
    fd = open(device, O_RDWR);
    return fd;
}

int SPI::setMode(unsigned char mode)
{
    this->mode = mode;
    int ret = 0;
    if(ioctl(fd, SPI_IOC_WR_MODE, &mode)==-1)
        ret = -1;
    if(ioctl(fd, SPI_IOC_RD_MODE, &mode)==-1)
        ret = -1;
    return (ret);
}

int SPI::setNumBits(unsigned char numBits)
{
    this->numBits = numBits;
    transaction.bits_per_word = numBits;
    int ret = 0;
    if(ioctl(fd, SPI_IOC_WR_BITS_PER_WORD, &numBits)==-1)
        ret = -1;
    if(ioctl(fd, SPI_IOC_RD_BITS_PER_WORD, &numBits)==-1)
        ret = -1;
    return (ret);
    }

int SPI::setSpeed(unsigned long speed)
{
    this->speed = speed;
    transaction.speed_hz = speed;
    int ret = 0;
    if(ioctl(fd, SPI_IOC_WR_MAX_SPEED_HZ, &speed)==-1)
        ret = -1;
    if(ioctl(fd, SPI_IOC_RD_MAX_SPEED_HZ, &speed)==-1)
        ret = -1;
    return (ret);
}

int SPI::transfer(unsigned char *send, unsigned char *receive,
        unsigned char numBytes)
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

unsigned char SPI::singleTransfer(unsigned char send)
{
    unsigned char receive = 0;

    /* Override No. of bytes to send and receive one byte */
    transaction.len = ONE_BYTE;

    /* Points to the address of Tx and Rx variable  */
    transaction.tx_buf = (unsigned long)&send;
    transaction.rx_buf = (unsigned long)&receive;

    /* Perform an SPI Transaction */
    if (ioctl(fd, SPI_IOC_MESSAGE(1), &transaction)<0)
    {
        perror("SPI: SPI_IOC_MESSAGE Failed |");
        receive = -1;
    }
    return (receive);
}

/* Clean up */
void SPI::cleanup() {
    close(fd);
    }
    
    
    