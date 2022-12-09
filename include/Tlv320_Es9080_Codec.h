#pragma once

#include <vector>
#include <memory>
#include "../include/I2c_Codec.h"
#include "../include/Es9080_Codec.h"

class Tlv320_Es9080_Codec : public AudioCodec
{
public:
	int initCodec();
	int startAudio(int shouldBeReady);
	int stopAudio();
	unsigned int getNumIns();
	unsigned int getNumOuts();
	float getSampleRate();

	int setInputGain(int channel, float newGain);
	int setLineOutVolume(int channel, float gain);
	int setHpVolume(int channel, float gain);
	int disable();
	int reset();
	int setMode(std::string parameter);

	McaspConfig& getMcaspConfig();

	Tlv320_Es9080_Codec(int tlvI2cBus, int tlvI2cAddr, I2c_Codec::CodecType tlvType, int esI2cBus, int esI2cAddr, int esResetPin, bool verbose);
	~Tlv320_Es9080_Codec();

protected:
	McaspConfig mcaspConfig;
	bool running;
	bool verbose;
	AudioCodec* primaryCodec;
	AudioCodec* secondaryCodec;
	I2c_Codec* tlv320;
	Es9080_Codec* es9080;
};
