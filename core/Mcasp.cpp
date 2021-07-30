#include "../include/Mcasp.h"
#include <string.h>
#include <stdio.h>
#include <limits>
#include <cmath>
#include <stdexcept>

McaspConfig::McaspConfig()
{
	params = {0};
#ifdef IS_AM572x
	params.auxClkIn = 20000000;	// workaround due to unexpected sys_clk2 frequency
#else
	params.auxClkIn = 24000000;
#endif	// IS_AM572x
}

double McaspConfig::getValidAhclk(double desiredClk, unsigned int* outDiv)
{
	double error = std::numeric_limits<double>::max();
	unsigned int div;
	// search for a local minimum in the error
	for(div = 1; div <= 4096; ++div)
	{
		double newError = std::abs(params.auxClkIn / div - desiredClk);
		if(newError < error)
			error = newError;
		else {
			--div;
			break;
		}
	}
	if(outDiv)
		*outDiv = div;
	return params.auxClkIn/div;
}

int McaspConfig::setFmt()
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

//XDATDLY: 0-3h Transmit sync bit delay.
//0 0-bit delay. The first transmit data bit, AXRn, occurs in same ACLKX cycle
//as the transmit frame sync (AFSX).
//1h 1-bit delay. The first transmit data bit, AXRn, occurs one ACLKX cycle
//after the transmit frame sync (AFSX).
//2h 2-bit delay. The first transmit data bit, AXRn, occurs two ACLKX cycles
//after the transmit frame sync (AFSX).
//3h Reserved.
	s.DATADLY = params.bitDelay;

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
	unsigned int slotSize = params.slotSize;
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
	if(params.dataSize & 3 || params.dataSize > 32) // has to be a multiple of 4
		return -1;

	int WORD = 16; // word size is always 16 for the current PRU code, so dataSize is ignored.
	int rotation;
	// Table 22-9. Transmit Bitstream Data Alignment:
	// Tx, MSB first, left-aligned, integer should have XROT=WORD
	rotation = WORD;
	s.ROT = rotation >> 2;
	memcpy(&regs.xfmt, &s, sizeof(regs.xfmt));
	// Table 22-10. Receive Bitstream Data Alignment:
	// Rx, MSB first, left-aligned, integer should have XROT=SLOT-WORD
	rotation = params.slotSize - WORD;
	s.ROT = rotation >> 2;
	memcpy(&regs.rfmt, &s, sizeof(regs.rfmt));
	return 0;
}

int McaspConfig::setAclkctl()
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
	s.CLKP = params.externalSamplesRisingEdge;

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

int McaspConfig::setAfsctl()
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
	if(params.numSlots > 32 || params.numSlots < 2)
		return 1;
	s.MOD = params.numSlots;
// FXWID: Transmit frame sync width select bit indicates the width of the
// transmit frame sync (AFSX) during its active period.
// 0 Single bit.
// 1 Single word.
	s.FWID = params.wclkIsWord;
// FSXM: Transmit frame sync generation select bit.
// 0 Externally-generated transmit frame sync.
// 1 Internally-generated transmit frame sync.
	s.FSM = params.wclkIsInternal;
// FSXP: Transmit frame sync polarity select bit.
//0 A rising edge on transmit frame sync (AFSX) indicates the beginning of a frame.
//1 A falling edge on transmit frame sync (AFSX) indicates the beginning of a frame.
	s.FSP = params.wclkFalling;
	memcpy(&regs.afsxctl, &s, sizeof(regs.afsxctl));
	regs.afsrctl = regs.afsxctl;
	return 0;
}

int McaspConfig::setAhclkctl()
{
	struct {
		unsigned HCLKDIV : 12;
		unsigned : 2;
		unsigned HCLKP : 1;
		unsigned HCLKM : 1;
		unsigned : 16;
	} s = {0};
// HCLKXM: Transmit high-frequency clock source bit.
// 0 External transmit high-frequency clock source from AHCLKX pin.
// 1 Internal transmit high-frequency clock source from output of programmable
// high clock divider.
	s.HCLKM = params.ahclkIsInternal;
// HCLKXP: Transmit bitstream high-frequency clock polarity select bit.
// 0 AHCLKX is not inverted before programmable bit clock divider. In the
// special case where the transmit bit clock (ACLKX) is internally generated
// and the programmable bit clock divider is set to divide-by-1 (CLKXDIV = 0 in
// ACLKXCTL), AHCLKX is directly passed through to the ACLKX pin.
// 1 AHCLKX is inverted before programmable bit clock divider. In the special
// case where the transmit bit clock (ACLKX) is internally generated and the
// programmable bit clock divider is set to divideby-1 (CLKXDIV = 0 in
// ACLKXCTL), AHCLKX is directly passed through to the ACLKX pin.
	s.HCLKP = 0;
// HCLKXDIV: 0-FFFh Transmit high-frequency clock divide ratio bits determine the divide-down ratio from AUXCLK to
// AHCLKX.
// 0 Divide-by-1.
// 1h Divide-by-2.
// 2h-FFFh Divide-by-3 to divide-by-4096.
	unsigned int hclkdiv;
	if(params.ahclkIsInternal)
	{
		unsigned int div;
		getValidAhclk(params.ahclkFreq, &div);
		hclkdiv = div - 1;
	} else {
		hclkdiv = 0;
	}
	s.HCLKDIV = hclkdiv;
	memcpy(&regs.ahclkxctl, &s, sizeof(regs.ahclkxctl));
	regs.ahclkrctl = regs.ahclkxctl;
	return 0;
}

