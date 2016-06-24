/*
 * I2c_Codec.h
 *
 * Handle writing the registers to the TLV320AIC310x
 * series audio codecs, used on the BeagleBone Audio Cape.
 * This code is designed to bypass the ALSA driver and
 * configure the codec directly in a sensible way. It
 * is complemented by code running on the PRU which uses
 * the McASP serial port to transfer audio data.
 *
 *  Created on: May 25, 2014
 *      Author: Andrew McPherson
 */


#ifndef I2CCODEC_H_
#define I2CCODEC_H_

#include "I2c.h"


class I2c_Codec : public I2c
{
	short unsigned int pllJ;
	short unsigned int pllD;
	short unsigned int pllP;
	short unsigned int pllR;
public:
	int writeRegister(unsigned int reg, unsigned int value);

	int initCodec();
	int startAudio(int dual_rate);
	int stopAudio();

	int setPllJ(short unsigned int j);
	int setPllD(unsigned int d);
	int setPllP(short unsigned int p);
	int setPllR(unsigned int r);
	int setPllK(float k);
	int setAudioSamplingRate(float newSamplingRate);
	short unsigned int getPllJ();
	unsigned int getPllD();
	unsigned int getPllP();
	unsigned int getPllR();
	float getPllK();
	float getAudioSamplingRate();
	int setPga(float newGain, unsigned short int channel);
	int setDACVolume(int halfDbSteps);
	int writeDACVolumeRegisters(bool mute);
	int setADCVolume(int halfDbSteps);
	int writeADCVolumeRegisters(bool mute);
	int setHPVolume(int halfDbSteps);
	int writeHPVolumeRegisters();

	int readI2C();

	I2c_Codec();
	~I2c_Codec();

private:
	bool running;
	int dacVolumeHalfDbs;
	int adcVolumeHalfDbs;
	int hpVolumeHalfDbs;
};


#endif /* I2CCODEC_H_ */
