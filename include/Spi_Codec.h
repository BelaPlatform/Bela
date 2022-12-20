/*
 * Spi_Codec.h
 *
 * @brief Used for configuration of AD1938 codec for CTAG face2|4 Audio Card via spi-gpio
 *
 * Copyright (C) 2017 Henrik Langer henni19790@googlemail.com
 */

#ifndef SPI_CODEC_H_
#define SPI_CODEC_H_

#include "AudioCodec.h"
#include <cstdlib>

#define REG_PLL_CLK_CONTROL_0 	0
#define REG_PLL_CLK_CONTROL_1 	1
#define REG_DAC_CONTROL_0 		2
#define REG_DAC_CONTROL_1 		3
#define REG_DAC_CONTROL_2 		4
#define REG_DAC_CHANNEL_MUTES 	5
#define REG_DAC_VOLUME_L1 		6
#define REG_DAC_VOLUME_R1 		7
#define REG_DAC_VOLUME_L2 		8
#define REG_DAC_VOLUME_R2 		9
#define REG_DAC_VOLUME_L3 		10
#define REG_DAC_VOLUME_R3 		11
#define REG_DAC_VOLUME_L4 		12
#define REG_DAC_VOLUME_R4 		13
#define REG_ADC_CONTROL_0 		14
#define REG_ADC_CONTROL_1 		15
#define REG_ADC_CONTROL_2 		16

class Spi_Codec : public AudioCodec {

public:
	enum CODEC_TYPE {
		MASTER_CODEC,
		SLAVE_CODEC
	};

	Spi_Codec(const char* spidev_gpio_cs0, const char* spidev_gpio_cs1, bool isVerbose = false);
	~Spi_Codec();

	int writeRegister(unsigned char reg, unsigned char value, CODEC_TYPE codec = MASTER_CODEC);
	unsigned char readRegister(unsigned char reg, CODEC_TYPE codec = MASTER_CODEC);

	int initCodec();
	int startAudio(int shouldBeReady);
	int stopAudio();
	unsigned int getNumIns();
	unsigned int getNumOuts();
	float getSampleRate();
	int dumpRegisters();
	int reset(); // Hard reset of codec(s)
	bool masterIsDetected(); // CTAG face2|4
	bool slaveIsDetected();  // CTAG Beast
	int setLineOutVolume(int channel, float gain);
	int setHpVolume(int channel, float gain) { return 0; };
	int setInputGain(int channel, float newGain) { return 0; };
	int disable() {return 0;};
	McaspConfig& getMcaspConfig();

private:
	int _fd_master, _fd_slave;
	std::vector<int> _dacVolumethreeEighthsDbs;
	int _writeDACVolumeRegisters(bool mute);
	int _spiTransfer(unsigned char* tx_buf, unsigned char* rx_buf, size_t bytes, CODEC_TYPE codec = MASTER_CODEC);
	McaspConfig mcaspConfig;
	bool _isBeast = false;
	bool _verbose;
	bool _shouldPinmux;
};

#endif /* SPI_CODEC_H_ */
