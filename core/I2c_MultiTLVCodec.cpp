/*
 * I2c_MultiTLVCodec.h
 *
 * Wrapper for multiple copies of the TLV320AIC310x
 * codec on the same McASP TDM bus (but with different
 * I2C addresses). Codec 0 provides the clock signals
 * via its PLL and the other codecs are clocked to it.
 *
 */

#include <vector>
#include "../include/I2c_MultiTLVCodec.h"
#include <map>
#include "../include/MiscUtilities.h"
using namespace StringUtils;

static const unsigned int kDataSize = 16;
#undef CODEC_WCLK_MASTER

struct Address {
	unsigned int bus;
	uint8_t address;
	I2c_Codec::CodecType type;
	std::string required;
};

static const std::map<std::string, I2c_Codec::CodecType> codecTypeMap = {
        {"3104", I2c_Codec::TLV320AIC3104},
        {"3106", I2c_Codec::TLV320AIC3106},
};

[[noreturn]] static void throwErr(std::string err, std::string token = "")
{
	throw std::runtime_error("I2c_MultiTLVCodec: " + err + (token != "" ? "`" + token : "") + "`\n");
}

static I2c_Codec::CodecType getCodecTypeFromString(const std::string& str)
{
	try {
		return codecTypeMap.at(trim(str));
	} catch(std::exception e) {
		throwErr("Unrecognised codec type", str);
	}
}

I2c_MultiTLVCodec::I2c_MultiTLVCodec(const std::string& cfgString, TdmConfig tdmConfig, bool isVerbose)
: masterCodec(nullptr), running(false), verbose(isVerbose)
{
	std::vector<Address> addresses;
	std::vector<std::string> tokens = split(cfgString, ';');
	if(tokens.size() < 1)
		throwErr("Wrong format for cfgString ", cfgString);
	if("" == trim(tokens.back()))
		tokens.pop_back();
	std::string mode;
	for(auto& token: tokens) {
		// the string will contain semicolon-separated label:value pairs
		// ADDR: <bus>,<addr>,<type>,<required>
		//  (where "required" can be:
		//   - `r` equired
		//   - `n` ot required
		//   - `d` isabled
		// MODE: <mode>
		// e.g.: ADDR: 2,24,3104,r;ADDR: 1,24,3106,o;MODE: noInit
		std::vector<std::string> tks = split(token, ':');
		if(tks.size() != 2)
			throwErr("Wrong format for token ", token);
		if("ADDR" == trim(tks[0])) {
			std::vector<std::string> ts = split(tks[1], ',');
			if(ts.size() != 4)
				throwErr("Wrong format for argument", tks[1]);
			addresses.push_back({
					.bus = (unsigned int)std::stoi(ts[0]),
					.address = (uint8_t)std::stoi(ts[1]),
					.type = getCodecTypeFromString(ts[2]),
					.required = trim(ts[3]),
				});
		} else if("MODE" == trim(tks[0]) && "" == mode) {
			mode = trim(tks[1]);
		} else {
			throwErr("Unknown token ", token);
		}
	}

	for(auto& addr : addresses) {
		unsigned int i2cBus = addr.bus;
		uint8_t address = addr.address;
		I2c_Codec::CodecType type = addr.type;
		std::string required = addr.required;
		// Check for presence of TLV codec and take the first one we find as the master codec
		std::unique_ptr<I2c_Codec> testCodec(new I2c_Codec(i2cBus, address, type));
		testCodec->setMode(mode);
		if(testCodec->initCodec() != 0) {
			std::string err = "Codec requested but not found at: " + std::to_string(i2cBus) + ", " + std::to_string(address) + ", " + std::to_string(type) + "\n";
			if("r" == required)
				throwErr(err);
			if(verbose)
				fprintf(stderr, "%s", err.c_str());
		}
		else {
			// codec found
			if(verbose) {
				fprintf(stderr, "Found I2C codec on bus %d address %d, required: %s\n", i2cBus, address, required.c_str());
			}
			if("d" == required)
				disabledCodecs.push_back(std::move(testCodec));
			else if(!masterCodec)
				masterCodec = std::move(testCodec);
			else
				extraCodecs.push_back(std::move(testCodec));
		}
	}
	if(!masterCodec) {
		return;
	}
	// Master codec generates bclk (and possibly wclk) with its PLL
	// and occupies the first two slots starting from tdmConfig.firstSlot
	unsigned int slotNum = tdmConfig.firstSlot;
	bool codecWclkMaster =
#ifdef CODEC_WCLK_MASTER
		true; // Main codec generates word clock
#else
		false; // AM335x generates word clock
#endif

	AudioCodecParams params;
	params.slotSize = tdmConfig.slotSize;
	params.bitDelay = tdmConfig.bitDelay;
	params.dualRate = false;
	params.tdmMode = true;
	params.startingSlot = slotNum;
	params.generatesBclk = true;
	params.generatesWclk = codecWclkMaster;
	params.mclk = masterCodec->getMcaspConfig().getValidAhclk(24000000);
	masterCodec->setParameters(params);
	params.generatesBclk = false;
	params.generatesWclk = false;
	for(auto& codec : extraCodecs) {
		slotNum += 2;
		params.startingSlot = slotNum;
		codec->setParameters(params);
	}
	// initialise the McASP configuration.
	mcaspConfig = masterCodec->getMcaspConfig();
	mcaspConfig.params.dataSize = kDataSize;
	mcaspConfig.params.inChannels = getNumIns();
	mcaspConfig.params.outChannels = getNumOuts();
}

// This method initialises the audio codec to its default state
int I2c_MultiTLVCodec::initCodec()
{
	int ret = 1;
	if(!masterCodec || (ret = masterCodec->initCodec()))
		return ret;

	for(auto it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
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
	for(auto it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
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
		for(auto it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
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

	for(auto it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
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

	for(auto it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
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

	for(auto it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
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

	for(auto it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
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
	for(auto it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
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

	for(auto it = extraCodecs.begin(); it != extraCodecs.end(); ++it) {
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
}

McaspConfig& I2c_MultiTLVCodec::getMcaspConfig()
{
	return mcaspConfig;
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
