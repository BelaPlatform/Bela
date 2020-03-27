#include "I2c_Codec.h"

class I2c_MultiTdmCodec : public I2c_Codec
{
public:
	I2c_MultiTdmCodec(int i2cBus, int i2cAddress, bool isVerbose = false);
	unsigned int getNumIns() override;
	unsigned int getNumOuts() override;
	McaspConfig& getMcaspConfig() override;
};
