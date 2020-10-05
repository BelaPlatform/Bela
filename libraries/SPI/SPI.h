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

* SPI.h
*
*  Created on: Sep 4, 2017
*  Author: Vinay Divakar
*/ 

#ifndef SPI_H_
#define SPI_H_

#ifdef __cplusplus
extern "C"
{
#endif // __cplusplus

#include<stdint.h>

/* Generic Definitions */
#define SPI_SS_HIGH                      1
#define SPI_SS_LOW                       0
#define SPI_ONE_BYTE                     1

/* Enum SPI Modes*/
typedef enum{
	SPI_MODE0 = 0,
	SPI_MODE1 = 1,
	SPI_MODE2 = 2,
	SPI_MODE3 = 3
}SPI_MODE;

/*SPI device configuration structure*/
typedef struct{
	const char* spi_dev_path;
	int fd_spi;
	unsigned long spi_bytes_num;
	unsigned long spi_bus_speedHZ;
	unsigned char ss_change;
	unsigned short spi_delay_us;
	unsigned char spi_data_bits_No;
	unsigned char spi_mode;
}SPI_DeviceT, *SPI_DevicePtr;

/* SPI API's*/
extern int Open_device(const char *spi_dev_path, int *fd);
extern int Set_SPI_mode(int fd, unsigned char spi_mode);
extern int Set_SPI_bits(int fd, unsigned char bits_per_word);
extern int Set_SPI_speed(int fd, unsigned long bus_speed_HZ);
extern void SPI_Config_init(unsigned long spi_bytes_no, unsigned long spi_bus_speed,
                unsigned char chip_select, unsigned short spi_delay,
                unsigned char spi_bits_No, unsigned char mode_spi, SPI_DevicePtr SPI_devicePtr);

/* API's to initialize and use spidev - Configure the Bus as you like*/
extern int SPIDEV_init(const char* spidev_path, unsigned long spi_bytes_no, unsigned long spi_bus_speed,
                                           unsigned char chip_select, unsigned short spi_delay,
                                           unsigned char spi_bits_No, unsigned char mode_spi);
extern int SPIDEV_transfer(unsigned char *send, unsigned char *receive,
                unsigned char bytes_num);
extern unsigned char SPIDEV_single_transfer(unsigned char data_byte);

#ifdef __cplusplus
}
#endif // __cplusplus

#endif /* SPI_H_ */
