#include "I2c_MultiTLVCodec.h"

class I2c_MultiTdmCodec : public I2c_MultiTLVCodec
{
public:
	I2c_MultiTdmCodec(const std::string& cfgString, bool isVerbose = false);
	unsigned int getNumIns() override;
	unsigned int getNumOuts() override;
	McaspConfig& getMcaspConfig() override;
private:
	static I2c_MultiTLVCodec::TdmConfig makeTdmConfig();
};
