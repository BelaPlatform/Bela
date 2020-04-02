#pragma once
#include <stdint.h>

const uint32_t MCASP_PIN_AFSX = 1 << 28;
const uint32_t MCASP_PIN_AHCLKX = 1 << 27;
const uint32_t MCASP_PIN_ACLKX = 1 << 26;
const uint32_t MCASP_PIN_AMUTE = 1 << 25; // Also, 0 to 3 are XFR0 to XFR3

struct AudioCodecParams {
	unsigned int slotSize; // size of a slot in bits
	unsigned int startingSlot; // what slot in the TDM frame to place the first channel in
	unsigned int bitDelay; // additional offset in the TDM frame (in bits)
	bool dualRate; // whether to run at single or double sampling rate
	bool tdmMode; // whether to use TDM rather than DSP mode
	bool generatesBclk; // whether the codec generates the bit clock
	bool generatesWclk; // whether the codec generates the frame sync
};
struct McaspConfig {
// TODO: ideally we would want to have methods to set each of these parameters within each register:
// ACLK:- falling/rising edge of bclk
// AFS:- falling/rising edge of wclk
// AFS: - wclk source
// AFS: - num slots
// FMT: - slot width
// FMT: - bit delay
	uint32_t xfmt;
	uint32_t aclkxctl;
	uint32_t afsxctl;
	uint32_t rfmt;
	uint32_t aclkrctl;
	uint32_t afsrctl;
	uint32_t pdir;
};

class AudioCodec
{
public:
	virtual ~AudioCodec() {};
	virtual int initCodec() = 0;
	virtual int startAudio(int parameter) = 0;
	virtual int stopAudio() = 0;
	virtual unsigned int getNumIns() = 0;
	virtual unsigned int getNumOuts() = 0;
	virtual float getSampleRate() = 0;
	virtual int setPga(float newGain, unsigned short int channel) = 0;
	virtual int setDACVolume(int halfDbSteps) = 0;
	virtual int setADCVolume(int halfDbSteps) = 0;
	virtual int setHPVolume(int halfDbSteps) = 0;
	virtual int disable() = 0;
	virtual int reset() = 0;
	virtual const McaspConfig& getMcaspConfig() = 0;
};
