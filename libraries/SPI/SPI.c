/*
MIT License

Copyright (c) 2017 DeeplyEmbedded

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
* SPI.c
*
*  Created on  : September 5, 2017
*  Author      : Vinay Divakar
*  Description : This is an SPI Library for the BeagleBone that consists of the API's to enable
                  full duplex SPI transactions.
*  Note        : This Library has been tested to work in all the modes i.e. SPI_MODE0, SPI_MODE1,
*                SPI_MODE2 and SPI_MODE3. At present, this Library only supports spidev1.0, however
*                it can be extended to support other spidev1.x or spidev2.x as well. 
*/

/*Custom Libs Includes*/
#include "SPI.h"

/*Lib Includes*/
#include<stdio.h>
#include<fcntl.h>
#include<string.h>
#include<stdint.h>
#include<unistd.h>
#include<sys/ioctl.h>
#include<linux/spi/spidev.h>

/* Static objects for spidev1.0 */
static SPI_DeviceT SPI_device1;
static struct spi_ioc_transfer	transfer_spidev1;

/****************************************************************
 * Function Name : Open_device
 * Description   : Opens the SPI device to use
 * Returns       : 0 on success, -1 on failure
 * Params        @spi_dev_path: Path to the SPI device
 *               @fd: Variable to store the file handler
 ****************************************************************/
int Open_device(const char *spi_dev_path, int *fd)
{
	if((*fd = open(spi_dev_path, O_RDWR))<0)
		return -1;
	else
		return 0;
}

/****************************************************************
 * Function Name : Set_SPI_mode
 * Description   : Set the SPI mode of operation
 * Returns       : 0 on success, -1 on failure
 * Params        @fd: File handler
 *               @spi_mode: SPI Mode
 ****************************************************************/
int Set_SPI_mode(int fd, unsigned char spi_mode)
{
	int ret = 0;
	if(ioctl(fd, SPI_IOC_WR_MODE, &spi_mode)==-1)
		ret = -1;
	if(ioctl(fd, SPI_IOC_RD_MODE, &spi_mode)==-1)
		ret = -1;
	return (ret);
}

/****************************************************************
 * Function Name : Set_SPI_bits
 * Description   : Set the No. of bits/transaction
 * Returns       : 0 on success, -1 on failure
 * Params        @fd: File handler
 *               @bits_per_word: No. of bits
 ****************************************************************/
int Set_SPI_bits(int fd, unsigned char bits_per_word)
{
	int ret = 0;
	if(ioctl(fd, SPI_IOC_WR_BITS_PER_WORD, &bits_per_word)==-1)
		ret = -1;
	if(ioctl(fd, SPI_IOC_RD_BITS_PER_WORD, &bits_per_word)==-1)
		ret = -1;
	return (ret);
}

/****************************************************************
 * Function Name : Set_SPI_speed
 * Description   : Set the SPI bus frequency in Hertz(Hz)
 * Returns       : 0 on success, -1 on failure
 * Params        @fd: File handler
 *               @bus_speed_HZ: Bus speed
 ****************************************************************/
int Set_SPI_speed(int fd, unsigned long bus_speed_HZ)
{
	int ret = 0;
	if(ioctl(fd, SPI_IOC_WR_MAX_SPEED_HZ, &bus_speed_HZ)==-1)
		ret = -1;
	if(ioctl(fd, SPI_IOC_RD_MAX_SPEED_HZ, &bus_speed_HZ)==-1)
		ret = -1;
	return (ret);
}

/****************************************************************
 * Function Name : SPI_Config_init
 * Description   : Initialization configuration for the SPI
 *                 device
 * Returns       : None
 * Params        @spi_bytes_no: File handler
 *               @spi_bus_speed: Bus speed
 *               @chip_select: chip select line
 *               @spi_delay: delay in us
 *               @spi_bits_No: No. of bits/transaction
 *               @mode_spi: SPI Mode
 *               @SPI_devicePtr: Points to the SPI device
 *               configuration structure.
 ****************************************************************/
void SPI_Config_init(unsigned long spi_bytes_no, unsigned long spi_bus_speed,
		unsigned char chip_select, unsigned short spi_delay,
		unsigned char spi_bits_No, unsigned char mode_spi, SPI_DevicePtr SPI_devicePtr)
{
	SPI_devicePtr->spi_bytes_num = spi_bytes_no;
	SPI_devicePtr->spi_bus_speedHZ = spi_bus_speed;
	SPI_devicePtr->ss_change = chip_select;
	SPI_devicePtr->spi_delay_us = spi_delay;
	SPI_devicePtr->spi_data_bits_No = spi_bits_No;
	SPI_devicePtr->spi_mode = mode_spi;
	SPI_devicePtr->fd_spi = 0;
	SPI_devicePtr->spi_dev_path = NULL;
}

