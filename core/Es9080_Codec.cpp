#include "../include/Es9080_Codec.h"
#include <stdexcept>

constexpr AudioCodecParams::TdmMode kTdmModeTdm = AudioCodecParams::kTdmModeTdm;
constexpr AudioCodecParams::ClockSource kClockSourceMcasp = AudioCodecParams::kClockSourceMcasp;
constexpr AudioCodecParams::ClockSource kClockSourceCodec = AudioCodecParams::kClockSourceCodec;
constexpr AudioCodecParams::ClockSource kClockSourceExternal = AudioCodecParams::kClockSourceExternal;

// parameters for TDM mode
const unsigned int kNumBits = 256;
const AudioCodecParams::TdmMode kTdmMode = kTdmModeTdm;
const unsigned int kSlotSize = 32;
const unsigned int kDataSize = 16;
const unsigned int kStartingSlot = 0;
const unsigned int kNumSlots = kNumBits / kSlotSize;

Es9080_Codec::Es9080_Codec(int i2cBus, int i2cAddress, AudioCodecParams::ClockSource clockSource, int resetPin, double mclkFrequency, bool isVerbose)
	: running(false)
	, verbose(isVerbose)
{
	params.slotSize = kSlotSize;
	params.startingSlot = kStartingSlot;
	params.dualRate = false;
	params.tdmMode = kTdmMode;
	params.bclk = clockSource;
	params.wclk = clockSource;
	if(kClockSourceCodec == clockSource) {
		params.mclk = mcaspConfig.getValidAhclk(24000000);
		// setting it
		params.samplingRate = params.mclk / double(kNumBits) / 2;
	} else {
		if(kClockSourceExternal == clockSource)
			params.mclk = mclkFrequency;
		else if (kClockSourceMcasp == clockSource)
			params.mclk = mcaspConfig.getValidAhclk(12000000);
		else
			throw std::runtime_error("Es9080: invalid clockSource");
		// inferring it
		params.samplingRate = params.mclk / kNumBits;
	}
	// not sure why this has to change, probably because the wclk
	// polarity also changes below
	params.bitDelay = (kClockSourceMcasp == params.wclk) ? 1 : 0;
	initI2C_RW(i2cBus, i2cAddress, -1);

	// toggle reset pin
	gpio.open(resetPin, Gpio::OUTPUT);
	gpio.clear();
	usleep(1000);
	gpio.set();
	// The ADS816x is also wired on this reset pin, so we wait:
	// ADS8166 datasheet 6.7 Switching characteristics
	// Delay time: RST rising to READY rising is 4ms MAX
	// However, there is typically enough time between here and the moment
	// the PRU start, so we don't have to explicitly wait here
}

Es9080_Codec::~Es9080_Codec()
{
	disable();
	gpio.clear();
}

McaspConfig& Es9080_Codec::getMcaspConfig()
{
	mcaspConfig.params.inChannels = getNumIns();
	mcaspConfig.params.outChannels = getNumOuts();;
	mcaspConfig.params.inSerializers = {};
	mcaspConfig.params.outSerializers = {3};
	mcaspConfig.params.numSlots = kNumSlots;
	mcaspConfig.params.slotSize = params.slotSize;
	mcaspConfig.params.dataSize = kDataSize;
	mcaspConfig.params.bitDelay = params.bitDelay;
	mcaspConfig.params.ahclkIsInternal = true;
	mcaspConfig.params.ahclkFreq = params.mclk;
	mcaspConfig.params.aclkIsInternal = (kClockSourceMcasp == params.bclk);
	mcaspConfig.params.wclkIsInternal = (kClockSourceMcasp == params.wclk);
	mcaspConfig.params.wclkIsWord = false;
	// when wclkFalling = true, the McASP generates what looks like an
	// "inverted" wclk (it stays high most of the time)
	mcaspConfig.params.wclkFalling = (kClockSourceMcasp == params.wclk) ? false : true;
	mcaspConfig.params.externalSamplesRisingEdge = false;

	return mcaspConfig;
}

int Es9080_Codec::initCodec(){
        // make sure the AHCLKX is running os the codec's registers can be accessed
        Mcasp::startAhclkx();
	gpio.set();
	// check it's alive. Write a register to the write-only address and
	// make sure it succeeds
	return disable();
}

