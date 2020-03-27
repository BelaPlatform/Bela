#include "../include/I2c_MultiTdmCodec.h"

I2c_MultiTdmCodec::I2c_MultiTdmCodec(int i2cBus, int i2cAddress, bool isVerbose /*= false*/) :
        I2c_Codec(i2cBus, i2cAddress, CodecType::TLV320AIC3104, isVerbose)
{
	params.slotSize = 32;
	params.tdmMode = true;
	params.startingSlot = 0;
	params.bitDelay = 1;
	params.dualRate = false;
	params.generatesBclk = true;
	params.generatesWclk = true;
}

McaspConfig& I2c_MultiTdmCodec::getMcaspConfig()
{
	mcaspConfig = I2c_Codec::getMcaspConfig();
	mcaspConfig.params.dataSize = 16;
	mcaspConfig.params.inChannels = getNumIns();
	mcaspConfig.params.outChannels	= getNumOuts();
	mcaspConfig.params.outSerializers = {1, 2};
	return mcaspConfig;
}

unsigned int I2c_MultiTdmCodec::getNumIns()
{
	return 2;
}

unsigned int I2c_MultiTdmCodec::getNumOuts()
{
	return 4;
}