/****************************************************************
 * Function Name : SPIDEV_init
 * Description   : Initialize and set up spidev
 * Returns       : 0 on success, -1 on failure
 ****************************************************************/
int SPIDEV_init(const char* spidev_path, unsigned long spi_bytes_no, unsigned long spi_bus_speed,
                                           unsigned char chip_select, unsigned short spi_delay,
                                           unsigned char spi_bits_No, unsigned char mode_spi)
{
	/* Initialize the parameters for spidev structure */
	SPI_Config_init(spi_bytes_no, spi_bus_speed, chip_select,
			spi_delay, spi_bits_No, mode_spi, &SPI_device1);

	/* Assign the path to the spidev for use */
	SPI_device1.spi_dev_path = spidev_path;

	/* Open the spidev device */
	if(Open_device(SPI_device1.spi_dev_path, &SPI_device1.fd_spi) == -1)
	{
		fprintf(stderr, "SPI: Failed to open %s", SPI_device1.spi_dev_path);
		perror(" |");
		return -1;
	}

	/* Set the SPI mode for RD and WR operations */
	if(Set_SPI_mode(SPI_device1.fd_spi, SPI_device1.spi_mode) == -1)
	{
		perror("SPI: Failed to set SPIMODE |");
		return -1;
	}

	/* Set the No. of bits per transaction */
	if(Set_SPI_bits(SPI_device1.fd_spi, SPI_device1.spi_data_bits_No) == -1)
	{
		perror("SPI: Failed to set No. of bits per word |");
		return -1;
	}

	/* Set the SPI bus speed in Hz */
	if(Set_SPI_speed(SPI_device1.fd_spi, SPI_device1.spi_bus_speedHZ) == -1)
	{
		perror("SPI: Failed to set SPI bus frequency |");
		fprintf(stderr, "speed: %d\n", SPI_device1.spi_bus_speedHZ);
		return -1;
	}

	/* Initialize the spi_ioc_transfer structure that will be passed to the
	 * KERNEL to define/configure each SPI Transactions*/
	transfer_spidev1.tx_buf = 0;
	transfer_spidev1.rx_buf = 0;
	transfer_spidev1.pad = 0;
	transfer_spidev1.tx_nbits = 0;
	transfer_spidev1.rx_nbits = 0;
	transfer_spidev1.len = SPI_device1.spi_bytes_num;
	transfer_spidev1.speed_hz = SPI_device1.spi_bus_speedHZ;
	transfer_spidev1.delay_usecs = SPI_device1.spi_delay_us;
	transfer_spidev1.bits_per_word = SPI_device1.spi_data_bits_No;
	transfer_spidev1.cs_change = SPI_device1.ss_change;

	return 0;
}

/****************************************************************
 * Function Name : SPIDEV_transfer
 * Description   : Performs a SPI transaction
 * Returns       : 0 on success, -1 on failure
 * Params        @send: Points to the buffer containing the data
 *               to be sent
 *               @receive: Points to the buffer into which the
 *               received bytes are stored
 * NOTE          : Good for multiple transactions
 ****************************************************************/
int SPIDEV_transfer(unsigned char *send, unsigned char *receive,
		unsigned char bytes_num)
{
	/* Points to the Tx and Rx buffer */
	transfer_spidev1.tx_buf = (unsigned long)send;
	transfer_spidev1.rx_buf = (unsigned long)receive;

	/* Override No. of bytes per transaction */
	transfer_spidev1.len = bytes_num;

	/* Perform a SPI Transaction */
	if (ioctl(SPI_device1.fd_spi, SPI_IOC_MESSAGE(1), &transfer_spidev1)<0)
	{
		perror("SPI: SPI_IOC_MESSAGE Failed |");
		return -1;
	}
	return 0;
}

/****************************************************************
 * Function Name : SPIDEV_single_transfer
 * Description   : Performs a single full duplex SPI transaction
 * Returns       : 0 or data on success, -1 on failure
 * Params        @data_byte: Points to the address of the variable
 *               containing the data to be sent.
 * NOTE          : Good for single transactions
 ****************************************************************/
unsigned char SPIDEV_single_transfer(unsigned char data_byte)
{
	unsigned char rec_byte = 0;

	/* Override No. of bytes to send and receive one byte */
	transfer_spidev1.len = SPI_ONE_BYTE;

	/* Points to the address of Tx and Rx variable  */
	transfer_spidev1.tx_buf = (unsigned long)&data_byte;
	transfer_spidev1.rx_buf = (unsigned long)&rec_byte;

	/* Perform an SPI Transaction */
	if (ioctl(SPI_device1.fd_spi, SPI_IOC_MESSAGE(1), &transfer_spidev1)<0)
	{
		perror("SPI: SPI_IOC_MESSAGE Failed |");
		rec_byte = -1;
	}

	return (rec_byte);
}
