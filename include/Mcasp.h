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
	uint32_t ahclkrctl;
	uint32_t rtdm;
	uint32_t xmask;
	uint32_t xfmt;
	uint32_t afsxctl;
	uint32_t aclkxctl;
	uint32_t ahclkxctl;
	uint32_t xtdm;
	uint32_t srctln;
	uint32_t wfifoctl;
	uint32_t rfifoctl;
        // the below are not real registers, but it's data we pass to the PRU
	uint32_t mcaspOutChannels;
	uint32_t outSerializersDisabledSubSlots;
};

class McaspConfig
{
public:
	struct Parameters
	{
		unsigned int inChannels;
		unsigned int outChannels;
		std::vector<unsigned int> inSerializers;
		std::vector<unsigned int> outSerializers;
		unsigned int numSlots;
		unsigned int slotSize;
		unsigned int dataSize;
		unsigned int bitDelay;
		double auxClkIn;
		double ahclkFreq;
		bool ahclkIsInternal;
		bool aclkIsInternal;
		bool wclkIsInternal;
		bool wclkIsWord;
		bool wclkFalling;
		bool externalSamplesRisingEdge;
	};
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
	double getValidAhclk(double desiredClock, unsigned int* outDiv = nullptr);
	McaspConfig();
	void print();
	Parameters params;
	McaspRegisters getRegisters();
private:
	static uint32_t computeTdm(unsigned int numSlots);
	static uint32_t computeFifoctl(unsigned int numSerializers);
	int setFmt();
	int setAfsctl();
	int setAclkctl();
	int setAhclkctl();
	int setPdir();
	int setSrctln(unsigned int n, McaspConfig::SrctlMode mode, McaspConfig::SrctlDrive drive);
	int setChannels(unsigned int numChannels, std::vector<unsigned int>& serializers, bool input);
public:
	McaspRegisters regs;
};

namespace Mcasp {
	void startAhclkx();
	void stopAhclkx();
};
