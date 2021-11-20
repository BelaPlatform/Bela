#include "I2c_MultiTdmCodec.h"

static const unsigned int minTdmIns = 6;
static const unsigned int minTdmOuts = 6;
static const AudioCodecParams::ClockSource kWclkSource = AudioCodecParams::kClockSourceExternal;

I2c_MultiTLVCodec::TdmConfig I2c_MultiTdmCodec::makeTdmConfig()
{
	I2c_MultiTLVCodec::TdmConfig tdm;
	tdm.slotSize = 32;
	tdm.bitDelay = 1;
	tdm.firstSlot = 0;
	return tdm;
}

I2c_MultiTdmCodec::I2c_MultiTdmCodec(const std::string& cfgString, bool isVerbose)
	: I2c_MultiTLVCodec(cfgString, makeTdmConfig(), isVerbose)
{
	auto codecParams = primaryCodec->getParameters();
	codecParams.wclk = kWclkSource;
	primaryCodec->setParameters(codecParams);
	I2c_MultiTLVCodec::getMcaspConfig();
	mcaspConfig.params.inSerializers = {0, 1};
	mcaspConfig.params.outSerializers = {2, 3};
	mcaspConfig.params.inChannels = getNumIns();
	mcaspConfig.params.outChannels = getNumOuts();
	mcaspConfig.params.wclkIsInternal = AudioCodecParams::kClockSourceMcasp == codecParams.wclk;
}

McaspConfig& I2c_MultiTdmCodec::getMcaspConfig()
{
	return mcaspConfig;
}

unsigned int I2c_MultiTdmCodec::getNumIns()
{
	unsigned int mul = mcaspConfig.params.inSerializers.size();
	return std::max(I2c_MultiTLVCodec::getNumIns() * mul, minTdmIns * mul);
}

unsigned int I2c_MultiTdmCodec::getNumOuts()
{
	unsigned int mul = mcaspConfig.params.outSerializers.size();
	return std::max(I2c_MultiTLVCodec::getNumOuts() * mul, minTdmOuts * mul);
}
