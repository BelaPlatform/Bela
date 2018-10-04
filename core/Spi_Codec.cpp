/*
 * Spi_Codec.cpp
 *
 * Copyright (C) 2017 Henrik Langer henni19790@googlemail.com
 */

#include "../include/Spi_Codec.h"
#include "../include/GPIOcontrol.h"

const int RESET_PIN = 81; // GPIO2(17) P8.34

#include <unistd.h>
#include <fcntl.h>
#include <iostream>
#include <sys/ioctl.h>
#include <linux/spi/spidev.h>
#include <cstring>

Spi_Codec::Spi_Codec(const char* spidev_gpio_cs0, const char* spidev_gpio_cs1, bool isVerbose /* = false */)
{

	_verbose = isVerbose;
	// Open SPI devices
	if ((_fd_master = open(spidev_gpio_cs0, O_RDWR)) < 0)
		_verbose && fprintf(stderr, "Failed to open spidev device for master codec.\n");
	if (!spidev_gpio_cs1)
	       _fd_slave = -1;
	else if((_fd_slave = open(spidev_gpio_cs1, O_RDWR)) < 0)
		_verbose && fprintf(stderr, "Failed to open spidev device for slave codec.\n");

	// Prepare reset pin and reset audio codec(s)
	gpio_unexport(RESET_PIN);
	if(gpio_export(RESET_PIN)) {
		_verbose && fprintf(stderr, "Warning: couldn't reset pin for audio codecs\n");
	}
	if(gpio_set_dir(RESET_PIN, OUTPUT_PIN)) {
		_verbose && fprintf(stderr, "Couldn't set direction on audio codec reset pin\n");
	}
	if(gpio_set_value(RESET_PIN, LOW)) {
		_verbose && fprintf(stderr, "Couldn't set value on audio codec reset pin\n");
	}

	usleep(10000);

	// Wake up audio codec(s)
	if(gpio_set_value(RESET_PIN, HIGH)) {
		_verbose && fprintf(stderr, "Couldn't set value on audio codec reset pin\n");
	}

	usleep(10000);
	// now we can detect if there is a slave codec
	_isBeast = slaveIsDetected();
}

Spi_Codec::~Spi_Codec(){
	close(_fd_master);
	close(_fd_slave);
    gpio_unexport(RESET_PIN);
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

	// Initialize master codec
	// Disable PLL, enable DAC / ADC
	writeRegister(REG_PLL_CLK_CONTROL_0, 0x9D);
	// DAC / ADC clock source = PLL, On-chip voltage reference enabled
	writeRegister(REG_PLL_CLK_CONTROL_1, 0x00);
	// 48 kHz sample rate, SDATA delay = 1, TDM mode
	writeRegister(REG_DAC_CONTROL_0, 0x40);
	if(_isBeast)
	{
		// Latch in mid cycle, 16 channels, normal bclock, inverted wclock, bclock / wclock in slave mode
		writeRegister(REG_DAC_CONTROL_1, 0x0E);
	} else {
		// Latch in mid cycle, 8 channels, normal bclock, inverted wclock, bclock / wclock in slave mode
		writeRegister(REG_DAC_CONTROL_1, 0x0C);
	}
	// Unmute DACs, 16 bit word width, noninverted DAC output polarity, flat de-emphasis
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
	if(_isBeast)
	{
		// wclock format = 50/50, 16 channels, normal bclock, inverted wclock, bclock / wclock in master mode
		writeRegister(REG_ADC_CONTROL_2, 0x7C);
	} else {
		// wclock format = 50/50, 8 channels, normal bclock, inverted wclock, bclock / wclock in master mode
		writeRegister(REG_ADC_CONTROL_2, 0x6C);
	}

	// Initialize slave codec
	if(_isBeast)
	{
		// Enable PLL, enable DAC / ADC
		writeRegister(REG_PLL_CLK_CONTROL_0, 0xBC, SLAVE_CODEC);
		// DAC / ADC clock source = PLL, On-chip voltage reference enabled
		writeRegister(REG_PLL_CLK_CONTROL_1, 0x00, SLAVE_CODEC);
		// 48 kHz sample rate, SDATA delay = 1, TDM mode
		writeRegister(REG_DAC_CONTROL_0, 0x40, SLAVE_CODEC);
		// Latch in mid cycle, 16 channels, normal bclock, inverted wclock, bclock / wclock in slave mode
		writeRegister(REG_DAC_CONTROL_1, 0x0E, SLAVE_CODEC);
		// Unmute DACs, 16 bit word width, noninverted DAC output polarity, flat de-emphasis
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
		// wclock format = 50/50, 16 channels, normal bclock, inverted wclock, bclock / wclock in slave mode
		writeRegister(REG_ADC_CONTROL_2, 0x34, SLAVE_CODEC);
	} // _isBeast

	usleep(10000);
	return 0;
}

