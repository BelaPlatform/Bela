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

#include <vector>
#include "../include/I2c_MultiTLVCodec.h"

#undef CODEC_WCLK_MASTER	// Match this with pru_rtaudio_irq.p

I2c_MultiTLVCodec::I2c_MultiTLVCodec(int i2cBus, int i2cAddress, bool isVerbose /*= false*/)
: masterCodec(0), running(false), verbose(isVerbose)
{
	// for(int address = i2cAddress + 3; address >= i2cAddress; address--) {
	for(int address = i2cAddress; address < i2cAddress + 4; address++) {
		// Check for presence of TLV codec and take the first one we find as the master codec
		// TODO: this code assumes the first codec is a 3104 (Bela Mini cape), which might not always be true
		I2c_Codec::CodecType type = (address == i2cAddress) ? I2c_Codec::TLV320AIC3104 : I2c_Codec::TLV320AIC3106;
		I2c_Codec *testCodec = new I2c_Codec(i2cBus, address, type);
		if(testCodec->initCodec() != 0) {
			delete testCodec;
			if(verbose) {
				fprintf(stderr, "Error initialising I2C codec on bus %d address %d\n", i2cBus, address);
			}
		}
		else {
			// codec found
			if(verbose) {
				fprintf(stderr, "Found I2C codec on bus %d address %d\n", i2cBus, address);
			}

			if(!masterCodec)
				masterCodec = testCodec;
			else
				extraCodecs.push_back(testCodec);
		}
	}
	// Master codec generates bclk (and possibly wclk) with its PLL
	// and occupies the first two slots
	const int slotSize = 16;
	const unsigned int bitDelay = 0;
	unsigned int slotNum = 0;
	bool codecWclkMaster =
#ifdef CODEC_WCLK_MASTER
		true; // Main codec generates word clock
#else
		false; // AM335x generates word clock
#endif

	AudioCodecParams params;
	params.slotSize = slotSize;
	params.bitDelay = bitDelay;
	params.dualRate = false;
	params.tdmMode = true;
	if(masterCodec) {
		params.startingSlot = slotNum;
		params.generatesBclk = true;
		params.generatesWclk = codecWclkMaster;
		params.mclk = masterCodec->getMcaspConfig().getValidAhclk(24000000);
		masterCodec->setParameters(params);
	}
	params.generatesBclk = false;
	params.generatesWclk = false;
	for(auto& codec : extraCodecs) {
		slotNum += 2;
		params.startingSlot = slotNum;
		codec->setParameters(params);
	}
}

// This method initialises the audio codec to its default state
int I2c_MultiTLVCodec::initCodec()
{
	int ret = 1;
	if(!masterCodec || (ret = masterCodec->initCodec()))
		return ret;

	std::vector<I2c_Codec*>::iterator it;
	for(it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
		if((ret = (*it)->initCodec()))
			return ret;
	}

	return 0;
}

// Tell the codec to start generating audio
int I2c_MultiTLVCodec::startAudio(int dual_rate)
{
	int ret = 1;
	if(!masterCodec || (ret = masterCodec->startAudio(0)))
		return ret;

	// Each subsequent codec occupies the next 2 slots
	std::vector<I2c_Codec*>::iterator it;
	for(it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
		if((ret = (*it)->startAudio(0)))
			return ret;
	}

	running = true;
	return 0;
}


int I2c_MultiTLVCodec::stopAudio()
{
	int ret = 0;
	if(!masterCodec)
		return 1;

	if(running) {
		// Stop extra codecs
		std::vector<I2c_Codec*>::iterator it;
		for(it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
			(*it)->stopAudio();
		}

		// Stop master codec providing the clock; return value from this codec
		ret = masterCodec->stopAudio();
	}

	running = false;
	return ret;
}

int I2c_MultiTLVCodec::setPga(float newGain, unsigned short int channel)
{
	int ret = 0;
	if(!masterCodec)
		return 1;

	if((ret = masterCodec->setPga(newGain, channel)))
		return ret;

	std::vector<I2c_Codec*>::iterator it;
	for(it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
		if((ret = (*it)->setPga(newGain, channel)))
			return ret;
	}

	return 0;
}

int I2c_MultiTLVCodec::setDACVolume(int halfDbSteps)
{
	int ret = 0;
	if(!masterCodec)
		return 1;

	if((ret = masterCodec->setDACVolume(halfDbSteps)))
		return ret;

	std::vector<I2c_Codec*>::iterator it;
	for(it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
		if((ret = (*it)->setDACVolume(halfDbSteps)))
			return ret;
	}

	return 0;
}

int I2c_MultiTLVCodec::setADCVolume(int halfDbSteps)
{
	int ret = 0;
	if(!masterCodec)
		return 1;

	if((ret = masterCodec->setADCVolume(halfDbSteps)))
		return ret;

	std::vector<I2c_Codec*>::iterator it;
	for(it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
		if((ret = (*it)->setADCVolume(halfDbSteps)))
			return ret;
	}

	return 0;
}