/* A test utility.
int Es9080_Codec::setClocks(unsigned int divide_value, bool MASTER_BCK_DIV1, bool is16Bit, unsigned int MASTER_WS_SCALE)
{
	if(divide_value < 1 || divide_value > 128)
	{
		fprintf(stderr, "Es9080: invalid divide_value: %d\n", divide_value);
		return 1;
	}
	if(MASTER_WS_SCALE > 4)
	{
		fprintf(stderr, "Es9080: invalid MASTER_WS_SCALE: %d\n", MASTER_WS_SCALE);
		return 1;
	}
	uint8_t SELECT_MENC_NUM = divide_value - 1;
	if(writeRegister(4, SELECT_MENC_NUM))
		return 1;
	if(writeRegister(78, 0
			| MASTER_BCK_DIV1 << 6
			| 0 << 5 // MASTER_WS_IDLE. Sets the value of master WS when WS is idle.
			// MASTER_FRAME_LENGTH Selects the bit length in each TDM channel in master mode. "2" for 16 bit or "0" for 32 bit
			// NOTE: this affects the BCK: in "16bit" it halves it.
			| (is16Bit ? 2 : 0) << 3
			| 1 << 2 // MASTER_WS_PULSE_MODE: Pulse WS signal (The pulse width is 1 BCK cycle.)
			| 0 << 1 // MASTER_WS_INVERT: do not invert WS
			| 0 << 0 // MASTER_BCK_INVERT: do not invert BCK
		))
		return 1;
	if(writeRegister(79, 0
			| 0 << 7 // TDM_RESYNC: let TDM decoder sync
			| MASTER_WS_SCALE << 4
			| kNumSlots - 1 // TDM_CH_NUM: Total TDM slot number per frame = TDM_CH_NUM + 1.
		))
		return 1;
	return 0;
}
*/

#include <MiscUtilities.h>
int Es9080_Codec::executeProgram(const std::string& program)
{
	using StringUtils::parseAsInt;
	using StringUtils::split;
	using StringUtils::trim;
	std::vector<std::string> lines = split(program, '\n', true);
	for(auto& line : lines)
	{
		line = trim(line);
		std::vector<std::string> tokens = split(line, ' ', true, 5); // true auto trims it
		unsigned int cmdLen = 4;
		// some lines don't have the address, so they are 'w reg val'
		if(tokens.size() >= 3)
		{
			if(';' == tokens[2].back())
				cmdLen = 3;
		} else {
			if(tokens.size() < 4)
				continue;
		}
		if(tokens[0] != "w")
			continue;
		unsigned int i = 1;
		// we retrieve the address, used for error checking below
		unsigned int addr = 0xff;
		if(3 == cmdLen)
		{
			// the comment may have been split. Re-assemble it
			if(tokens.size() >= 5)
				tokens[3] = tokens[3] + ' ' + tokens[4];
		} else {
			addr = parseAsInt(tokens[i++].c_str());
		}
		unsigned int reg = parseAsInt(tokens[i++].c_str());
		unsigned int val = parseAsInt(tokens[i++].c_str());
		const std::string& comment = tokens[i++];
		verbose && printf("w 0x%x %u 0x%02x // %s\n", addr, reg, val, comment.c_str());
		if(writeRegister(reg, val))
		{
			fprintf(stderr, "Error writing\n");
			return 1;
		}
		if(addr != 0xff && currentAddress != (addr >> 1))
		{
			fprintf(stderr, "Wrote to wrong address\n");
			return 1;
		}
	}
	return 0;
}

