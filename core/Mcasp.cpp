#include "../include/Mcasp.h"
#include <string.h>

McaspConfig::McaspConfig() :
	regs({0})
{
	regs.rmask = regs.xmask = 0xFFFF;
}

int McaspConfig::setFmt(unsigned int slotSize, unsigned int bitDelay)
{
	struct {
		unsigned ROT : 3;
		unsigned BUSEL : 1;
		unsigned SSZ : 4;
		unsigned PBIT : 5;
		unsigned PAD : 2;
		unsigned RVRS : 1;
		unsigned DATADLY : 2;
		unsigned : 14;
	} s = {0};

	int rotation = 32 - slotSize;

//XDATDLY: 0-3h Transmit sync bit delay.
//0 0-bit delay. The first transmit data bit, AXRn, occurs in same ACLKX cycle
//as the transmit frame sync (AFSX).
//1h 1-bit delay. The first transmit data bit, AXRn, occurs one ACLKX cycle
//after the transmit frame sync (AFSX).
//2h 2-bit delay. The first transmit data bit, AXRn, occurs two ACLKX cycles
//after the transmit frame sync (AFSX).
//3h Reserved.
	s.DATADLY = bitDelay;

//15 XRVRS Transmit serial bitstream order.
//0 Bitstream is LSB first. No bit reversal is performed in transmit format bit
//reverse unit.
//1 Bitstream is MSB first. Bit reversal is performed in transmit format bit
//reverse unit.
	s.RVRS = 1;

//XPAD: 0-3h Pad value for extra bits in slot not belonging to word defined by
// XMASK. This field only applies to bits when XMASK[n] = 0.
// 0 Pad extra bits with 0.
// 1h Pad extra bits with 1.
// 2h Pad extra bits with one of the bits from the word as specified by XPBIT bits.
// 3h Reserved.
	s.PAD = 0;

//XPBIT: 0-1Fh XPBIT value determines which bit (as written by the CPU or DMA to
// XBUF[n]) is used to pad the extra bits before shifting. This field only
// applies when XPAD = 2h.
// 0 Pad with bit 0 value.
// 1-1Fh Pad with bit 1 to bit 31 value.
	s.PBIT = 0;

//XSSZ: 0-Fh Transmit slot size.
//0-2h Reserved.
//3h Slot size is 8 bits.
//4h Reserved.
//5h Slot size is 12 bits.
//6h Reserved.
//7h Slot size is 16 bits.
//8h Reserved.
//9h Slot size is 20 bits.
//Ah Reserved.
//Bh Slot size is 24 bits.
//Ch Reserved.
//Dh Slot size is 28 bits.
//Eh Reserved.
//Fh Slot size is 32 bits.
	if(slotSize & 3 || slotSize < 8 || slotSize > 32)
		return -1;
	s.SSZ = (slotSize) / 2 - 1;

// XBUSEL: Selects whether writes to serializer buffer XRBUF[n] originate from
// the configuration bus (CFG) or the data (DAT) port.
//0 Writes to XRBUF[n] originate from the data port. Writes to
//XRBUF[n] from the configuration bus are ignored with no effect
//to the McASP.
//1 Writes to XRBUF[n] originate from the configuration bus. Writes to
//XRBUF[n] from the data port are ignored with no effect to the McASP.
	s.BUSEL = 0;

//XROT: Right-rotation value for transmit rotate right format unit
//0 Rotate right by 0 (no rotation).
//1h Rotate right by 4 bit positions.
//2h Rotate right by 8 bit positions.
//3h Rotate right by 12 bit positions.
//4h Rotate right by 16 bit positions.
//5h Rotate right by 20 bit positions.
//6h Rotate right by 24 bit positions.
//7h Rotate right by 28 bit positions.
	if(rotation & 3) // has to be a multiple of 4
		return -1;
	s.ROT = rotation >> 2;

	memcpy(&regs.xfmt, &s, sizeof(regs.xfmt));
	regs.rfmt = regs.xfmt;
	return 0;
}