int I2c_MultiTLVCodec::setHPVolume(int halfDbSteps)
{
	int ret = 0;
	if(!masterCodec)
		return 1;

	if((ret = masterCodec->setHPVolume(halfDbSteps)))
		return ret;

	std::vector<I2c_Codec*>::iterator it;
	for(it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
		if((ret = (*it)->setHPVolume(halfDbSteps)))
			return ret;
	}

	return 0;
}

int I2c_MultiTLVCodec::disable()
{
	if(!masterCodec)
		return 1;

	// Disable extra codecs first
	std::vector<I2c_Codec*>::iterator it;
	for(it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
		(*it)->stopAudio();
	}

	// Disable master codec providing the clock; return value from this codec
	return masterCodec->stopAudio();
}

int I2c_MultiTLVCodec::reset()
{
	int ret = 0;
	if(!masterCodec)
		return 1;

	if((ret = masterCodec->reset()))
		return ret;

	std::vector<I2c_Codec*>::iterator it;
	for(it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
		if((ret = (*it)->reset()))
			return ret;
	}

	return 0;
}

// How many I2C codecs were found? (range 0-4)
int I2c_MultiTLVCodec::numDetectedCodecs()
{
	if(!masterCodec)
		return 0;
	return extraCodecs.size() + 1;
}

// For debugging purposes only!
void I2c_MultiTLVCodec::debugWriteRegister(int codecNum, int regNum, int value) {
	if(codecNum == 0) {
		masterCodec->writeRegister(regNum, value);
	}
	else {
		extraCodecs[codecNum - 1]->writeRegister(regNum, value);
	}
}

int I2c_MultiTLVCodec::debugReadRegister(int codecNum, int regNum) {
	if(codecNum == 0) {
		return masterCodec->readRegister(regNum);
	}
	else {
		return extraCodecs[codecNum - 1]->readRegister(regNum);
	}
}

I2c_MultiTLVCodec::~I2c_MultiTLVCodec()
{
	stopAudio();

	// Delete codec objects we created
	std::vector<I2c_Codec*>::iterator it;
	for(it = extraCodecs.begin(); it != extraCodecs.end(); ++it)
		delete *it;
	if(masterCodec)
		delete masterCodec;
}

McaspConfig& I2c_MultiTLVCodec::getMcaspConfig()
{
	mc = masterCodec->getMcaspConfig();
	mc.params.inChannels = getNumIns();
	mc.params.outChannels = getNumOuts();
	return mc;
/*
// Values below are for 16x 16-bit TDM slots
#define BELA_MULTI_TLV_MCASP_DATA_FORMAT_TX_VALUE 0x8074 // MSB first, 0 bit delay, 16 bits, DAT bus, ROR 16bits
#define BELA_MULTI_TLV_MCASP_ACLKXCTL_VALUE 0x00 // External clk, polarity (falling edge)
#define BELA_MULTI_TLV_MCASP_DATA_FORMAT_RX_VALUE 0x8074 // MSB first, 0 bit delay, 16 bits, DAT bus, ROR 16bits
#define BELA_MULTI_TLV_MCASP_ACLKRCTL_VALUE 0x00 // External clk, polarity (falling edge)
#ifdef CODEC_WCLK_MASTER
#define BELA_MULTI_TLV_MCASP_AFSRCTL_VALUE 0x800 // 16-slot TDM external fsclk, rising edge means beginning of frame
#define BELA_MULTI_TLV_MCASP_AFSXCTL_VALUE 0x800 // 16-slot TDM external fsclk, rising edge means beginning of frame
#define MCASP_OUTPUT_PINS MCASP_PIN_AHCLKX | (1 << 2) // AHCLKX and AXR2 outputs
#else // CODEC_WCLK_MASTER
#define BELA_MULTI_TLV_MCASP_AFSRCTL_VALUE 0x802 // 16-slot TDM internal fsclk, rising edge means beginning of frame
#define BELA_MULTI_TLV_MCASP_AFSXCTL_VALUE 0x802 // 16-slot TDM internal fsclk, rising edge means beginning of frame
#define MCASP_OUTPUT_PINS MCASP_PIN_AHCLKX | MCASP_PIN_AFSX | (1 << 2) // AHCLKX, FSX, AXR2 outputs
#endif // CODEC_WCLK_MASTER
*/
}

unsigned int I2c_MultiTLVCodec::getNumIns(){
	return 2 * numDetectedCodecs();
}

unsigned int I2c_MultiTLVCodec::getNumOuts(){
	return 2 * numDetectedCodecs();
}

float I2c_MultiTLVCodec::getSampleRate() {
	if(masterCodec)
		return masterCodec->getSampleRate();
	return 0;
}
