/*
 * Spi_Codec.cpp
 *
 * Copyright (C) 2017 Henrik Langer henni19790@googlemail.com
 */

#include "../include/Spi_Codec.h"

//#define CTAG_BEAST_16CH

#include <unistd.h>
#include <fcntl.h>
#include <iostream>
#include <sys/ioctl.h>
#include <linux/spi/spidev.h>
#include <cstring>

#define ARRAY_SIZE(array) sizeof(array)/sizeof(array[0])

const char SPIDEV_GPIO_CS0[] = "/dev/spidev32766.0";
const char SPIDEV_GPIO_CS1[] = "/dev/spidev32766.1";

Spi_Codec::Spi_Codec(){
	if ((_fd_master = open(SPIDEV_GPIO_CS0, O_RDWR)) < 0)
		printf("Failed to open spidev device for master codec.\n");
	if ((_fd_slave = open(SPIDEV_GPIO_CS1, O_RDWR)) < 0)
		printf("Failed to open spidev device for slave codec.\n");
}

Spi_Codec::~Spi_Codec(){
	close(_fd_master);
	close(_fd_slave);
}

int Spi_Codec::writeRegister(unsigned char reg, unsigned char value, CODEC_TYPE codec){
	int fd;

	unsigned char tx[3], rx[3];
	tx[0] = 0x8;
	tx[1] = reg;
	tx[2] = value;

	codec == MASTER_CODEC ? fd = _fd_master : fd = _fd_slave;

	return _spiTransfer(tx, rx, 3, codec);	
}

unsigned char Spi_Codec::readRegister(unsigned char reg, CODEC_TYPE codec){
	int fd;

	unsigned char tx[3], rx[3];
	tx[0] = 0x9;
	tx[1] = reg;
	tx[2] = 0x0;

	codec == MASTER_CODEC ? fd = _fd_master : fd = _fd_slave;

	_spiTransfer(tx, rx, 3, codec);

	return rx[2];
}