int McaspConfig::setAclkctl(bool externalRisingEdge)
{
	struct {
		unsigned CLKDIV : 5;
		unsigned CLKM : 1;
		unsigned ASYNC : 1;
		unsigned CLKP : 1;
		unsigned : 24;
	} s = {0};

// CLKXP: Transmit bitstream clock polarity select bit.
// 0 Rising edge. External receiver samples data on the falling edge of the
// serial clock, so the transmitter must shift data out on the rising edge of
// the serial clock.
// 1 Falling edge. External receiver samples data on the rising edge of the
// serial clock, so the transmitter must shift data out on the falling edge of
// the serial clock.
	s.CLKP = !externalRisingEdge;

// ASYNC: Transmit/receive operation asynchronous enable bit.
// 0 Synchronous. Transmit clock and frame sync provides the source for both
// the transmit and receive sections.
// 1 Asynchronous. Separate clock and frame sync used by transmit and receive
// sections.
	s.ASYNC = 0;

// CLKXM: Transmit bit clock source bit.
// 0 External transmit clock source from ACLKX pin.
// 1 Internal transmit clock source from output of programmable bit clock divider.
	s.CLKM = 0;

// CLKXDIV: 0-1Fh Transmit bit clock divide ratio bits determine the
// divide-down ratio from AHCLKX to ACLKX.
// 0 Divide-by-1.
// 1h Divide-by-2.
// 2h-1Fh Divide-by-3 to divide-by-32.
	s.CLKDIV = 0;

	memcpy(&regs.aclkxctl, &s, sizeof(regs.aclkxctl));
	regs.aclkrctl = regs.aclkxctl;
	return 0;
}

int McaspConfig::setAfsctl(unsigned int numSlots, bool wclkIsWord, bool wclkIsInternal, bool wclkFalling)
{
	struct {
		unsigned FSP : 1;
		unsigned FSM : 1;
		unsigned : 2;
		unsigned FWID : 1;
		unsigned : 2;
		unsigned MOD : 9;
		unsigned : 16;
	} s = {0};
// XMOD: 0-1FFh Transmit frame sync mode select bits.
// 0 Burst mode.
// 1h Reserved.
// 2h-20h 2-slot TDM (I2S mode) to 32-slot TDM.
// 21h-17Fh Reserved.
// 180h 384-slot DIT mode.
// 181h-1FFh Reserved.
	if(numSlots > 32 || numSlots < 2)
		return 1;
	s.MOD = numSlots;
// FXWID: Transmit frame sync width select bit indicates the width of the
// transmit frame sync (AFSX) during its active period.
// 0 Single bit.
// 1 Single word.
	s.FWID = wclkIsWord;
// FSXM: Transmit frame sync generation select bit.
// 0 Externally-generated transmit frame sync.
// 1 Internally-generated transmit frame sync.
	s.FSM = wclkIsInternal;
// FSXP: Transmit frame sync polarity select bit.
//0 A rising edge on transmit frame sync (AFSX) indicates the beginning of a frame.
//1 A falling edge on transmit frame sync (AFSX) indicates the beginning of a frame.
	s.FSP = wclkFalling;
	memcpy(&regs.afsxctl, &s, sizeof(regs.afsxctl));
	regs.afsrctl = regs.afsxctl;
	return 0;
}

int McaspConfig::setPdir(bool wclkIsInternal, unsigned char axr)
{
	struct {
		unsigned AXR : 6;
		unsigned : 19;
		unsigned AMUTE : 1;
		unsigned ACLKX : 1;
		unsigned AHCLKX : 1;
		unsigned AFSX : 1;
		unsigned ACLKR : 1;
		unsigned AHCLKR : 1;
		unsigned AFSR : 1;
	} s = {0};
// AFSR: Determines if AFSR pin functions as an input or output.
// 0 Pin functions as input.
// 1 Pin functions as output.
	s.AFSR = 0; // we ignore this because we always use the AFSX signal instead
// AHCLKR: Determines if AHCLKR pin functions as an input or output.
// 0 Pin functions as input.
// 1 Pin functions as output.
	s.AHCLKR = 0;
// ACLKR: Determines if ACLKR pin functions as an input or output.
// 0 Pin functions as input.
// 1 Pin functions as output.
	s.ACLKR = 0;
// AFSX: Determines if AFSX pin functions as an input or output.
// 0 Pin functions as input.
// 1 Pin functions as output.
	s.AFSX = wclkIsInternal;
// AHCLKX: Determines if AHCLKX pin functions as an input or output.
// 0 Pin functions as input.
// 1 Pin functions as output.
	s.AHCLKX = 1;
// ACLKX: Determines if ACLKX pin functions as an input or output.
// 0 Pin functions as input.
// 1 Pin functions as output.
	s.ACLKX = s.ACLKR;
// AMUTE: Determines if AMUTE pin functions as an input or output.
// 0 Pin functions as input.
// 1 Pin functions as output.
	s.AMUTE = 0;
// AXR[5-0]: Determines if AXRn pin functions as an input or output.
// 0 Pin functions as input.
// 1 Pin functions as output
	s.AXR = axr;

	memcpy(&regs.pdir, &s, sizeof(regs.pdir));
	return 0;
}

