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


#ifndef I2C_MULTITLV_CODEC_H_
#define I2C_MULTITLV_CODEC_H_

#include "I2c_Codec.h"

class I2c_MultiTLVCodec : public AudioCodec
{
public:
	int initCodec();
	int startAudio(int dual_rate);
	int stopAudio();

	int setPga(float newGain, unsigned short int channel);
	int setDACVolume(int halfDbSteps);
	int setADCVolume(int halfDbSteps);
	int setHPVolume(int halfDbSteps);
	int disable();
	int reset();

	int numDetectedCodecs();

	I2c_MultiTLVCodec(int i2cBus, int i2cAddress, bool verbose = false);
	~I2c_MultiTLVCodec();

private:
	I2c_Codec *masterCodec;
	std::vector<I2c_Codec*> extraCodecs;

	bool running;
	bool verbose;
};


#endif /* I2C_MULTITLV_CODEC_H_ */