int Spi_Codec::startAudio(int dummy_parameter){
	// Enable PLL
	return writeRegister(REG_PLL_CLK_CONTROL_0, 0x9C);
}

int Spi_Codec::stopAudio(){
	// Disable PLL
	return writeRegister(REG_PLL_CLK_CONTROL_0, 0x9D);
}

int Spi_Codec::setDACVolume(int halfDbSteps){
	// Calculcate volume from half dB in 3/8 dB steps und cast to int
	_dacVolumethreeEighthsDbs = (int) ((float) halfDbSteps * (1.0 + 1.0/3.0));

	return _writeDACVolumeRegisters(false);
}

int Spi_Codec::dumpRegisters(){
	for (unsigned char i=0; i <= 16; i++){
		printf("AD1938 Master Register %d: 0x%X\n", i, readRegister(i));
		if(_isBeast)
			printf("AD1938 Slave Register  %d: 0x%X\n", i, readRegister(i, SLAVE_CODEC));
	}

	return 0;
}

bool Spi_Codec::masterIsDetected(){
	unsigned char statusReg = 0;

	// Detect master codec by writing and reading back a test value
	writeRegister(REG_DAC_CONTROL_2, 0x18, MASTER_CODEC);
	statusReg = readRegister(REG_DAC_CONTROL_2, MASTER_CODEC);
	
	return (statusReg == 0x18);
}

bool Spi_Codec::slaveIsDetected(){
	unsigned char statusReg = 0;

	// Detect slave codec by writing and reading back a test value
	writeRegister(REG_DAC_CONTROL_2, 0x18, SLAVE_CODEC);
	statusReg = readRegister(REG_DAC_CONTROL_2, SLAVE_CODEC);

	return (statusReg == 0x18);
}

int Spi_Codec::reset(){
	if(gpio_set_value(RESET_PIN, LOW)) {
		_verbose && fprintf(stderr, "Couldn't set value on audio codec reset pin\n");
		return -1;
	}

	usleep(10000);

	if(gpio_set_value(RESET_PIN, HIGH)) {
		_verbose && fprintf(stderr, "Couldn't set value on audio codec reset pin\n");
		return -1;
	}

	usleep(10000);

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
		if(_isBeast) {
			if (writeRegister(REG_DAC_CHANNEL_MUTES, 0xFF, SLAVE_CODEC))
				return 1;
		}
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
		if(_isBeast) {
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
			// Unmute all DACs
			if (writeRegister(REG_DAC_CHANNEL_MUTES, 0x0, SLAVE_CODEC))
				return 1;
		}
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
	if(fd < 0)
		return 1;

	ret = ioctl(fd, SPI_IOC_MESSAGE(1), &tr);
	if (ret == -1){
		fprintf(stderr, "Error during SPI transmission with CTAG Audio Card: (%d) %s\n", errno, strerror(errno));
		return 1;
	}

	// The following code was used to verify a correct SPI transmission with the external
	// audio codecs. To check if the codecs (master and slave) are available, two 
	// dedicated member functions (masterIsDetected and slaveIsDetected) have
	// been added to Spi_Codec class. The availability is checked by writing and reading
	// back a test value. Hence, the verification of the register contents can be 
	// omitted here. Still, this code may be useful in the future.
	/*
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
	*/
 
	return 0;
}
