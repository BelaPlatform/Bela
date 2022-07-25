/*
 * I2c_MultiTLVCodec.h
 *
 * Wrapper for multiple copies of the TLV320AIC310x
 * codec on the same McASP TDM bus (but with different
 * I2C addresses). Codec 0 provides the clock signals
 * via its PLL and the other codecs are clocked to it.
 *
 *  Created on: August 9, 2019
 *      Author: Andrew McPherson
 */

#pragma once

#include <vector>
#include <memory>
#include "I2c_Codec.h"

class I2c_MultiTLVCodec : public AudioCodec
{
public:
	class TdmConfig {
	public:
		TdmConfig(){};
		unsigned int slotSize = 16;
		unsigned int bitDelay = 0;
		unsigned int firstSlot = 0;
	};
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

	int numDetectedCodecs();

	void debugWriteRegister(int codecNum, int regNum, int value);
	int debugReadRegister(int codecNum, int regNum);
	McaspConfig& getMcaspConfig();

	I2c_MultiTLVCodec(I2c_MultiTLVCodec&&) = delete;
	I2c_MultiTLVCodec(const std::string& cfgString, TdmConfig tdmConfig = TdmConfig(), bool isVerbose = false);
	~I2c_MultiTLVCodec();

protected:
	McaspConfig mcaspConfig;
	std::shared_ptr<I2c_Codec> primaryCodec; // this will be the same as one of the elements of codecs
private:
	std::vector<std::shared_ptr<I2c_Codec>> codecs;
	std::vector<std::shared_ptr<I2c_Codec>> disabledCodecs;

	bool running;
	bool verbose;
};