int Es9080_Codec::startAudio(int dummy){
	std::string pin = "P8_33";
	// set the pinmuxer so that P8.33 is MCASP0_AXR3
	// echo mcasp > /sys/devices/platform/ocp/ocp:P8_33_pinmux/state
	std::string currentState = PinmuxUtils::get(pin);
	std::string desiredState = "mcasp";
	if(!currentState.size())
	{
		printf("Es9080 without cape file for %s requires you to set the pinmux some other way\n", pin.c_str());
	} else if(StringUtils::trim(currentState) != desiredState) {
		verbose && printf("Changing %s from %s to %s\n", pin.c_str(), StringUtils::trim(currentState).c_str(), desiredState.c_str());
		PinmuxUtils::set(pin, desiredState);
	}
	gpio.set();
	bool isMaster;
	int sum = (kClockSourceCodec == params.bclk) + (kClockSourceCodec == params.wclk);
	if(2 == sum)
		isMaster = true;
	else if (0 == sum)
		isMaster = false;
	else {
		fprintf(stderr, "Es9080: cannot generate only one of bclk, wclk\n");
		return 1;
	}
	std::string program = R"HEREDOC(
w 0x98 192 0x03; //Set GPIO1 (MCLK) pad to input mode, Invert CLKHV phase for better DNR
w 0x98 193 0xC3; //Set PLL Bypass, Remove 10k DVDD shunt to ground, set PLL input to MCLK, enable the PLL clock inputs
w 0x98 202 0x40; //Set PLL Parameters

w 0x90 1 0xFF; //Enable Interpolation and modulator clocks for all 8 channels
w 0x90 2 0x01; //Enable the TDM decoder
)HEREDOC";
	if(executeProgram(program))
		return 1;

	// The terms MCLK/SYS_CLK are used interchangeably in the literature and below
	// TODO: when using PLL or different mclk source, these may have to change
	const float SYS_CLK = params.mclk;
	// const float MCLK = SYS_CLK;

	// The way BCK and WS are divided down from MCLK when in master mode is
	// not clear from the datasheet.
	// Through experimentation I found the following:
	// Only registers or fields with MASTER in the name seem to affect TDM
	// master clocking.
	// I.e.: it would seem that (R79)TDM CONFIG1's TDM_CH_NUM and (R81)TDM
	// CONFIG3's TDM_BIT_WIDTH do not affect clocking, although they are
	// probably used both in master and slave mode and so should be set
	// appropriately.
	// I came up with the following formulas:
	//   BCK = MCLK / (divide_value_menc * (MASTER_BCK_DIV1 ? 1 : (is16Bit ? 4 : 2)))
	//   i.e.: MCLK_OVER_BCK = MCLK/BCK = divide_value_menc * (MASTER_BCK_DIV1 ? 1 : (is16Bit ? 4 : 2))
	//   WS = MCLK / (divide_value_menc * 128 * 2^MASTER_WS_SCALE)
	//   i.e.: MCLK_OVER_WS = MCLK/WS = (divide_value_menc * 128 * 2^MASTER_WS_SCALE)
	// where:
	//   divide_value_menc = SELECT_MENC_NUM + 1
	//   is16Bit s trure if params.slotSize is 16. This eventually sets MASTER_FRAME_LENGTH = is16Bit ?  2 :  0
	//  In this light, the name "MASTER_BCK_DIV1" seems to make sense:
	//  MASTER_BCK_DIV1 => "is the master bck divider 1?"
	//
	//"ES9080Q - Configuring TDM mode" says
	//  BCLK = (TDM_CH_NUM + 1) * MASTER_FRAME_LENGTH * WS
	//  WS = MCLK / (128 * (SELECT_IDAC_NUM + 1))
	// But there are issues with these formulas:
	// - TDM_CH_NUM or SELECT_IDAC_NUM demonstrably do not affect the
	// clocking. So one may think that these are _prescriptive_ equations
	// (i.e.: SELECT_IDAC_NUM and TDM_CH_NUM must be set so that they
	// satisfy these equations), however:
	// - MASTER_FRAME_LENGTH is either 2 or 0 according to the register
	// description. In case of '0' this would make the equation invalid and
	// that's clearly not the case.

	// Note: we compute these regardless of whether we are in master mode
	// or not, but some ot these will only be meaningful if isMaster
	const unsigned int MCLK_OVER_BCK = 2; // TODO: get it programmaticaly
	const unsigned int MCLK_OVER_WS = kNumBits * MCLK_OVER_BCK;
	bool is16Bit = (params.slotSize == 16);
	const unsigned int MASTER_BCK_DIV1 = 1; // setting this arbitrarily, because we don't know why we shouldn't.

	// apply the formulas above
	const unsigned int divide_value_menc = MCLK_OVER_BCK / (MASTER_BCK_DIV1 ? 1 : (is16Bit ? 4 : 2));
	//   WS = MCLK / (divide_value_menc * 128 * 2^MASTER_WS_SCALE)
	//   i.e.: MCLK_OVER_WS = MCLK/WS = (divide_value_menc * 128 * 2^MASTER_WS_SCALE)
	const unsigned int ws_scale_factor = MCLK_OVER_WS / (divide_value_menc * 128);
	// ws_scale_factor has to be a power of two between 2^0 and 2^4
	unsigned int MASTER_WS_SCALE = __builtin_ctz(ws_scale_factor); // find exponent: count trailing zeros
	if(!ws_scale_factor || (ws_scale_factor & ~(1 << MASTER_WS_SCALE)) || MASTER_WS_SCALE > 4)
	{
		fprintf(stderr, "Es9080: ws_scale_factor %u is not achievable\n", ws_scale_factor);
		return 1;
	}
	// MASTER_FRAME_LENGTH Selects the bit length in each TDM channel in master mode. "2" for 16 bit or "0" for 32 bit
	const unsigned int MASTER_FRAME_LENGTH = is16Bit ? 2 : 0;
	// let's use the formula provided by the application note (see above)
	//   WS = MCLK / (128 * (SELECT_IDAC_NUM + 1))
	// becomes
	//   MCLK_OVER_WS = 128 * (SELECT_IDAC_NUM + 1)
	uint8_t SELECT_IDAC_NUM = MCLK_OVER_WS / 128 - 1;

	//Register 3: DAC CONFIG
	//Sample Rate register (MCLK/fs ratio)
	// [5:0] SELECT_IDAC_NUM: CLK_IDAC divider. Whole number divide value + 1 for CLK_IDAC
	// (SYS_CLK/divide_value).
	//
	// It's not clear from the datasheet what the IDAC does. From the
	// reference implementation we get the following:
	// w 0x90 3 0x00 //MCLK = 128FS Eg, 49.152MHz/384kHz
	// w 0x90 3 0x01 //MCLK = 256FS Eg, 49.152MHz/192kHz
	// w 0x90 3 0x03 //MCLK = 512FS Eg, 49.152MHz/96kHz
	// w 0x90 3 0x07 //MCLK = 1024FS Eg, 49.152MHz/48kHz
	//
	// So it would empirically seem that SELECT_IDAC_NUM should be:
	// kNumBits = 128 * (1 + SELECT_IDAC_NUM)
	// This also matches with the WS equation provided reported above
	// taken from "ES9080Q - Configuring TDM mode"
	//
	// Looking at "Figure 7 - Clock distribution with Registers", it seems
	// that sets the clock divider from MCLK to "DAC interpolation path
	// clock", which has to be 128 * Fs. This is in accordance with the formula above.
	// E.g.: a 256-bit per frame MCLK has to be divided by 2, i.e.: SELECT_IDAC_NUM = 1
	//
	// Note: getting it wrong doesn't seem to cause drastic failures, but
	// it may affect THD+N performance and filter cutoffs (?) etc.
	// It doesn't affect BCK or WS
	if(writeRegister(3, SELECT_IDAC_NUM))
		return 1;

	//Register 4: MASTER CLOCK CONFIG
	//This sets BCK and WS frequency
	//[6:0] SELECT_MENC_NUM: Master mode clock divider. Whole number
	//divide value + 1 for CLK_Master (SYS_CLK/divide_value).
	//• 7'd0: Whole number divide value + 1 = 1 (default)
	//• 7'd1: Whole number divide value + 1 = 2
	//• 7'd127: Whole number divide value + 1 = 128
	//
	// It's not 100% clear from the docs what this does.
	// "ES9080Q - Configuring TDM mode" says:
	//   'In Master Mode, REGISTER 4[6:0] SELECT_MENC_NUM is the divider
	//   for the Master Decoding Clock.'
	// "Figure 7 - Clock distribution with Registers" of the datasheet
	// shows this as divider of MCK before it goes into the Master BCK/WS
	// gen (where it goes through another divider MASTER_WS_SCALE).

	if(divide_value_menc < 1 && divide_value_menc > 128)
	{
		fprintf(stderr, "Es9080: cannot divide down mclk %f by %u\n", params.mclk, divide_value_menc);
		return 1;
	}
	uint8_t SELECT_MENC_NUM = divide_value_menc - 1;
	if(writeRegister(4, SELECT_MENC_NUM))
		return 1;

	// Register 6: CP CLOCK DIV
	// [7:0] CP_CLK_DIV: Specifies the clk divider for the CP clock source. Valid from 8'd0 to 8'd255.
	//  • 8’d6: Default
	//  • 8’dx: CP clock is SYS_CLK/((x+1)*2)
	//  Note: CP_CLK_DIV value should reflect a CP clock source frequency of between 500kHz-1MHz
	// w 0x90 6 0x1F; //Set the PNEG charge pump clock frequency to 705.6kHz or 768kHz (depending on MCLK being 22.5792MHz or 24.576MHz)
	const float cpClockMin = 500000;
	const float cpClockMax = 1000000;

	// Find suitable value. It is unclear what's best (closet to cpClockMin, cpClockMax or in the middle ... )
	// Here we start from the top so we'll find the closets to cpClockMax till someone else tells us otherwise.
	float cpClock;
	uint8_t CP_CLK_DIV;
	for(CP_CLK_DIV = 0; CP_CLK_DIV <= 255; ++CP_CLK_DIV)
	{
		cpClock = SYS_CLK / ((CP_CLK_DIV + 1) * 2);
		if(cpClock <= cpClockMax)
			break;
	}
	if(cpClock < cpClockMin || cpClock > cpClockMax)
	{
		fprintf(stderr, "Es9080: unable to find valid CP_CLK_DIV\n");
		return 1;
	}
	if(writeRegister(6, CP_CLK_DIV))
		return 1;

	program = R"HEREDOC(
