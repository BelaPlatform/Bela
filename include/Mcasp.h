#pragma once
#include <stdint.h>
#include <vector>
static const uint32_t MCASP_PIN_AFSX = 1 << 28;
static const uint32_t MCASP_PIN_AHCLKX = 1 << 27;
static const uint32_t MCASP_PIN_ACLKX = 1 << 26;
static const uint32_t MCASP_PIN_AMUTE = 1 << 25; // Also, 0 to 3 are XFR0 to XFR3

struct McaspRegisters
{
	uint32_t pdir;
	uint32_t rmask;
	uint32_t rfmt;
	uint32_t afsrctl;
	uint32_t aclkrctl;
	uint32_t rtdm;
	uint32_t xmask;
	uint32_t xfmt;
	uint32_t afsxctl;
	uint32_t aclkxctl;
	uint32_t xtdm;
	uint32_t srctln;
	uint32_t wfifoctl;
	uint32_t rfifoctl;
};

class McaspConfig
{
public:
	typedef enum {
		SrctlMode_DISABLED = 0,
		SrctlMode_TX = 1,
		SrctlMode_RX = 2,
	} SrctlMode;
	typedef enum {
		SrctlDrive_TRISTATE = 0,
		SrctlDrive_LOW = 2,
		SrctlDrive_HIGH = 3,
	} SrctlDrive;
	McaspConfig();
	int setFmt(unsigned int slotSize, unsigned int bitDelay);
	int setAclkctl(bool externalRisingEdge);
	int setAfsctl(unsigned int numSlots, bool wclkIsWord, bool wclkIsInternal, bool wclkFalling);
	int setPdir(bool wclkIsInternal, unsigned char axr);
	int setSrctln(unsigned int n, SrctlMode mode, SrctlDrive drive);
	int setInChannels(unsigned int numChannels, std::vector<unsigned int> serializers);
	int setOutChannels(unsigned int numChannels, std::vector<unsigned int> serializers);
	int setChannels(unsigned int numChannels, std::vector<unsigned int>& serializers, bool input);
	static uint32_t computeTdm(unsigned int numChannels);
	static uint32_t computeFifoctl(unsigned int numSerializers);
	McaspRegisters regs;
};

void mcasp_test(const char* name, uint32_t val1, uint32_t val2);