int McaspConfig::setPdir()
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
	s.AFSX = params.wclkIsInternal;
// AHCLKX: Determines if AHCLKX pin functions as an input or output.
// 0 Pin functions as input.
// 1 Pin functions as output.
	s.AHCLKX = params.ahclkIsInternal;
	if(!params.ahclkIsInternal)
	{
		throw std::runtime_error("McASP: external ahclk is unsupported\n"); //TODO: not sure where else we nned to make changes to support it.
	}
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
	uint8_t axr = 0;
	for(const auto& n : params.outSerializers)
		axr |= (1 << n);
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
	} s = {0};
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
	s.NUMEVT = numSerializers; // we are not using the DMA events in the PRU code, so this value is unused

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

McaspRegisters McaspConfig::getRegisters()
{
	int ret = setFmt();
	if(ret)
		fprintf(stderr, "McaspConfig: error while setting FMT\n");
	ret = setAclkctl();
	if(ret)
		fprintf(stderr, "McaspConfig: error while setting ACLKCTL\n");
	ret = setAhclkctl();
	if(ret)
		fprintf(stderr, "McaspConfig: error while setting AHCLKCTL\n");
	ret = setAfsctl();
	if(ret)
		fprintf(stderr, "McaspConfig: error while setting AFSCTL\n");
	ret = setPdir();
	if(ret)
		fprintf(stderr, "McaspConfig: error while setting PDIR\n");
	// individual bytes of regs.srctln are set by setSrctln(), which is
	// called by setChannels()
	regs.srctln = 0;
	ret = setChannels(params.inChannels, params.inSerializers, true);
	if(ret)
		fprintf(stderr, "McaspConfig: error while setting input channels\n");
	ret = setChannels(params.outChannels, params.outSerializers, false);
	if(ret)
		fprintf(stderr, "McaspConfig: error while setting output channels\n");
	regs.rmask = regs.xmask = ((uint64_t)1 << (uint64_t)params.dataSize) - 1;
	return regs;
}

#include <iostream>
#include <iterator>
// https://stackoverflow.com/questions/10750057/how-to-print-out-the-contents-of-a-vector
template <typename T>
std::ostream& operator<< (std::ostream& out, const std::vector<T>& v) {
  if ( !v.empty() ) {
    out << '{';
    std::copy (v.begin(), v.end(), std::ostream_iterator<T>(out, ", "));
    out << "\b\b}";
  }
  return out;
}
void McaspConfig::print()
{
#define P(FIELD) std::cout << #FIELD << ": " <<  params.FIELD << "\n"
	std::cout << "Mcasp parameters:\n";
	P(inChannels);
	P(outChannels);
	P(inSerializers);
	P(outSerializers);
	P(numSlots);
	P(slotSize);
	P(dataSize);
	P(bitDelay);
	P(auxClkIn);
	P(ahclkFreq);
	P(ahclkIsInternal);
	P(wclkIsInternal);
	P(wclkIsWord);
	P(wclkFalling);
	P(externalSamplesRisingEdge);

	getRegisters(); // update the registers with the current parameters
#define R(FIELD) printf("%10s: 0x%08x\n", #FIELD, regs.FIELD)
	std::cout << "Mcasp registers:\n";
	R(pdir);
	R(rmask);
	R(rfmt);
	R(afsrctl);
	R(aclkrctl);
	R(ahclkrctl);
	R(rtdm);
	R(xmask);
	R(xfmt);
	R(afsxctl);
	R(aclkxctl);
	R(ahclkxctl);
	R(xtdm);
	R(srctln);
	R(wfifoctl);
	R(rfifoctl);
}