int Spi_Codec::initCodec(){
	// disable PLL, enable DAC / ADC
	writeRegister(REG_PLL_CLK_CONTROL_0, 0x85);
	// DAC / ADC clock source = PLL, On-chip voltage reference enabled
	writeRegister(REG_PLL_CLK_CONTROL_1, 0x00);
	// 48 kHz sample rate, SDATA delay = 1, TDM mode
	writeRegister(REG_DAC_CONTROL_0, 0x40);
#ifdef CTAG_BEAST_16CH
	// Latch in mid cycle, 16 channels, inverted bclock, inverted wclock, bclock / wclock in slave mode
	writeRegister(REG_DAC_CONTROL_1, 0x0E);
#else
	// Latch in mid cycle, 8 channels, inverted bclock, inverted wclock, bclock / wclock in slave mode
	writeRegister(REG_DAC_CONTROL_1, 0x0C);
#endif
	// Unmute DACs, 16 bit word width, noninverted DAC output polarity
	writeRegister(REG_DAC_CONTROL_2, 0x18);
	// Unmute all DACs
	writeRegister(REG_DAC_CHANNEL_MUTES, 0x00);
	// Volume DAC1 L = 0dB
	writeRegister(REG_DAC_VOLUME_L1, 0x00);
	// Volume DAC1 R = 0dB
	writeRegister(REG_DAC_VOLUME_R1, 0x00);
	// Volume DAC2 L = 0dB
	writeRegister(REG_DAC_VOLUME_L2, 0x00);
	// Volume DAC2 R = 0dB
	writeRegister(REG_DAC_VOLUME_R2, 0x00);
	// Volume DAC3 L = 0dB
	writeRegister(REG_DAC_VOLUME_L3, 0x00);
	// Volume DAC3 R = 0dB
	writeRegister(REG_DAC_VOLUME_R3, 0x00);
	// Volume DAC4 L = 0dB
	writeRegister(REG_DAC_VOLUME_L4, 0x00);
	// Volume DAC4 R = 0dB
	writeRegister(REG_DAC_VOLUME_R4, 0x00);
	// Power up ADCs, unmute ADCs, disable high pass filter, 48 kHz sample rate
	writeRegister(REG_ADC_CONTROL_0, 0x00);
	// 16 bit word width, SDATA delay = 1, TDM mode, latch in mid cycle
	writeRegister(REG_ADC_CONTROL_1, 0x23);
#ifdef CTAG_BEAST_16CH
	// wclock format = 50/50, 16 channels, inverted bclock, inverted wclock, bclock / wclock is master
	writeRegister(REG_ADC_CONTROL_2, 0x7C);
#else
	// wclock format = 50/50, 8 channels, inverted bclock, inverted wclock, bclock / wclock is master
	writeRegister(REG_ADC_CONTROL_2, 0x6C);
#endif

#ifdef CTAG_BEAST_16CH
	// enable PLL, enable DAC / ADC
	writeRegister(REG_PLL_CLK_CONTROL_0, 0xA4, SLAVE_CODEC);
	// DAC / ADC clock source = PLL, On-chip voltage reference enabled
	writeRegister(REG_PLL_CLK_CONTROL_1, 0x00, SLAVE_CODEC);
	// 48 kHz sample rate, SDATA delay = 1, TDM mode
	writeRegister(REG_DAC_CONTROL_0, 0x40, SLAVE_CODEC);
	// Latch in mid cycle, 16 channels, inverted bclock, inverted wclock, bclock / wclock in slave mode
	writeRegister(REG_DAC_CONTROL_1, 0x0E, SLAVE_CODEC);
	// Unmute DACs, 16 bit word width, noninverted DAC output polarity
	writeRegister(REG_DAC_CONTROL_2, 0x18, SLAVE_CODEC);
	// Unmute all DACs
	writeRegister(REG_DAC_CHANNEL_MUTES, 0x00, SLAVE_CODEC);
	// Volume DAC1 L = 0dB
	writeRegister(REG_DAC_VOLUME_L1, 0x00, SLAVE_CODEC);
	// Volume DAC1 R = 0dB
	writeRegister(REG_DAC_VOLUME_R1, 0x00, SLAVE_CODEC);
	// Volume DAC2 L = 0dB
	writeRegister(REG_DAC_VOLUME_L2, 0x00, SLAVE_CODEC);
	// Volume DAC2 R = 0dB
	writeRegister(REG_DAC_VOLUME_R2, 0x00, SLAVE_CODEC);
	// Volume DAC3 L = 0dB
	writeRegister(REG_DAC_VOLUME_L3, 0x00, SLAVE_CODEC);
	// Volume DAC3 R = 0dB
	writeRegister(REG_DAC_VOLUME_R3, 0x00, SLAVE_CODEC);
	// Volume DAC4 L = 0dB
	writeRegister(REG_DAC_VOLUME_L4, 0x00, SLAVE_CODEC);
	// Volume DAC4 R = 0dB
	writeRegister(REG_DAC_VOLUME_R4, 0x00, SLAVE_CODEC);
	// Power up ADCs, unmute ADCs, disable high pass filter, 48 kHz sample rate
	writeRegister(REG_ADC_CONTROL_0, 0x00, SLAVE_CODEC);
	// 16 bit word width, SDATA delay = 1, TDM mode, latch in mid cycle
	writeRegister(REG_ADC_CONTROL_1, 0x23, SLAVE_CODEC);
	// wclock format = 50/50, 16 channels, inverted bclock, inverted wclock, bclock / wclock is master
	writeRegister(REG_ADC_CONTROL_2, 0x34, SLAVE_CODEC);
#endif
	
	return 0;
}

int Spi_Codec::startAudio(int dummy_parameter){
	// enable PLL / DAC / ADC
	return writeRegister(REG_PLL_CLK_CONTROL_0, 0x84);
}

int Spi_Codec::stopAudio(){
	// edisable PLL / DAC / ADC
	return writeRegister(REG_PLL_CLK_CONTROL_0, 0x81);
}

int Spi_Codec::setDACVolume(int halfDbSteps){
	// Calculcate volume from half dB in 3/8 dB steps und cast to int
	_dacVolumethreeEighthsDbs = (int) ((float) halfDbSteps * (1.0 + 1.0/3.0));

	return _writeDACVolumeRegisters(false);
}

