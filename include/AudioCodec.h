#pragma once
#include <stdint.h>
#include <string>
#include "Mcasp.h"

struct AudioCodecParams {
	typedef enum {
		kTdmModeI2s,
		kTdmModeDsp,
		kTdmModeTdm,
	} TdmMode;
	typedef enum {
		kClockSourceMcasp,
		kClockSourceCodec,
		kClockSourceExternal,
	} ClockSource;
	unsigned int slotSize; // size of a slot in bits
	unsigned int startingSlot; // what slot in the TDM frame to place the first channel in
	unsigned int bitDelay; // additional offset in the TDM frame (in bits)
	double mclk; // frequency of the master clock passed to the codec
	double samplingRate; // audio sampling rate
	bool dualRate; // whether to run at single or double sampling rate
	TdmMode tdmMode; // what TDM mode to use
	ClockSource bclk; // who generates the bit clock
	ClockSource wclk; // who generates the frame sync
	void print();
};

class AudioCodec
{
public:
	virtual ~AudioCodec() {};
	virtual int initCodec() = 0;
	virtual int startAudio(int shouldBeReady) = 0;
	virtual int stopAudio() = 0;
	virtual unsigned int getNumIns() = 0;
	virtual unsigned int getNumOuts() = 0;
	virtual float getSampleRate() = 0;
	virtual int setInputGain(int channel, float newGain) = 0;
	virtual int setLineOutVolume(int channel, float gain) = 0;
	virtual int setHpVolume(int channel, float gain) = 0;
	virtual int disable() = 0;
	virtual int reset() = 0;
	virtual int setMode(std::string parameter) {return 0;};
	virtual McaspConfig& getMcaspConfig() = 0;
};
