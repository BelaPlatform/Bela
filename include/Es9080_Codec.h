#pragma once

#include "AudioCodec.h"
#include "I2c.h"
#include <array>

class Es9080_Codec : public I2c, public AudioCodec
{
public:
	Es9080_Codec(int i2cBus, int I2cAddress, bool verbose = false);
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

protected:
	int configureDCRemovalIIR(bool enable); //called by startAudio()
	AudioCodecParams params;
	McaspConfig mcaspConfig;
	bool running;
	bool verbose;
	int setAddressForReg(unsigned int reg, bool write);
	int currentAddress = 0xFF;
};

