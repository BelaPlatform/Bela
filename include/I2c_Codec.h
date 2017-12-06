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

#pragma once

#include "AudioCodec.h"
#include "I2c.h"
#include <array>

class I2c_Codec : public I2c, public AudioCodec
{
	short unsigned int pllJ;
	short unsigned int pllD;
	short unsigned int pllP;
	short unsigned int pllR;
	double PLLCLK_IN;
public:
	typedef enum {
		TLV320AIC3104 = 0,
		TLV320AIC3106,
	} CodecType;
	
	int writeRegister(unsigned int reg, unsigned char value);
	int readRegister(unsigned int reg);

	int initCodec();
	int setParameters(const AudioCodecParams& codecParams);
	AudioCodecParams getParameters();
	int startAudio(int dummy);
	int stopAudio();
	unsigned int getNumIns();
	unsigned int getNumOuts();
	float getSampleRate();

	int setPllJ(short unsigned int j);
	int setPllD(unsigned int d);
	int setPllP(short unsigned int p);
	int setPllR(unsigned int r);
	int setPllK(float k);
	int setNcodec(double NCODEC);
	int setAudioSamplingRate(float newSamplingRate);
	short unsigned int getPllJ();
	unsigned int getPllD();
	unsigned int getPllP();
	unsigned int getPllR();
	float getPllK();
	float getAudioSamplingRate();
	int setInputGain(int channel, float gain);
	int setDacVolume(int channel, float gain);
	int setAdcVolume(int channel, float gain);
	int setHpVolume(int channel, float gain);
	int enableHpOut(bool enable);
	int enableLineOut(bool enable);
	int disable();
	int reset(){ return 0; } // Not needed for audio codec on Bela cape

	void setVerbose(bool isVerbose);
	I2c_Codec(int i2cBus, int I2cAddress, CodecType type, bool verbose = false);
	~I2c_Codec();

	virtual McaspConfig& getMcaspConfig();
	int setMode(std::string str);
private:
	enum {kNumIoChannels = 2};
	int writeDacVolumeRegisters(bool mute);
	int writeAdcVolumeRegisters(bool mute);
	int writeHPVolumeRegisters();
protected:
	int configureDCRemovalIIR(bool enable); //called by startAudio()
	int codecType;
	std::array<int,kNumIoChannels> dacVolumeHalfDbs{};
	std::array<int,kNumIoChannels> adcVolumeHalfDbs{};
	std::array<int,kNumIoChannels> hpVolumeHalfDbs{};
	AudioCodecParams params;
	McaspConfig mcaspConfig;
	bool running;
	bool verbose;
	bool hpEnabled;
	bool differentialInput;
	double micBias;
	typedef enum
	{
		InitMode_init = 0,
		InitMode_noDeinit = 1,
		InitMode_noInit = 2,
	} InitMode;
	InitMode mode;
};
