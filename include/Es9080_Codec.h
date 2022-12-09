#pragma once

#include "AudioCodec.h"
#include "I2c.h"
#include <Gpio.h>
#include <array>

class Es9080_Codec : public I2c, public AudioCodec
{
public:
	Es9080_Codec(int i2cBus, int i2cAddress, AudioCodecParams::ClockSource clockSource, int resetPin, double mclkFrequency, bool isVerbose);
	~Es9080_Codec();

	int initCodec();
	int startAudio(int parameter);
	int stopAudio();
	unsigned int getNumIns();
	unsigned int getNumOuts();
	float getSampleRate();
	int setInputGain(int channel, float newGain);
	int setLineOutVolume(int channel, float gain);
	int setHpVolume(int channel, float gain);
	int disable();
	int reset();
	McaspConfig& getMcaspConfig();

	int writeRegister(unsigned int reg, unsigned int value);
	int readRegister(unsigned char reg);

private:
	enum {kNumOutChannels = 8};
	int writeLineOutVolumeRegisters();
	int setClocks(unsigned int divide_value, bool MASTER_BCK_DIV1, bool is16Bit, unsigned int MASTER_WS_SCALE);
protected:
	int executeProgram(const std::string& program);
	std::array<float,kNumOutChannels> lineOutVolume{};
	AudioCodecParams params;
	McaspConfig mcaspConfig;
	bool running;
	bool verbose;
	int setAddressForReg(unsigned int reg, bool write);
	int currentAddress = 0xFF;
	Gpio gpio;
};