w 0x90 5 0xFF; //Enable all 8 channels Analog section.
w 0x90 7 0xBB; //Setup automated delay sequence for analog section quietest pop
w 0x90 51 0x80; //Force a PLL_LOCKL signal from analog since it it bypassed to prevent muting the DAC automatically
)HEREDOC";
	if(executeProgram(program))
		return 1;

	//TDM Registers
	//Register 77: INPUT CONFIG
	if(writeRegister(77, 0
			| isMaster << 4 // ENABLE_MASTER_MODE
			| 0 << 2 // INPUT_SEL: TDM
			| 0 << 0 // AUTO_INPUT_SELECT: disabled
		))
		return 1;
	if(isMaster)
	{
		//Register 78: MASTER MODE CONFIG
		if(writeRegister(78, 0
				// [6]: MASTER_BCK_DIV1
				// When enabled, master BCK is 128fs clock. Otherwise, BCK is less than or equal to 64fs.
				// • 1'b0: BCK is not 128fs clock (default)
				// • 1'b1: BCK is 128fs clock
				// Unclear. See results of tests above
				| MASTER_BCK_DIV1 << 6
				| 0 << 5 // MASTER_WS_IDLE. Sets the value of master WS when WS is idle.
				| MASTER_FRAME_LENGTH << 3
				| 1 << 2 // MASTER_WS_PULSE_MODE: Pulse WS signal (The pulse width is 1 BCK cycle.)
				| 0 << 1 // MASTER_WS_INVERT: do not invert WS
				| 0 << 0 // MASTER_BCK_INVERT: do not invert BCK
			))
			return 1;
	}
	//Register 79: TDM CONFIG1
	//w 0x90 79 0x27; //Scale WS by 4 (WS = 4*256FS = 1024FS), set 8 TDM slots per frame
	//
	// [6:4] // MASTER_WS_SCALE In TDM master mode, tunes master BCK/WS ratio by scaling master WS. It allows more TDM slots in a fixed frame.
	// In TDM master mode, tunes master BCK/WS ratio by scaling master WS. It allows more TDM slots in a fixed frame.
	// • 3'd0: No scale (default)
	// • 3'd1: Scale down WS by 2
	// • 3'd2: Scale down WS by 4
	// • 3'd3: Scale down WS by 8
	// • 3'd4: Scale down WS by 16
	// • others: Reserved
	//
	// Again, it's not clear from the datasheet how this works.
	// After some trials, it seems that the WS/BCK ratio::
	// - is independent of TDM_CH_NUM
	// - is independent of TDM_BIT_WIDTH
	// - starts at 32 or 64 or 128, depending on the value of MASTER_BCK_DIV1 and MASTER_FRAME_LENGTH
	// is further multiplied by (1 << MASTER_WS_SCALE)

	if(kNumSlots > 16) {
		fprintf(stderr, "Es9080: too many slots %u\n", kNumSlots);
		return 1;
	}
	if(MASTER_WS_SCALE > 4)
	{
		fprintf(stderr, "Es9080: MASTER_WS_SCALE too large: %u\n", MASTER_WS_SCALE);
		return 1;
	}
	if(writeRegister(79, 0
			| 0 << 7 // TDM_RESYNC: let TDM decoder sync
			| MASTER_WS_SCALE << 4
			// TDM_CH_NUM: Total TDM slot number per frame = TDM_CH_NUM + 1.
			// Note: this does not affect MASTER clocking, but it
			// should be set correctly or some slots may not work
			| kNumSlots - 1
		))
		return 1;

	// Register 80: TDM CONFIG2
	// w 0x90 80 0x88; //Set TDM to Left Justified mode and WS negative valid edge, TDM_VALID_PULSE_LEN = 8
	if(writeRegister(80, 0
			| 1 << 7 // TDM_LJ_MODE: LJ mode
			| 0 << 6 // TDM_VALID_EDGE: TDM WS valid edge: negative edge
			| 8 << 0 // TDM_VALID_PULSE_LEN: If using 8 or more TDM channels, set to "8"
		))
		return 1;

	// Register 81: TDM CONFIG3
	// [7:6] TDM_BIT_WIDTH
	// Bit width of each TDM slot.
	// • 2'b00: 32-bit (default)
	// • 2'b01: 24-bit
	// • 2'b10: 16-bit
	// • 2'b11: Reserved
	// Note: again, this won't affect MASTER clocking, but it may affect
	// the number of bits actually being considered
	uint8_t TDM_BIT_WIDTH;
	switch(kSlotSize) {
		case 32:
			TDM_BIT_WIDTH = 0;
			break;
		case 24:
			TDM_BIT_WIDTH = 1;
			break;
		case 16:
			TDM_BIT_WIDTH = 2;
			break;
		default:
			fprintf(stderr, "ES9080: Invalid slot size %d\n", kSlotSize);
			return 1;
	}
	if(writeRegister(81, 0
			| TDM_BIT_WIDTH << 6
			| 0 << 5 // TDM_CHAIN_MODE: disable daisy chain
			| 0 << 0 // TDM_DATA_LATCH_ADJ: Sets the position of the start bit within each TDM slot ...Can be moved +ve or -ve relative to MSB
		))
		return 1;

	// Register 82: BCK/WS MONITOR CONFIG
	if(writeRegister(82, 0)) // disable WS and BCK monitor
		return 1;

	// Register 83: TDM VALID PULSE CONFIG
	// [7:0] TDM_VALID_PULSE_POS: The position of TDM valid pulse compared to WS valid edge.
	// • 8’d0: Minimum
	// • 8’d255: Maximum
	// Note sure what this means. Let's leave it at 0 as per default
	const uint8_t TDM_VALID_PULSE_POS = 0;
	if(writeRegister(83, TDM_VALID_PULSE_POS))
		return 1;

	// Registers 84:91: TDM CHx CONFIG
	for(unsigned int n = 0; n < kNumOutChannels; ++n)
	{
		// w 0x90 85 0x01; //TDM_CH2_LINE_SEL = 00 (DATA2), TDM_CH2_SLOT_SEL = 1
		// w 0x90 86 0x02; //TDM_CH3_LINE_SEL = 00 (DATA2), TDM_CH3_SLOT_SEL = 2
		// w 0x90 87 0x03; //TDM_CH4_LINE_SEL = 00 (DATA2), TDM_CH4_SLOT_SEL = 3
		// w 0x90 88 0x04; //TDM_CH5_LINE_SEL = 00 (DATA2), TDM_CH5_SLOT_SEL = 4
		// w 0x90 89 0x05; //TDM_CH6_LINE_SEL = 00 (DATA2), TDM_CH6_SLOT_SEL = 5
		// w 0x90 90 0x06; //TDM_CH7_LINE_SEL = 00 (DATA2), TDM_CH7_SLOT_SEL = 6
		// w 0x90 91 0x07; //TDM_CH8_LINE_SEL = 00 (DATA2), TDM_CH8_SLOT_SEL = 7
		if(writeRegister(84 + n, 0
				// TDM_VALID_PULSE_POS_MSB The position of TDM valid pulse compared to WS valid edge. MSB bit from TDM_VALID_PULSE_POS
				| ((0 == n)*(TDM_VALID_PULSE_POS >> 6)) << 7 // should only be set on register 84
				| 0 << 4 // CHx data line selection. Receive from data line 1
				// CH1 data slot selection. CH1 receives data from Mth slot. M = TDM_CH1_SLOT_SEL + 1.
				// • 4’d0: Minimum (slot 1)
				// • 4’d15: Maximum (slot 16)
				| n << 0
			))
			return 1;
	}
	program = R"HEREDOC(
