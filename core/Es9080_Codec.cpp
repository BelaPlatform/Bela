#include "../include/Es9080_Codec.h"

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
const unsigned int kBitDelay = 0;
const unsigned int kNumSlots = kNumBits / kSlotSize;

Es9080_Codec::Es9080_Codec(int i2cBus, int i2cAddress, bool isVerbose)
	: running(false)
	, verbose(isVerbose)
{
	params.slotSize = kSlotSize;
	params.startingSlot = kStartingSlot;
	params.bitDelay = kBitDelay;
	params.dualRate = false;
	params.tdmMode = kTdmMode;
	params.bclk = kClockSourceCodec;
	params.wclk = kClockSourceCodec;
	params.mclk = mcaspConfig.getValidAhclk(24000000);
	params.samplingRate = params.mclk / double(kNumBits);
	initI2C_RW(i2cBus, i2cAddress, -1);
	gpio.open(61, Gpio::OUTPUT);
}

Es9080_Codec::~Es9080_Codec()
{
	disable();
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
	mcaspConfig.params.wclkIsInternal = (kClockSourceMcasp == params.wclk);
	mcaspConfig.params.wclkIsWord = false; // could be
	mcaspConfig.params.wclkFalling = true;
	mcaspConfig.params.externalSamplesRisingEdge = false;

	return mcaspConfig;
}

int Es9080_Codec::initCodec(){
	gpio.set();
	// check it's alive. Write a register to the write-only address and
	// make sure it succeeds
	return disable();
}

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
		printf("w 0x%x %u 0x%02x // %s\n", addr, reg, val, comment.c_str());
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
	gpio.set();
	std::string program = R"HEREDOC(
//Initialize Master Mode TDM with 8 channels, MCLK = 49.152MHz, fs = 48kHz, DRE enabled, automute enabled
w 0x98 192 0x03; //Set GPIO1 (MCLK) pad to input mode, Invert CLKHV phase for better DNR
w 0x98 193 0xC3; //Set PLL Bypass, Remove 10k DVDD shunt to ground, set PLL input to MCLK, enable the PLL clock inputs
w 0x98 202 0x40; //Set PLL Parameters

w 0x90 1 0xFF; //Enable Interpolation and modulator clocks for all 8 channels
w 0x90 2 0x01; //Enable the TDM decoder
//Sample Rate register (MCLK/fs ratio)
//w 0x90 3 0x00; //MCLK = 128FS Eg, 49.152MHz/384kHz
//w 0x90 3 0x01; //MCLK = 256FS Eg, 49.152MHz/192kHz
w 0x90 3 0x03; //MCLK = 512FS Eg, 49.152MHz/96kHz
//w 0x90 3 0x07; //MCLK = 1024FS Eg, 49.152MHz/48kHz

//This sets BCK and WS frequency
w 0x90 4 0x00; //BCK & WS = 128FS, TDM512
//w 0x90 4 0x01; //BCK & WS = 256FS, TDM256
//w 0x90 4 0x03; //BCK & WS = 512FS, TDM128
//w 0x90 4 0x07; //BCK & WS = 1024FS, TDM64 (I2S)
w 0x90 5 0xFF; //Enable all 8 channels Analog section.
w 0x90 6 0x1F; //Set the PNEG charge pump clock frequency to 705.6kHz or 768kHz (depending on MCLK being 22.5792MHz or 24.576MHz)
w 0x90 7 0xBB; //Setup automated delay sequence for analog section quietest pop
w 0x90 51 0x80; //Force a PLL_LOCKL signal from analog since it it bypassed to prevent muting the DAC automatically

//TDM Registers
w 0x90 77 0x10; //Enable Master Mode
//GGG w 0x90 78 0x03; //Invert Master mode WS and BCK
w 0x90 78 0x04; //GGG Do not invert Master mode WS and BCK, WS is pulse
w 0x90 79 0x27; //Scale WS by 4 (WS = 4*256FS = 1024FS), set 8 TDM slots per frame
//GGGw 0x90 80 0xC8; //Set TDM to Left Justified mode and WS positive valid edge, TDM_VALID_PULSE_LEN = 8
w 0x90 80 0x88; //GGG Set TDM to Left Justified mode and WS positive valid edge, TDM_VALID_PULSE_LEN = 8
w 0x90 84 0x00; //TDM_CH1_LINE_SEL = 00 (DATA2), TDM_CH1_SLOT_SEL = 0
w 0x90 85 0x01; //TDM_CH2_LINE_SEL = 00 (DATA2), TDM_CH2_SLOT_SEL = 1
w 0x90 86 0x02; //TDM_CH3_LINE_SEL = 00 (DATA2), TDM_CH3_SLOT_SEL = 2
w 0x90 87 0x03; //TDM_CH4_LINE_SEL = 00 (DATA2), TDM_CH4_SLOT_SEL = 3
w 0x90 88 0x04; //TDM_CH5_LINE_SEL = 00 (DATA2), TDM_CH5_SLOT_SEL = 4
w 0x90 89 0x05; //TDM_CH6_LINE_SEL = 00 (DATA2), TDM_CH6_SLOT_SEL = 5
w 0x90 90 0x06; //TDM_CH7_LINE_SEL = 00 (DATA2), TDM_CH7_SLOT_SEL = 6
w 0x90 91 0x07; //TDM_CH8_LINE_SEL = 00 (DATA2), TDM_CH8_SLOT_SEL = 7

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
	//std::string program = IoUtils::readTextFile("/root/Bela/es9080-program.txt");
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
		return  1;
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
	return 8;
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
	return writeRegister(192, 0x0);
	gpio.clear();
}