int Spi_Codec::dumpRegisters(){
	for (unsigned char i=0; i <= 16; i++){
		printf("AD1938 Master Register %d: 0x%X\n", i, readRegister(i));
#ifdef CTAG_BEAST_16CH
		printf("AD1938 Slave Register  %d: 0x%X\n", i, readRegister(i, SLAVE_CODEC));
#endif
	}

	return 0;
}

int Spi_Codec::_writeDACVolumeRegisters(bool mute){
	unsigned char volumeBits = 0;

	if (_dacVolumethreeEighthsDbs < 0){
		volumeBits = -_dacVolumethreeEighthsDbs;
		if (_dacVolumethreeEighthsDbs > 95)
			volumeBits = 255;
	}

	if (mute){
		if (writeRegister(REG_DAC_CHANNEL_MUTES, 0xFF, MASTER_CODEC))
			return 1;
#ifdef CTAG_BEAST_16CH
		if (writeRegister(REG_DAC_CHANNEL_MUTES, 0xFF, SLAVE_CODEC))
			return 1;
#endif
	}
	else {
		if (writeRegister(REG_DAC_VOLUME_L1, volumeBits, MASTER_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_R1, volumeBits, MASTER_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_L2, volumeBits, MASTER_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_R2, volumeBits, MASTER_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_L3, volumeBits, MASTER_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_R3, volumeBits, MASTER_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_L4, volumeBits, MASTER_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_R4, volumeBits, MASTER_CODEC))
			return 1;
		if (writeRegister(REG_DAC_CHANNEL_MUTES, 0x0, MASTER_CODEC)) // Unmute all DACs
			return 1;
#ifdef CTAG_BEAST_16CH
		if (writeRegister(REG_DAC_VOLUME_L1, volumeBits, SLAVE_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_R1, volumeBits, SLAVE_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_L2, volumeBits, SLAVE_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_R2, volumeBits, SLAVE_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_L3, volumeBits, SLAVE_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_R3, volumeBits, SLAVE_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_L4, volumeBits, SLAVE_CODEC))
			return 1;
		if (writeRegister(REG_DAC_VOLUME_R4, volumeBits, SLAVE_CODEC))
			return 1;
		if (writeRegister(REG_DAC_CHANNEL_MUTES, 0x0, SLAVE_CODEC)) // Unmute all DACs
			return 1;
#endif
	}

	return 0;
}

int Spi_Codec::_spiTransfer(unsigned char* tx_buf, unsigned char* rx_buf, size_t bytes, CODEC_TYPE codec){
	int ret;

	struct spi_ioc_transfer tr;
	memset(&tr, 0, sizeof(tr));
	tr.tx_buf = (unsigned long) tx_buf;
	tr.rx_buf = (unsigned long) rx_buf;
	tr.len = bytes;
	tr.bits_per_word = 8;

	int fd;
	codec == MASTER_CODEC ? fd = _fd_master : fd = _fd_slave;

	ret = ioctl(fd, SPI_IOC_MESSAGE(1), &tr);
	if (ret < 0){
		printf("Error during SPI transmission for CTAG face: %d\n", ret);
		return 1;
	}

	if (!(tx_buf[0] & 1)){ // Verify registers, if new value has been written
		unsigned char origValue = tx_buf[2];
		tx_buf[0] = tx_buf[0] | 0x1; // Set read only flag
		ret = ioctl(fd, SPI_IOC_MESSAGE(1), &tr);
		if (ret < 0){
			printf("Error in SPI transmission during verification of register values of CTAG face: %d\n", ret);
			return 1;
		}
		if (origValue != rx_buf[2] && tx_buf[1] != REG_PLL_CLK_CONTROL_1){
			printf("Verification of new value for register 0x%X of CTAG face has been failed (original value: 0x%X, new value: 0x%X).\n", tx_buf[1], origValue, rx_buf[2]);
			return 1;
		}
		tx_buf[0] = tx_buf[0] & 0x0; // Reset write only flag
	}
 
	return 0;
}
