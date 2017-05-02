/*
 * Spi_Codec.cpp
 *
 * Copyright (C) 2017 Henrik Langer henni19790@googlemail.com
 */

//TODO: Check if verification of registers works correctly after they have been written
//TODO: Improve error detection (i.e. evaluate return value)
//TODO: Check if AD1938 has to be in DSP mode => doesn't support DSP mode => McASP has to be changed
//TODO: Don't overwrite complete registers (i.e. get current value and only change specific bits)
//TODO: Implement half dB steps for volume control
//TODO: Implement TDM slot configuration
//TODO: Check if slot width of 16 bit is allowed in tdm mode for ad1938

#include "../include/Spi_Codec.h"

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
		rt_printf("Failed to open spidev device for master codec.\n");
	if ((_fd_slave = open(SPIDEV_GPIO_CS1, O_RDWR)) < 0)
		rt_printf("Failed to open spidev device for slave codec.\n");
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
	// Latch in mid cycle, 8 channels, inverted bclock, inverted wclock, bclock / wclock in master mode
	writeRegister(REG_DAC_CONTROL_1, 0x3C);
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
	// wclock format = 50/50, 8 channels, inverted bclock, inverted wclock, bclock / wclock is master
	writeRegister(REG_ADC_CONTROL_2, 0x24);
	
	return 0;
}

int Spi_Codec::startAudio(int dummy_parameter){
	// enable PLL / DAC / ADC
	writeRegister(REG_PLL_CLK_CONTROL_0, 0x84);

	return 0;
}

int Spi_Codec::stopAudio(){
	// edisable PLL / DAC / ADC
	writeRegister(REG_PLL_CLK_CONTROL_0, 0x81);

	return 0;
}

int Spi_Codec::setAudioSamplingRate(unsigned int newSamplingRate){
	/*switch(newSamplingRate){
		case 48000:
			// 48 kHz sample rate, SDATA delay = 0, TDM mode
			// TODO: Check if TDM mode is correct (tlv codec is in DSP mode)
			writeRegister(REG_DAC_CONTROL_0, 0x48);
			// Power up ADCs, unmute ADCs, disable high pass filter, 48 kHz sample rate
			writeRegister(REG_ADC_CONTROL_0, 0x00);
			break;
		case 96000:
			// 96 kHz sample rate, SDATA delay = 0, TDM mode
			// TODO: Check if TDM mode is correct (tlv codec is in DSP mode)
			writeRegister(REG_DAC_CONTROL_0, 0x4A);
			// Power up ADCs, unmute ADCs, disable high pass filter, 96 kHz sample rate
			writeRegister(REG_ADC_CONTROL_0, 0x40);
		break;
		case 192000:
			// 192 kHz sample rate, SDATA delay = 0, TDM mode
			// TODO: Check if TDM mode is correct (tlv codec is in DSP mode)
			writeRegister(REG_DAC_CONTROL_0, 0x4C);
			// Power up ADCs, unmute ADCs, disable high pass filter, 192 kHz sample rate
			writeRegister(REG_ADC_CONTROL_0, 0x80);
		break;
		default:
			std::cout << "AD1938 doesn't support a sample rate of " << newSamplingRate << "." <<
			std::endl << "Using 48000 kHz." << std::endl;
			// 48 kHz sample rate, SDATA delay = 0, TDM mode
			// TODO: Check if TDM mode is correct (tlv codec is in DSP mode)
			writeRegister(REG_DAC_CONTROL_0, 0x48);
			// Power up ADCs, unmute ADCs, disable high pass filter, 48 kHz sample rate
			writeRegister(REG_ADC_CONTROL_0, 0x00);
		break;
	}*/

	return 0;
}

unsigned int Spi_Codec::getAudioSamplingRate(){
	unsigned char sampleRate = readRegister(REG_DAC_CONTROL_0);

	switch(sampleRate & 0x6){ //assume that sample rate for DAC and ADC are always equal
		case 0x0:
			return 48000;
			break;
		case 0x1:
			return 96000;
			break;
		case 0x2:
			return 192000;
			break;
		default:
			rt_printf("Requested unsupported sample rate for CTAG face.\n");
			return 0;
			break;
	}
}

int Spi_Codec::setDACVolume(int halfDbSteps){

	return 0;
}

int Spi_Codec::setTDMSlots(unsigned int slots){
	switch (slots){
		case 2:
		break;
		case 4:
		break;
		case 8:
		break;
		case 16:
		break;
		default:
		break;
	}

	return 0;
}

int Spi_Codec::getTDMSlots(){

	return 0;
}

int Spi_Codec::dumpRegisters(){
	for (unsigned char i=0; i <= 16; i++)
		rt_printf("AD1938 Register %d: 0x%X\n", i, readRegister(i));

	return 0;
}

int Spi_Codec::_spiTransfer(unsigned char* tx_buf, unsigned char* rx_buf, size_t bytes, CODEC_TYPE codec){
	int ret;

	struct spi_ioc_transfer tr;
	memset(&tr, 0, sizeof(tr));
	tr.tx_buf = (unsigned long) tx_buf;
	tr.rx_buf = (unsigned long) rx_buf;
	tr.len = bytes; //ARRAY_SIZE(tx_buf);
	tr.bits_per_word = 8;

	int fd;
	codec == MASTER_CODEC ? fd = _fd_master : fd = _fd_slave;

	ret = ioctl(fd, SPI_IOC_MESSAGE(1), &tr);
	if (ret < 0){
		rt_printf("Error during SPI transmission for CTAG face: %d\n", ret);
		return 1;
	}

	if (!(tx_buf[0] & 1)){ //verify registers, if new value has been written
		unsigned char origValue = tx_buf[2];
		tx_buf[0] = tx_buf[0] | 0x1; //set read only flag
		ret = ioctl(fd, SPI_IOC_MESSAGE(1), &tr);
		if (ret < 0){
			rt_printf("Error in SPI transmission during verification of register values of CTAG face: %d\n", ret);
			return 1;
		}
		if (origValue != rx_buf[2] && tx_buf[1] != REG_PLL_CLK_CONTROL_1){
			rt_printf("Verification of new value for register 0x%X of CTAG face has been failed (original value: 0x%X, new value: 0x%X).\n", tx_buf[1], origValue, rx_buf[2]);
			return 1;
		}
		tx_buf[0] = tx_buf[0] & 0x0; //reset write only flag
	}
 
	return 0;
}