uint32_t McaspConfig::computeTdm(unsigned int numChannels)
{
// XTDMS[31-0]: Transmitter mode during TDM time slot n.
// 0 Transmit TDM time slot n is inactive. The transmit serializer does not shift out data during this slot.
// 1 Transmit TDM time slot n is active. The transmit serializer shifts out
// data during this slot according to the serializer control register (SRCTL).
	if(0 == numChannels)
		return 0;
	return (1 << numChannels) - 1;
}

uint32_t McaspConfig::computeFifoctl(unsigned int numSerializers)
{
	struct {
		unsigned NUMDMA : 8;
		unsigned NUMEVT : 8;
		unsigned ENA : 1;
		unsigned : 15;
	} s;
// WENA: Write FIFO enable bit.
// 0 Write FIFO is disabled. The WLVL bit in the Write FIFO status register (WFIFOSTS) is reset to 0
// and pointers are initialized, that is, the Write FIFO is “flushed.”
// 1 Write FIFO is enabled. If Write FIFO is to be enabled, it must be enabled prior to taking McASP
// out of reset.
	s.ENA = 1; // this should be masked out during the first write, and unmasked during a successive write immediately following the first

// WNUMEVT: 0-FFh Write word count per DMA event (32-bit). When the Write FIFO has space for at least WNUMEVT
// words of data, then an AXEVT (transmit DMA event) is generated to the host/DMA controller. This
// value should be set to a non-zero integer multiple of the number of serializers enabled as
// transmitters. This value must be set prior to enabling the Write FIFO.
// 0 0 words
// 1h 1 word
// 2h 2 words
// 3h-40h 3 to 64 words
// 41h-FFh Reserved
	s.NUMEVT = 0; // TODO: don't know why we keep it this way, but this is what was in our PRU code (as written by @henrix)

// 7-0 WNUMDMA 0-FFh Write word count per transfer (32-bit words). Upon a transmit DMA event from the McASP,
// WNUMDMA words are transferred from the Write FIFO to the McASP. This value must equal the
// number of McASP serializers used as transmitters. This value must be set prior to enabling the
// Write FIFO.
// 0 0 words
// 1h 1 word
// 2h 2 words
// 3h-10h 3-16 words
// 11h-FFh Reserved
	s.NUMDMA = numSerializers;
	uint32_t ret;
	memcpy(&ret, &s, sizeof(ret));
	return ret;
}

int McaspConfig::setSrctln(unsigned int n, McaspConfig::SrctlMode mode, McaspConfig::SrctlDrive drive)
{
// regs.srctln contains data corresponding to SRCTLn for n 0:3 (inclusive). Given
// how only the lower 4 bits of each are to be set at configuration time, we
// pack all of them in srctl0123 as groups of 8 bits
	if(n >= 4)
		return -1;
	struct {
		unsigned SRMOD : 2;
		unsigned DISMOD : 2;
		unsigned : 4;
	} s = {0};
// DISMOD: 0-3h Serializer pin drive mode bit. Drive on pin when in inactive TDM slot of transmit mode or when serializer
// is inactive. This field only applies if the pin is configured as a McASP pin (PFUNC = 0).
// 0 Drive on pin is 3-state.
// 1h Reserved.
// 2h Drive on pin is logic low.
// 3h Drive on pin is logic high.
	s.DISMOD = (unsigned int)drive;
// 1-0 SRMOD 0-3h Serializer mode bit.
// 0 Serializer is inactive.
// 1h Serializer is transmitter.
// 2h Serializer is receiver.
// 3h Reserved.
	s.SRMOD = mode;
	memcpy(((uint8_t*)&regs.srctln) + n, &s, 1);
	return 0;
}

int McaspConfig::setChannels(unsigned int numChannels, std::vector<unsigned int>& serializers, bool input)
{
	uint32_t tdm = computeTdm(numChannels / serializers.size());
	input ? regs.rtdm = tdm : regs.xtdm = tdm;
	uint32_t fifoctl = computeFifoctl(serializers.size());
	input ? regs.rfifoctl = fifoctl : regs.wfifoctl = fifoctl;
	int ret = 0;
	for(auto const& s : serializers)
		ret |= setSrctln(s, input ? SrctlMode_RX : SrctlMode_TX, SrctlDrive_TRISTATE);
	return ret;
}

int McaspConfig::setInChannels(unsigned int numChannels, std::vector<unsigned int> serializers)
{
	return setChannels(numChannels, serializers, true);
}

int McaspConfig::setOutChannels(unsigned int numChannels, std::vector<unsigned int> serializers)
{
	return setChannels(numChannels, serializers, false);
}

#include <stdio.h>

void mcasp_test(const char* name, uint32_t val1, uint32_t val2)
{
	printf("mcasp %s %#10x %#10x %s\n", name, val1, val2,
		val1 == val2 ? "SUCCESS" : "ERROR");
}
