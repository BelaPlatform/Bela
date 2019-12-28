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
}

// This method initialises the audio codec to its default state
int I2c_MultiTLVCodec::initCodec()
{
	int ret = 0;
	if(!masterCodec)
		return 1;
	if((ret = masterCodec->initCodec()))
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
	// Supported values of slot size in the PRU code: 16 and 32 bits. Note that
	// altering slot size requires changing #defines in the PRU code.
	const int slotSize = 16;
	int slotNum = 0;
	int ret = 0;

	if(!masterCodec)
		return 1;

	// Master codec generates the clocks with its PLL and occupies the first two slots
#ifdef CODEC_WCLK_MASTER
	// Main codec generates word clock
	if((ret = masterCodec->startAudio(dual_rate, 1, 1, 1, slotSize, 0)))
		return ret;
#else
	// AM335x generates word clock
	if((ret = masterCodec->startAudio(dual_rate, 1, 0, 1, slotSize, 0)))
		return ret;
#endif

	// Each subsequent codec occupies the next 2 slots
	std::vector<I2c_Codec*>::iterator it;
	for(it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
		slotNum += 2;
		if((ret = (*it)->startAudio(dual_rate, 0, 0, 1, slotSize, slotNum)))
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
