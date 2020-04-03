#pragma once
#include <stdint.h>
static const uint32_t MCASP_PIN_AFSX = 1 << 28;
static const uint32_t MCASP_PIN_AHCLKX = 1 << 27;
static const uint32_t MCASP_PIN_ACLKX = 1 << 26;
static const uint32_t MCASP_PIN_AMUTE = 1 << 25; // Also, 0 to 3 are XFR0 to XFR3

class McaspConfig
{
public:
	uint32_t xfmt;
	uint32_t aclkxctl;
	uint32_t afsxctl;
	uint32_t rfmt;
	uint32_t aclkrctl;
	uint32_t afsrctl;
	uint32_t pdir;
	int setFmt(unsigned int slotSize, unsigned int bitDelay);
	int setAclkctl(bool externalRisingEdge);
	int setAfsctl(unsigned int numSlots, bool wclkIsWord, bool wclkIsInternal, bool wclkFalling);
	int setPdir(bool wclkIsInternal, unsigned char axr);
};

void mcasp_test(const char* name, uint32_t val1, uint32_t val2);