w 0x90 108 0x46; //Set filter shape to Minimum phase slow roll-off, disable de-emphasis
w 0x90 109 0xE4; //Set Dither into the IIR filters for best low level linearity

//THD Compensation Registers
w 0x90 111 0x68; //THD C2 Coefficient for CH1/3/5/7
w 0x90 112 0x01; //THD C2 Coefficient for CH1/3/5/7
w 0x90 113 0x8D; //THD C3 Coefficient for CH1/3/5/7
w 0x90 115 0x68; //THD C2 Coefficient for CH2/4/6/8
w 0x90 116 0x01; //THD C2 Coefficient for CH2/4/6/8
w 0x90 117 0x8D; //THD C3 Coefficient for CH2/4/6/8

//Automute Registers
w 119 0x00; //Disable automute for 8 channels

//NSMOD Registers
w 0x90 128 0xCC; //Set the NSMOD dither phases for best performance if summing channels together, (NOTE: not strictly needed for 8 channel mode)
w 0x90 129 0x54; //Set NSMOD dither type, and use 1/8th gain parameter in the NSMOD
w 0x90 131 0x44; //Set the Amount of dither into the NSMOD CH1/2 quantizer to best linearity
w 0x90 132 0x44; //Set the Amount of dither into the NSMOD CH3/4 quantizer to best linearity
w 0x90 133 0x44; //Set the Amount of dither into the NSMOD CH5/6 quantizer to best linearity
w 0x90 134 0x44; //Set the Amount of dither into the NSMOD CH7/8 quantizer to best linearity

