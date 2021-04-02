#include "../include/I2c_MultiI2sCodec.h"

I2c_MultiI2sCodec::I2c_MultiI2sCodec(int i2cBus, int i2cAddress, CodecType type, bool verbose)
	: I2c_Codec(i2cBus, i2cAddress, type, verbose),
		dataSize(16),
		slotSize(16)
{
	setMode("I2sMain");
	AudioCodecParams p = getParameters();
	p.slotSize = slotSize;
	setParameters(p);
	I2c_Codec::getMcaspConfig();
	mcaspConfig.params.inSerializers = {0, 1};
	mcaspConfig.params.outSerializers = {2, 3};
}

McaspConfig& I2c_MultiI2sCodec::getMcaspConfig()
{
	mcaspConfig.params.inChannels = getNumIns();
	mcaspConfig.params.outChannels = getNumOuts();
	mcaspConfig.params.slotSize = slotSize;
	mcaspConfig.params.dataSize = dataSize;
	return mcaspConfig;
}

unsigned int I2c_MultiI2sCodec::getNumIns()
{
	unsigned int mul = mcaspConfig.params.inSerializers.size();
	return mul * I2c_Codec::getNumIns();
}

unsigned int I2c_MultiI2sCodec::getNumOuts()
{
	unsigned int mul = mcaspConfig.params.outSerializers.size();
	return mul * I2c_Codec::getNumOuts();
}
