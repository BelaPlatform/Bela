#include "I2c_Codec.h"

class I2c_MultiI2sCodec : public I2c_Codec
{
public:
	I2c_MultiI2sCodec(int i2cBus, int i2cAddress, CodecType type, bool verbose = false);
	unsigned int getNumIns() override;
	unsigned int getNumOuts() override;
	McaspConfig& getMcaspConfig() override;
private:
	unsigned int dataSize;
	unsigned int slotSize;
};