//DRE Registers
w 0x90 136 0x0; //Set the DRE to turn off the THDR at low volume for power saving, and to swap analog and digital gain at low volume for best DNR

//Enable Audio
w 0x90 92 0x10; //Toggle DAC clock Resync to line up all the clocks in the DAC core for best analog performance
w 0x90 92 0x0F; //Toggle DAC clock Resync to line up all the clocks in the DAC core for best analog performance
w 0x90 92 0x00; //Toggle DAC clock Resync to line up all the clocks in the DAC core for best analog performance
w 0x90 0 0x02; //Turn on the AMP (This runs a state machine to gracefully turn on the DAC's)
)HEREDOC";
	if(executeProgram(program))
		return 1;

	// Register 105: VOLUME AND MONO CTRL
	if(writeRegister(105, 0
				| 1 << 6 // FORCE_VOLUME: Updates volume immediately after changing any of VOLUME1-VOLUME8
				| 0 << 5 // Separated volume control (default)
				| 0 << 4 // Separate volume control for each channel
			))
		return 1;
	running = true;
	if(writeLineOutVolumeRegisters())
		return 1;
	return 0;
}

int Es9080_Codec::stopAudio()
{
	// TODO: mute instead of disable?
	return disable();
}

template<typename T, typename U>
static int setByChannel(T& dest, const int channel, U val)
{
	if(channel >= (int)dest.size())
		return 1;
	for(unsigned int n = 0; n < dest.size(); ++n)
	{
		if(channel == int(n) || channel < 0)
		{
			dest[n] = val;
			if(channel >= 0)
				break;
		}
	}
	return 0;
}

