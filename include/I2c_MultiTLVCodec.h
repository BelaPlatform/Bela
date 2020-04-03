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
#include "I2c_Codec.h"

class I2c_MultiTLVCodec : public AudioCodec
{
public:
	int initCodec();
	int startAudio(int dual_rate);
	int stopAudio();
	unsigned int getNumIns();
	unsigned int getNumOuts();
	float getSampleRate();

	int setPga(float newGain, unsigned short int channel);
	int setDACVolume(int halfDbSteps);
	int setADCVolume(int halfDbSteps);
	int setHPVolume(int halfDbSteps);
	int disable();
	int reset();

	int numDetectedCodecs();

	void debugWriteRegister(int codecNum, int regNum, int value);
	int debugReadRegister(int codecNum, int regNum);
	const McaspConfig& getMcaspConfig();

	I2c_MultiTLVCodec(int i2cBus, int i2cAddress, bool verbose = false);
	~I2c_MultiTLVCodec();

private:
	I2c_Codec *masterCodec;
	std::vector<I2c_Codec*> extraCodecs;

	bool running;
	bool verbose;
};