int Es9080_Codec::setLineOutVolume(int channel, float gain)
{
	if(channel >= int(getNumOuts()))
		return -1;
	if(channel < 0)
	{
		int ret = 0;
		for(unsigned int n = 0; n < getNumOuts(); ++n)
			ret |= setLineOutVolume(n, gain);
		return ret;
	}
	if(setByChannel(lineOutVolume, channel, gain))
		return 1;
	if(running)
		return writeLineOutVolumeRegisters();
	return 0;
}

int Es9080_Codec::writeLineOutVolumeRegisters()
{
	for(unsigned int n = 0; n < lineOutVolume.size(); ++n)
	{
		unsigned int channel = n;
		float gain = lineOutVolume[n];
		// Can attenuate in half-dB steps or boost in one single 18dB step.

		// Registers 94:101: VOLUME1:8
		const int attReg = 94 + channel;
		float att = gain < 0 ? -gain : 0;
		// half dB steps
		unsigned int attVal = (int)(att * 2);
		if(writeRegister(attReg, attVal))
			return 1;

		// Register 154: GAIN 18dB
		const int boostReg = 154;
		int boostVal = readRegister(boostReg);
		if(boostVal < 0)
			return 1;
		const int bakBoostVal = boostVal;
		// this is a digital gain control with 0 or 18dB of boost
		if(gain >= 18)
		{
			// set bit
			boostVal |= 1 << channel;
		} else {
			//clear bit
			boostVal &= ~(1 << channel);
		}
		if(bakBoostVal != boostVal)
		{
			if(writeRegister(boostReg, boostVal))
				return 1;
		}
	}
	return 0;
}

int Es9080_Codec::setInputGain(int channel, float gain)
{
	return 0;
}

int Es9080_Codec::setAddressForReg(unsigned int reg, bool write)
{
	// the ES9080 can be contacted at two addresses. The one we got in the
	// constructor is the write-only address. The read/write is 4 less than that
	const int writeOnly = i2C_address;
	const int readWrite = writeOnly - 4;
	const int err = -1;
	int addr = err;
	// At the write-only address:
	// Write-only Register
	//	 Registers 192 – 203 (0xC0 – 0xCB) are write only registers.
	if(reg >= 192 && reg <= 203 && write)
		addr = writeOnly;
	// At the read/write address:
	// Read/Write Registers
	// 	Registers 0–164 (0x00 – 0xB3) are read/write registers
	if(reg <= 164)
		addr = readWrite;
	// At the read/write address (again):
	// Read-only Register
	// 	Registers 224 – 255 (0xE0 – 0xFF) are read only registers.
	if(reg >= 224 && reg <= 255 && !write)
		addr = readWrite;

	if(err == addr)
		return 1;
	if(ioctl(i2C_file, I2C_SLAVE, addr) < 0)
	{
		fprintf(stderr, "Failed to set i2c address\n");
		return 1;
	}
	currentAddress = addr;
	return 0;
}

// Write a specific register on the codec
int Es9080_Codec::writeRegister(unsigned int reg, unsigned int value)
{
	int addr = setAddressForReg(reg, true);
	if(addr < 0)
		return 1;

	char buf[2] = { static_cast<char>(reg & 0xFF), static_cast<char>(value & 0xFF) };
	if(write(i2C_file, buf, sizeof(buf)) != sizeof(buf))
	{
		verbose && fprintf(stderr, "Failed to write register %d on Es9080 codec\n", reg);
		return 1;
	}
	return 0;
}

// Read a specific register from the codec
int Es9080_Codec::readRegister(unsigned char reg)
{
	if(setAddressForReg(reg, true))
		return 1;

	// first, write the address of the register you want to read
	int ret = write(i2C_file, &reg, sizeof(reg));
	if(sizeof(reg) != ret)
	{
		verbose && fprintf(stderr, "Failed to write register %d on Es9080 codec\n", reg);
		return -1;
	}
	// then read the content of the address you specified
	unsigned char value;
	ret = read(i2C_file, &value, sizeof(value));
	if(sizeof(value) != ret)
	{
		verbose && fprintf(stderr, "Failed to read register %d on Es9080 codec\n", reg);
		return -1;
	}
	return value;
}

int Es9080_Codec::setHpVolume(int channel, float gain)
{
	return 0;
}

float Es9080_Codec::getSampleRate(){
	return params.samplingRate;
}

unsigned int Es9080_Codec::getNumIns(){
	return 0;
}

unsigned int Es9080_Codec::getNumOuts(){
	return kNumOutChannels;
}

int Es9080_Codec::disable()
{
	running = false;
	// TODO: should we mute instead of reset?
	return reset();
}

int Es9080_Codec::reset()
{
	//  RESET & PLL REGISTER1: AO_SOFT_RESET | PLL_SOFT_RESET
	if(writeRegister(192, 0xC0))
		return 1;
	//  RESET & PLL REGISTER1: clear AO_SOFT_RESET | PLL_SOFT_RESET
	if(writeRegister(192, 0x0))
		return 1;
	return 0;
}
