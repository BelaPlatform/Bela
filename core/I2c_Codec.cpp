/*
 * I2c_Codec.cpp
 *
 * Handle writing the registers to the TLV320AIC310x
 * series audio codecs, used on the BeagleBone Audio Cape.
 * This code is designed to bypass the ALSA driver and
 * configure the codec directly in a sensible way. It
 * is complemented by code running on the PRU which uses
 * the McASP serial port to transfer audio data.
 *
 *  Created on: May 25, 2014
 *      Author: Andrew McPherson
 */

#include "../include/I2c_Codec.h"
#include <cmath>
#include <limits>
#include <stdexcept>

// if only we could be `using` these...
constexpr AudioCodecParams::TdmMode kTdmModeI2s = AudioCodecParams::kTdmModeI2s;
constexpr AudioCodecParams::TdmMode kTdmModeDsp = AudioCodecParams::kTdmModeDsp;
constexpr AudioCodecParams::TdmMode kTdmModeTdm = AudioCodecParams::kTdmModeTdm;
constexpr AudioCodecParams::ClockSource kClockSourceMcasp = AudioCodecParams::kClockSourceMcasp;
constexpr AudioCodecParams::ClockSource kClockSourceCodec = AudioCodecParams::kClockSourceCodec;
constexpr AudioCodecParams::ClockSource kClockSourceExternal = AudioCodecParams::kClockSourceExternal;

I2c_Codec::I2c_Codec(int i2cBus, int i2cAddress, CodecType type, bool isVerbose /*= false*/)
: codecType(type)
	, running(false)
	, verbose(isVerbose)
	, differentialInput(false)
	, unmutedPowerStage(false)
	, micBias(2.5)
	, mode(InitMode_init)
{
	params.slotSize = 16;
	params.startingSlot = 0;
	params.bitDelay = 0;
	params.dualRate = false;
	params.tdmMode = kTdmModeDsp;
	params.bclk = kClockSourceCodec;
	params.wclk = kClockSourceCodec;
	params.mclk = mcaspConfig.getValidAhclk(24000000);
	params.samplingRate = 44100;
	initI2C_RW(i2cBus, i2cAddress, -1);
}

// This method initialises the audio codec to its default state
int I2c_Codec::initCodec()
{
	if(InitMode_noInit == mode)
		return 0;
	// Write the reset register of the codec
	if(writeRegister(0x01, 0x80)) // Software reset register
	{
		verbose && fprintf(stderr, "Failed to reset I2C codec\n");
		return 1;
	}

	// Wait for codec to process the reset (for safety)
	usleep(5000);

	return 0;
}

// Tell the codec to start generating audio
// See the TLV320AIC3106 datasheet for full details of the registers
int I2c_Codec::startAudio(int shouldBeReady)
{
	Mcasp::startAhclkx();
	if(verbose)
		getParameters().print();
	// setting forceEnablePll = false will attempt (and probably fail) to use clock
	// divider instead of PLL when bit clock is generated externally
	bool forceEnablePll = true;
	bool pllEnabled;
	bool pllclkInIsBitClock;
	if(kClockSourceCodec == params.bclk) {
		// we generate the bit clock via PLL
		PLLCLK_IN = params.mclk;
		pllclkInIsBitClock = false;
		pllEnabled = true;
	} else {
		getMcaspConfig(); // updates mcaspConfig.params.numSlots if needed
		unsigned int numSlots = mcaspConfig.params.numSlots;
		// bit clock is generated externally.
		// Reconstruct its frequency:
		PLLCLK_IN = params.samplingRate * params.slotSize * numSlots;
		pllclkInIsBitClock = true;
		if(forceEnablePll)
			pllEnabled = true;
		else
			pllEnabled = false;
	}
	// As a best-practice it's safer not to assume the implementer has issued initCodec()
	// or has not otherwise modified codec registers since that call.
	// Explicit Switch to config register page 0:
	if(writeRegister(0x00, 0x00))	// Page Select Register
		return 1;

	if(writeRegister(0x0D, 0x00))	// Headset / button press register A: disabled
		return 1;
	if(writeRegister(0x0E, 0x80))	// Headset / button press register B:: Programs high-power outputs for ac-coupled driver configuration
		return 1;
	if(writeRegister(0x25, 0xC0))	// DAC power/driver register: DAC power on (left and right)
		return 1;
	if(writeRegister(0x26, 0x04))	// High power output driver register: Enable short circuit protection
		return 1;
	if(writeRegister(0x28, 0x02))	// High power output stage register: output soft-stepping disabled. Note: when enabling soft stepping it seems to take much longer than the datasheet would suggest, to the point that it's annoying on startup.
		return 1;

	if(InitMode_noInit != mode) {
		// see datasehet for TLV320AIC3104 from page 44
		if(pllEnabled) {
			if(setAudioSamplingRate(params.samplingRate))
				return 1;
		} else {
			// when the PLL is disabled, we use the clock divider instead.
			// this will only work when the external clock has (n+1)*128 cycles per frame
			// 10.3.3.1:
			// The audio converters in the TLV320AIC3104 need an internal audio master clock at a frequency of 256*fs(ref),
			// which can be obtained in a variety of manners from an external clock signal applied to the device.
			// ....
			// when the PLL is disabled, fs(ref) = CLKDIV_IN / (128 * Q)
			//

			// TODO: what should we do when receiving an external bit clock that is outside the 39kHz to 53kHz for fs(ref)?
			// can we set NCODEC to anything else than 1?
			if(params.samplingRate < 39000 || params.samplingRate > 53000)
				fprintf(stderr, "Using out of range sampling rate. It is not guaranteed to work as expected\n");
			setNcodec(1);

			unsigned int numSlots = mcaspConfig.params.numSlots;
			unsigned int Q = (params.slotSize * numSlots) / 128;
			// Table 10-9. Page 0, Register 3: PLL Programming Register A
			if(Q < 2 || Q > 17) // valid values are 2 to 17, inclusive
			{
				fprintf(stderr, "I2c_Codec: trying to disable PLL in incompatible mode\n");
				return 1;
			}
			unsigned int q;
			if(Q <= 15)
				q = Q;
			else
				q = Q - 16;
			unsigned int pllEnableBit = 0; // clock is generated externally
			uint8_t byte = pllEnableBit << 7 | q << 3;
			if(writeRegister(0x03, byte))
				return 1;
		}

		if(params.dualRate) {
			if(writeRegister(0x07, 0xEA))	// Codec datapath register: 44.1kHz; dual rate; standard datapath
				return 1;
		}
		else {
			if(writeRegister(0x07, 0x8A))	// Codec datapath register: 44.1kHz; std rate; standard datapath
				return 1;
		}

		if(kClockSourceCodec == params.bclk) {
			if(kClockSourceCodec == params.wclk) {
				if(writeRegister(0x08, 0xE0)) {	// Audio serial control register A: BCLK, WCLK outputs,
					return 1;					// DOUT tri-state when inactive
				}
			}
			else {
				if(writeRegister(0x08, 0xA0)) {	// Audio serial control register A: BCLK output, WCLK input,
					return 1;					// DOUT tri-state when inactive
				}			
			}
		}
		else {
			// If we don't generate the bit clock then we don't generate the word clock
			if(writeRegister(0x08, 0x20))	// Audio serial control register A: BCLK, WCLK inputs,
				return 1;					// DOUT tri-state when inactive
		}

		// Supported values of slot size in the PRU code: 16 and 32 bits. Note that
		// altering slot size may require changing #defines in the PRU code.
		unsigned int crb = 0; 	// Audio serial control register B
		switch(params.tdmMode)
		{
			case kTdmModeI2s:
				crb |= 0;
			break;
			case kTdmModeDsp:
				crb |= (1 << 6); // Transfer mode: DSP
				break;
			case kTdmModeTdm:
				crb |= (1 << 6); // Transfer mode: DSP
				crb |= 1 << 3; // enable 256-clock mode when Bclk is an output
				break;
			default:
				return 1;
		}
		unsigned int wlc; // word length control
		switch(params.slotSize)	{
		case 16:
			wlc = 0;
			break;
		case 20:
			wlc = 1;
			break;
		case 24:
			wlc = 2;
			break;
		case 32:
			wlc = 3;
			break;
		default:
			return 1;
		}
		crb |= (wlc << 4);
		if(writeRegister(0x09, crb)) // Audio serial control register B
			return 1;
		unsigned int crc = params.startingSlot * params.slotSize + params.bitDelay;
		if(writeRegister(0x0A, crc)) // Audio serial control register C: specifying offset in bits
			return 1;

		// clock generation
		uint8_t clkSource = pllclkInIsBitClock ? 0x2 : 0x0; // uses BCLK or uses MCLK
		uint8_t byte = clkSource << 6 | clkSource << 4 | 2; // CLKDIV_IN, PLLCLK_IN, PLL N = 2
		if(writeRegister(0x66, byte))
			return 1;
		if(pllEnabled) {
			if(writeRegister(0x65, 0x00))	// GPIO control register B: disabled; codec uses PLLDIV_OUT
				return 1;
		} else {
			if(writeRegister(0x65, 0x01))	// GPIO control register B: disabled; codec uses CLKDIV_OUT
				return 1;
		}
	} // if not noInit
	
	bool dcRemoval;
	if(!differentialInput) {
		//Set-up hardware high-pass filter for DC removal
		dcRemoval = true;
	}
	else {
		// Disable DC blocking for differential analog inputs
		dcRemoval = false;
	}

	if(configureDCRemovalIIR(dcRemoval))
		return 1;
	uint8_t micBiasField;
	if(2.5 < micBias)
		micBiasField = 0b11; // MICBIAS is connected to AVDD
	else if (2 < micBias)
		micBiasField = 0b10; // MICBIAS is powered to 2.5V
	else if (micBias == 2)
		micBiasField = 0b01; // MICBIAS is powered to 2V
	else
		micBiasField = 0b00; // MICBIAS is powered down

	if(writeRegister(0x19, micBiasField << 6)) // Set MICBIAS
		return 1;

	// TODO: may need to separate the code below for non-master codecs so they enable amps after the master clock starts

	// wait for the codec to stabilize before unmuting the HP amp.
	// this gets rid of the loud pop, but it only makes sense if the mclk
	// has been already enabled
	if(kClockSourceCodec == params.bclk)
		usleep(10000);

	// note : a small click persists, but we don't seem to manage to avoid it
	if(writeHPVolumeRegisters())	// Send DAC to high-power outputs
		return 1;
	if(writeLineOutVolumeRegisters())
		return 1;
	if(writeDacVolumeRegisters(false))	// Unmute and set volume
		return 1;

	if(writeAdcVolumeRegisters(false))	// Unmute and set ADC volume
		return 1;

	if(shouldBeReady)
	{
		// let's not continue till the output is actually ready
		// before we start rendering audio
		bool ready = false;
		for(unsigned int n = 0; n < 50; ++n)
		{
			int reg = 0x41; // HPROUT output level control register
			int ret = readRegister(reg);
			if(ret < 0)
				return -1;
			const int mask = 0b1011; // unmuted, all gains applied, fully powered up
			if((ret & mask) != mask)
			{
				usleep(10000);
				verbose && fprintf(stderr, "Polling for unmute: %x\n", ret & mask);
			}
			else {
				ready = true;
				break;
			}
		}
		if(!ready)
		{
			fprintf(stderr, "Codec did not unmute\n");
			return -1;
		}
	}
	running = true;
	return 0;
}

//
// Enable DC offset removal in CODEC hardware (High-Pass filter)
// Datasheet reference: TLV320AIC3104, SLAS510F - FEB 2007, Rev DEC 2016
// CODEC 1-pole Filter.  Datasheet calls it HPF but it can be any 1-pole filter
// realizable by the following the transfer function:
//           n0 + n1 * z^-1
// H(z) =  ------------------    (10.3.3.2.1 - pg 26)
//           d0 - d1 * z^-1
// d0 =  32768 //defined by hardware (presumably fixed-point unity)
// For the high-pass filter case (bilinear transform method),
// d1 = n0 = -n1
// d1 = d0*e^(-2*pi*fc/fs) = 32768*e^(-2*pi*8/44100) = 32730.7, round up
// d1 =  32731 = 0x7FDB
// n0 =  32731 = 0x7FDB
// n1 =  -32731 = 0x8025 //2s complement
//
//    NOTE: Increasing the sampling rate will increase the filter cut-off proportionately.
//          The selected cut-off should be acceptable up to 96 kHz sampling rate.
//

int I2c_Codec::configureDCRemovalIIR(bool enable){

	//Explicit Switch to config register page 0:
	if(writeRegister(0x00, 0x00))	//Page 1/Register 0: Page Select Register
		return 1;

	if(!enable) {
		if(writeRegister(0x0C, 0x00))	// Digital filter register: disable HPF on L&R Channels 
			return 1;		
		return 0;
	}
	
	//
	//  Config Page 0 commands
	//
	if(writeRegister(0x0C, 0x50))	// Digital filter register: enable HPF on L&R Channels -- TLVTODO: 0x00 for disabled
		return 1;
	if(writeRegister(0x6B, 0xC0))	// HPF coeff select register: Use programmable coeffs
		return 1;

	//Switch to config register page 1:
	if(writeRegister(0x00, 0x01))	//Page 1/Register 0: Page Select Register
		return 1;
	//
	//  Config Page 1 commands
	//

	//Left Channel HPF Coeffiecient Registers
	//N0:
	if(writeRegister(0x41, 0x7F))	// Page 1/Register 65: Left-Channel ADC High-Pass Filter N0 Coefficient MSB Register
		return 1;
	if(writeRegister(0x42, 0xDB))	//Page 1/Register 66: Left-Channel ADC High-Pass Filter N0 Coefficient LSB Register
		return 1;
	//N1:
	if(writeRegister(0x43, 0x80))	//Page 1/Register 67: Left-Channel ADC High-Pass Filter N1 Coefficient MSB Register
		return 1;
	if(writeRegister(0x44, 0x25))	//Page 1/Register 68: Left-Channel ADC High-Pass Filter N1 Coefficient LSB Register
		return 1;
	//D1:
	if(writeRegister(0x45, 0x7F))	//Page 1/Register 69: Left-Channel ADC High-Pass Filter D1 Coefficient MSB Register
		return 1;
	if(writeRegister(0x46, 0xDB))	//Page 1/Register 70: Left-Channel ADC High-Pass Filter D1 Coefficient LSB Register
		return 1;

	//Right Channel HPF Coeffiecient Registers
	//N0:
	if(writeRegister(0x47, 0x7F))	//Page 1/Register 71: Right-Channel ADC High-Pass Filter N0 Coefficient MSB Register
		return 1;
	if(writeRegister(0x48, 0xDB))	//Page 1/Register 72: Right-Channel ADC High-Pass Filter N0 Coefficient LSB Register
		return 1;
	//N1:
	if(writeRegister(0x49, 0x80))	//Page 1/Register 73: Right-Channel ADC High-Pass Filter N1 Coefficient MSB Register
		return 1;
	if(writeRegister(0x4A, 0x25))	//Page 1/Register 74: Right-Channel ADC High-Pass Filter N1 Coefficient LSB Register
		return 1;
	//D1:
	if(writeRegister(0x4B, 0x7F))	//Page 1/Register 75: Right-Channel ADC High-Pass Filter D1 Coefficient MSB Register
		return 1;
	if(writeRegister(0x4C, 0xDB))	//Page 1/Register 76: Right-Channel ADC High-Pass Filter D1 Coefficient LSB Register
		return 1;

	//Explicitly restore to config Page 0
	if(writeRegister(0x00, 0x00))	//Page 1/Register 0: Page Select Register
		return 1;

	return 0;
}
//set the numerator multiplier for the PLL
int I2c_Codec::setPllK(float k){
	short unsigned int j=(int)k;
	unsigned int d=(int)(0.5+(k-j)*10000); //fractional part, between 0 and 9999
	if(setPllJ(j)>0)
		return 1;
	if(setPllD(d)>0)
		return 2;
	return 0;
}


//set integer part of the numerator mutliplier of the PLL
int I2c_Codec::setPllJ(short unsigned int j){
	if(j>=64 || j<1){
			return 1;
	}
	if(writeRegister(0x04, j<<2)){	// PLL register B: j<<2
		fprintf(stderr, "I2C error while writing PLL j: %d", j);
		return 1;
	}
	pllJ=j;
	return 0;
}

//set fractional part(between 0 and 9999) of the numerator mutliplier of the PLL
int I2c_Codec::setPllD(unsigned int d){
	if(d  >9999)
		return 1;
	if(writeRegister(0x05, (d>>6)&255)){ // PLL register C: part 1 : 8 most significant bytes of a 14bit integer
		fprintf(stderr, "I2C error while writing PLL d part 1 : %d", d);
		return 1;
	}
	if(writeRegister(0x06, (d<<2)&255)){	// PLL register D: D=5264, part 2
		fprintf(stderr, "I2C error while writing PLL d part 2 : %d", d);
		return 1;
	}
	pllD=d;
	return 0;
}

//set integer part of the numerator mutliplier of the PLL
//
int I2c_Codec::setPllP(short unsigned int p){
	if(p > 8 || p < 1){
			return 1;
	}
	short unsigned int bits = 0;
	bits |= 1 << 7; //this means PLL enabled
	bits |= 0b0010 << 3; // this is the reset value for Q, which is anyhow unused when PLL is active
	if (p == 8) // 8 is a special value: PLL P Value 000: P = 8
		bits = bits | 0;
	else
		bits = bits | p; // other values are written with their binary representation.
	if(writeRegister(0x03, bits)){	// PLL register B: j<<2
		fprintf(stderr, "I2C error while writing PLL p: %d", p);
		return 1;
	}
	pllP = p;
	return 0;
}
int I2c_Codec::setPllR(unsigned int r){
	if(r > 16){ //value out of range
		return 1;
	}
	unsigned int bits = 0;
	//bits D7-D4 are for ADC and DAC overflow flags and are read only
	if(r == 16) // 16 is a special value: PLL R Value 0000: R = 16
		bits |= 0;
	else
		bits |= r; // other values are written with their binary representation.
	if(writeRegister(0x0B, bits)){	// PLL register B: j<<2
			fprintf(stderr, "I2C error while writing PLL r: %d", r);
			return 1;
		}
	pllR = r;
	return 0;
}

struct PllSettings {
	unsigned int P;
	unsigned int R;
	double K;
	double NCODEC;
	double Fs;
};

int I2c_Codec::setNcodec(double NCODEC)
{
	uint8_t prescalerReg = 0x0F & ( (int)(NCODEC * 2 - 2) );
	prescalerReg = prescalerReg | ( prescalerReg << 4); // it has to be NCODEC = NADC = NDAC
	return writeRegister(0x02, prescalerReg);
}

// the Fs_ref sampling frequency used internally has to be in the 39kHz
// to 53khz range.
// To achieve ADC/DAC frequencies lower than that, one has to divide it
// down using the "Codec Sample Rate Select Register" (10.3.3 of the
// 3104 datasheet). This divider (NCODEC) can be between 1 and 6 in
// steps of 0.5.
static int computeNcodec(float desiredSamplingRate, float& fs_ref, double& NCODEC)
{
	unsigned int TWICE_NCODEC = 2;
	// if the sampling rate is below 39 kHz, try to bring it back in range
	while(desiredSamplingRate * (0.5 * TWICE_NCODEC) <= 39000 && TWICE_NCODEC <= 12)
		TWICE_NCODEC++;
	NCODEC = TWICE_NCODEC / 2.0;
	fs_ref = desiredSamplingRate * NCODEC;
	if(TWICE_NCODEC > 12 || fs_ref > 53000 || fs_ref < 39000)
	{
		// we cannot achieve such sampling rate
		return 1;
	}
	return 0;
}

static std::vector<PllSettings> findSettingsWithConstraints(
		unsigned int Rmin, unsigned int Rmax,
		double Kmin, double Kmax,
		double ratioMin, double ratioMax,
		bool integerK, double PLLCLK_IN,
		double newSamplingRate
	)
{
	const double MHz = 1000000;
	std::vector<struct PllSettings> settings;
	unsigned int Pmin = 1;
	unsigned int Pmax = 8;
	// constraint: ratioMin Mhz ≤ (PLLCLK_IN/P) ≤ ratioMax MHz
	while(PLLCLK_IN / Pmin > ratioMax*MHz && Pmin <= Pmax)
		++Pmin;
	while(PLLCLK_IN / Pmax < ratioMin*MHz && Pmin <= Pmax)
		--Pmax;
	double NCODEC;
	float fs_ref;
	int ret = computeNcodec(newSamplingRate, fs_ref, NCODEC);
	if(ret)
		return {};
	newSamplingRate = fs_ref;

	for(unsigned int R = Rmin; R <= Rmax; ++R)
	{
		for(unsigned int P = Pmin; P <= Pmax; ++P)
		{
			//80 MHz ≤ PLLCLK_IN × K × R/P ≤ 110 MHz
			double localKmin = 80*MHz * P / (PLLCLK_IN * R);
			double localKmax = 110*MHz * P / (PLLCLK_IN * R);
			localKmin = std::max(localKmin, Kmin);
			localKmax = std::min(localKmax, Kmax);
			// round the Ks up and down to a value with 4 decimals
			localKmin = ((unsigned int)(localKmin * 10000 + 1)) / 10000.0;
			localKmax = ((unsigned int)(localKmax * 10000)) / 10000.0;
			if(localKmin < localKmax)
			{
				// constraints are met, see if we can find a valid combination of settings
				// f_{S(ref)} = (PLLCLK_IN × K × R)/(2048 × P)
				// solve for K and check that it is in the valid range
				double K = (newSamplingRate * P * 2048.0/R) / (double)PLLCLK_IN;
				if(integerK)
					// round to int
					K = ((unsigned int)(K + 0.5));
				else
					// round K to 4 decimals
					K = ((unsigned int)(K * 10000 + 0.5)) / 10000.0;
				if(K >= localKmin && K <= localKmax)
				{
					double Fs = (PLLCLK_IN * K * R)/(2048 * P) / NCODEC;
					settings.push_back({.P = P, .R = R, .K = K, .NCODEC = NCODEC, .Fs = Fs});
				}
			}
		}
	}
	return settings;
}

int I2c_Codec::setAudioSamplingRate(float newSamplingRate){
	std::vector<struct PllSettings> settings;
	// From the TLV3201AIC3104 datasheet, 10.3.3.1 Audio Clock Generation
	// The sampling frequency is given as f_{S(ref)} = (PLLCLK_IN × K × R)/(2048 × P)

	// • P = 1, 2, 3,…, 8
	// • R = 1, 2, …, 16
	// • K = J.D
	// • J = 1, 2, 3, …, 63
	// • D = 0000, 0001, 0002, 0003, …, 9998, 9999
	// • PLLCLK_IN can be MCLK or BCLK, selected by Page 0, register 102, bits D5–D4

	// When the PLL is enabled and D = 0000, the following conditions must be satisfied to meet specified
	// performance:
	// constraint 1: 512 kHz ≤ (PLLCLK_IN/P) ≤ 20 MHz
	// constraint 2: 4 ≤ J ≤ 55 (remember that K = J.D)
	// constraint 3: 80 MHz ≤ (PLLCLK_IN × K × R/P) ≤ 110 MHz
	auto newSettings = findSettingsWithConstraints(
		1, 16, // Rmin, Rmax (full range of R values)
		4.0, 55.0, // Kmin, Kmax
		0.512, 20, // ratioMin, ratioMax
		true, // only integer values of K (D = 0)
		PLLCLK_IN, newSamplingRate
	);
	settings.insert(settings.end(), newSettings.begin(), newSettings.end());

	//When the PLL is enabled and D ≠ 0000, the following conditions must be satisfied to meet specified
	//performance:
	//constraint 1: R = 1
	//constraint 2: 10 MHz ≤ PLLCLK_IN/P ≤ 20 MHz
	//constraint 3: 4 ≤ J ≤ 11  (remember that K = J.D)
	//constraint 4: 80 MHz ≤ PLLCLK_IN × K × R/P ≤ 110 MHz
	newSettings = findSettingsWithConstraints(
			1, 1, // Rmin, Rmax
			4, 11.9999, // Kmin, Kmax
			10, 20, // ratioMin, ratioMax
			false, // fractional values of K allowed
			PLLCLK_IN, newSamplingRate
	);
	settings.insert(settings.end(), newSettings.begin(), newSettings.end());

	if(0 == settings.size()) {
		fprintf(stderr, "I2c_Codec: error, no valid PLL settings found\n");
		return 1;
	}
	// find the settings that minimise the Fs error
	PllSettings optimalSettings = {0};
	double error = std::numeric_limits<double>::max();
	for(auto & s : settings) {
		double newError = std::abs(s.Fs - newSamplingRate);
		if(newError < error) {
			error = newError;
			optimalSettings = s;
		}
	}
	// The sampling frequency is given as f_{S(ref)} = (PLLCLK_IN × K × R)/(2048 × P)
	if(setPllP(optimalSettings.P))
		return 1;
	if(setPllR(optimalSettings.R))
		return 1;
	if((setPllK(optimalSettings.K)))
		return 1;
	if(setNcodec(optimalSettings.NCODEC))
		return 1;
	PllSettings& s = optimalSettings;
	if(verbose)
		printf("MCLK: %.4f MHz, fs(ref): %.4f, P: %u, R: %u, J: %d, D: %d, NCODEC: %f, Achieved Fs: %f (err: %.4f%%), \n",
			PLLCLK_IN / 1000000, newSamplingRate,
			pllP, pllR, pllJ, pllD, s.NCODEC,
			s.Fs, (s.Fs - newSamplingRate) / newSamplingRate * 100
		);
	return 0;
}

short unsigned int I2c_Codec::getPllJ(){
	return pllJ;
}
unsigned int I2c_Codec::getPllD(){
	return pllD;
}
unsigned int I2c_Codec::getPllR(){
	return pllR;
}
unsigned int I2c_Codec::getPllP(){
	return pllP;
}
float I2c_Codec::getPllK(){
	float j=getPllJ();
	float d=getPllD();
	float k=j+d/10000.0f;
	return k;
}

float I2c_Codec::getAudioSamplingRate(){
	//	f_{S(ref)} = (PLLCLK_IN × K × R)/(2048 × P)
	float fs = (PLLCLK_IN/2048.0) * getPllK()*getPllR()/(float)getPllP();
	return fs;
}

static int getHalfDbs(float gain)
{
	return floorf(gain * 2.0 + 0.5);
}

int I2c_Codec::setInputGain(int channel, float gain){
	const uint8_t regLeft = 0x0F;
	const uint8_t regRight = 0x10;
	std::vector<uint8_t> regs;
	if(0 == channel)
	{
		regs = {regLeft};
		inputGain[0] = gain;
	}
	else if(1 == channel)
	{
		regs = {regRight};
		inputGain[1] = gain;
	}
	else if(channel < 0)
	{
		regs = {{regLeft, regRight}}; // both channels
		inputGain[0] = inputGain[1] = gain;
	}
	unsigned short int pgaByte;
	if(gain <= -96) {
		// we consider this a mute. The "-96" threshold is pretty
		// arbitrary, not related to the codec
		pgaByte = 0b10000000; // PGA is muted
	} else {
		if(gain < 0) {
			// PGA at 0dB, further attenuation provided by the "ADC volume"
			gain = 0;
		}
		// gain is adjustable from 0 to 59.5dB in steps of 0.5dB
		// between 0x0 and 0x7f.
		if(gain > 59.5)
			gain = 59.5; // can't do more than this
		// Values between 0b01110111 and 0b01111111 are clipped
		// to 59.5dB
		pgaByte = (int)(getHalfDbs(gain)) & 0x7f;
	}
	int ret = 0;
	for(auto& reg : regs)
		ret |=  writeRegister(reg, pgaByte);
	if(writeAdcVolumeRegisters(false)) // set "ADC volume"
		return 1;
	return ret;
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

// Set the volume of the DAC output
int I2c_Codec::setDacVolume(int channel, float gain)
{
	if(setByChannel(dacVolumeHalfDbs, channel, getHalfDbs(gain)))
		return 1;
	if(running)
		return writeDacVolumeRegisters(false);
	return 0;
}

// Update the DAC volume control registers
int I2c_Codec::writeDacVolumeRegisters(bool mute)
{
	std::array<int,kNumIoChannels> volumeBits{};
	for(unsigned int n = 0; n < volumeBits.size(); ++n)
	{
		// Volume is specified in half-dBs with 0 as full scale
		volumeBits[n] = -dacVolumeHalfDbs[n];
		if(volumeBits[n] > 127)
			volumeBits[n] = 127;
	}
	std::array<int,kNumIoChannels> regs = {{
		0x2B, // Left DAC volume control
		0x2C, // Right DAC volume control
	}};
	uint8_t muteBits = mute << 7;
	for(unsigned int n = 0; n < regs.size(); ++n)
	{
		if(writeRegister(regs[n], volumeBits[n] | muteBits)) // DAC volume control
			return 1;
	}
	return 0;
}

// Update the ADC volume control registers
int I2c_Codec::writeAdcVolumeRegisters(bool mute)
{
	std::array<int,kNumIoChannels> volumeBits{};
	for(unsigned int n = 0; n < volumeBits.size(); ++n)
	{
		// The codec uses 1.5dB steps from 0dB to -12dB
		float gain = inputGain[n];
		if(gain > 0)
			gain = 0;
		volumeBits[n] = -gain / 1.5;
		if(volumeBits[n] > 8)
			volumeBits[n] = 8;
	}

	if(mute) {
		if(writeRegister(0x13, 0x00))		// Line1L to Left ADC control register: power down
			return 1;
		if(writeRegister(0x16, 0x00))		// Line1R to Right ADC control register: power down
			return 1;
	}
	else {
		if(writeRegister(0x13, 0x7C))	// Line1L disabled; left ADC powered up with soft step
			return 1;
		if(writeRegister(0x16, 0x7C))	// Line1R disabled; right ADC powered up with soft step
			return 1;
		
		if(codecType == TLV320AIC3106) {
			// TODO: 3106/11.3.7 seems to indicate that weakBiasing
			// should always be disabled when the channel is
			// enabled. For now we keep it enabled for
			// differentialInput, pending further testing.
			bool weakBiasing = differentialInput;
			// LINE2L/R connected to corresponding L/R ADC PGA mix with specified gain.
			std::array<int,kNumIoChannels> regs = {{
				0x14,
				0x17,
			}};
			for(unsigned int n = 0; n < regs.size(); ++n)
			{
				uint8_t byte = (differentialInput << 7) | (volumeBits[n] << 3) | (weakBiasing << 2);
				if(writeRegister(regs[n], byte))
					return 1;
			}
		}
		else {	// TLV320AIC3104
			if(writeRegister(0x11, (volumeBits[0] << 4) | 0x0F)) // Mic2L (sic) Input connected connected to left-ADC PGA mix with specified gain
				return 1;
			if(writeRegister(0x12, volumeBits[1] | 0xF0)) // Mic2R/Line2R connected to right-ADC PGA mix with specified gain
				return 1;
		}
	}

	return 0;
}

// Set the volume of the headphone output
int I2c_Codec::setHpVolume(int channel, float gain)
{
	if(setByChannel(hpVolume, channel, gain))
		return 1;
	hpEnabled = true;
	if(running)
		return writeHPVolumeRegisters();

	return 0;
}

int I2c_Codec::enableHpOut(bool enable)
{
	hpEnabled = enable;
	if(running)
		return writeHPVolumeRegisters();
	return 0;
}

int I2c_Codec::writeOutputLevelControlReg(std::array<unsigned char,kNumIoChannels>const & regs, std::array<float,kNumIoChannels>const & volumes, unsigned char lowerHalf)
{
	for(unsigned int c = 0; c < regs.size(); ++c)
	{
		// if olume is positive, we set the boost here
		float vol = volumes[c];
		if(vol < 0)
			vol = 0;
		if(vol > 9)
			vol = 9;
		// boost is 0dB to 9dB
		uint8_t level = vol; // zxOUT Output level control = y dB
		if(writeRegister(regs[c], (level << 4 ) | lowerHalf))
			return 1;
	}
	return 0;
}

int I2c_Codec::writeRoutingVolumeControlReg(std::array<unsigned char,kNumIoChannels>const & regs, std::array<float,kNumIoChannels>const & volumes, bool enabled)
{
	for(unsigned int n = 0; n < volumes.size(); ++n)
	{
		float vol = volumes[n];
		// if volume is negative, we set the attenuation here
		if(vol > 0)
			vol = 0;
		// TODO: getHalfDbs() is not quite the correct function here
		// See 3104/table 10-51 : gains will be off below -18dB
		int hd = getHalfDbs(vol);
		// Volume is specified in half-dBs attenuation
		// with 0 as full scale
		int volumeBits = 0;
		if(hd < 0) {
			volumeBits = -hd;
			if(volumeBits > 127)
				volumeBits = 127;
		}
		uint8_t routed = enabled << 7; // DAC_x routed to xxOUT ?
		if(writeRegister(regs[n], volumeBits | routed))
			return 1;
	}
	return 0;
}

// Update the headphone volume control registers
int I2c_Codec::writeHPVolumeRegisters()
{
	static const std::array<uint8_t,kNumIoChannels> regs = {{
		0x2F, // DAC_L1 to HPLOUT
		0x40, // DAC_R1 to HPROUT
	}};
	if(writeRoutingVolumeControlReg(regs, hpVolume, hpEnabled))
		return 1;

	// See section 3104/10.3.7 Analog High-Power Output Drivers
	// As per https://e2e.ti.com/support/audio-group/audio/f/audio-forum/967397/tlv320aic3104-tlv320aic3104-pop-noise :
	// First, configure the clocks/PLL/digital audio format. Once these are all configured, configure input/outputs:
	// - For the outputs,  make sure that Soft-stepping is enabled, and if any BiQuads are being used, the filter coefficients should be programed before the DAC is powered.
	// - Power up DACs but keep them muted, then power up output blocks (keeping them muted), once the output block is fully powered up, unmute the output block.
	// - The HPOUTs have the option to weakly drive the outputs to the common mode voltage when powered down. in battery powered applications, this is not ideal,
	// but for other applications this is a great way to reduce the any residual artifacts from the pop/click suppression.
	// - Additionally, if the HPOUTs are AC coupled, make sure that P0, R14 Bit-D7 is set accordingly.

	// NOTE: I cannot obtain/measure much effect from this after the capacitor with an unloaded output.
	// However, when headphones are connected the pop is significantly reduced
	// It seems that the write to 0x2A is the most significant in terms of reducing the pop the _first_ time the codec is started after a power up.
	// With "Driver power-on time" < 200 ms we get more pop.
	if(writeRegister(0x2A,
		(0b0111 << 4) // Output Driver Pop Reduction Register: Driver power-on time = 200 ms
		| (0b11 << 2) // Driver ramp-up step time = 4 ms
		| (0b1 << 1) // Weakly driven output common-mode voltage is generated from band-gap reference
	))
		return 1;

	unsigned int n = unmutedPowerStage ? 1 : 0;
	for( ; n < 2; ++n)
	{
		// First time, power up while muted, then unmute and set gain.
		// Successive times: unmute and set gain only.
		bool unmute = n;
		bool power = true;
		uint8_t lowerHalf =
			(unmute << 3)
			| (0 << 2) // HPLOUT is weakly driven to a common-mode when powered down.
			| (power << 0);
		static const std::array<unsigned char,kNumIoChannels> regs = {{
			0x33, // HPLOUT output level control register
			0x41, // HPROUT output level control register
		}};
		if(writeOutputLevelControlReg(regs, hpVolume, lowerHalf))
			return 1;
	}
	unmutedPowerStage = true;
	return 0;
}

// Set the volume of the line output
int I2c_Codec::setLineOutVolume(int channel, float gain)
{
	if(setByChannel(lineOutVolume, channel, gain))
		return 1;
	lineOutEnabled = true;
	if(running)
		return writeLineOutVolumeRegisters();

	return 0;
}

int I2c_Codec::enableLineOut(bool enable)
{
	lineOutEnabled = enable;
	if(running)
		return writeLineOutVolumeRegisters();
	return 0;
}

int I2c_Codec::writeLineOutVolumeRegisters()
{
	static const std::array<unsigned char,kNumIoChannels> regs = {{
		0x52, // DAC_L1 to LEFT_LOP volume control
		0x5C, // DAC_R1 to RIGHT_LOP volume control
	}};
	if(writeRoutingVolumeControlReg(regs, lineOutVolume, lineOutEnabled))
		return 1;

	bool power = true;
	bool unmute = lineOutEnabled;
	uint8_t lowerHalf =
		(unmute << 3)
		| (power << 0);
	static const std::array<unsigned char,kNumIoChannels> regsl = {{
		0x56, // LEFT_LOP/M Output Level Control Register
		0x5D, // RIGHT_LOP/M Output Level Control Registe
	}};
	if(writeOutputLevelControlReg(regsl, lineOutVolume, lowerHalf))
		return 1;
	return 0;
}

// This tells the codec to stop generating audio and mute the outputs
int I2c_Codec::stopAudio()
{
	if(writeDacVolumeRegisters(true))	// Mute the DACs
		return 1;
	if(writeAdcVolumeRegisters(true))	// Mute the ADCs
		return 1;

	usleep(10000);

	if(writeRegister(0x33, 0x0C))		// HPLOUT output level register: muted
		return 1;
	if(writeRegister(0x41, 0x0C))		// HPROUT output level register: muted
		return 1;
	unmutedPowerStage = false;
	if(enableLineOut(false))
		return 1;
	if(InitMode_noInit != mode && InitMode_noDeinit != mode) {
		if(writeRegister(0x25, 0x00))		// DAC power/driver register: power off. For whatever reason, executing this also turns off the BCLK output
			return 1;
		if(writeRegister(0x03, 0x11))		// PLL register A: disable
			return 1;
	}

	running = false;
	return 0;
}

// Write a specific register on the codec
int I2c_Codec::writeRegister(unsigned int reg, unsigned int value)
{
	char buf[2] = { static_cast<char>(reg & 0xFF), static_cast<char>(value & 0xFF) };

	if(writeBytes(buf, 2) != 2)
	{
		verbose && fprintf(stderr, "Failed to write register %d on I2c codec\n", reg);
		return 1;
	}

	return 0;
}

// Read a specific register on the codec
int I2c_Codec::readRegister(unsigned int reg)
{	
    i2c_char_t inbuf, outbuf;
    struct i2c_rdwr_ioctl_data packets;
    struct i2c_msg messages[2];

	/* Reading a register involves a repeated start condition which needs ioctl() */
    outbuf = reg;
    messages[0].addr  = i2C_address;
    messages[0].flags = 0;
    messages[0].len   = sizeof(outbuf);
    messages[0].buf   = &outbuf;

    /* The data will get returned in this structure */
    messages[1].addr  = i2C_address;
    messages[1].flags = I2C_M_RD/* | I2C_M_NOSTART*/;
    messages[1].len   = sizeof(inbuf);
    messages[1].buf   = &inbuf;

    /* Send the request to the kernel and get the result back */
    packets.msgs      = messages;
    packets.nmsgs     = 2;
    if(ioctl(i2C_file, I2C_RDWR, &packets) < 0) {
        verbose && fprintf(stderr, "Failed to read register %d on I2c codec\n", reg);
        return -1;
    }

    return inbuf;	
}

// Put codec to Hi-z (required for CTAG face)
int I2c_Codec::disable(){
	if (writeRegister(0x0, 0)) // Select page 0
		return 1;
	if(writeRegister(0x01, 0x80)) // Reset codec to defaults
		return 1;
	if(kClockSourceCodec == params.bclk) {
		if(kClockSourceCodec == params.wclk) {
			if(writeRegister(0x08, 0xE0)) {	// Put codec in master mode (required for hi-z mode)
				return 1;					
			}
		}
		else {
			if(writeRegister(0x08, 0xA0)) { 
				return 1;					
			}			
		}
	}
	else {
		if (writeRegister(0x08, 0x20)) // Leave codec in slave mode
			return 1;
	}
	if(writeRegister(0x03, 0x11)) // PLL register A: disable
		return 1;
	if (writeRegister(0x24, 0x44)) // Power down left and right ADC
		return 1;
	if (writeRegister(0x25, 0x00)) // DAC power/driver register: power off
		return 1;
	if (writeRegister(0x5E, 0xC0)) // Power fully down left and right DAC
		return 1;

	return 0;
}

void I2c_Codec::setVerbose(bool isVerbose)
{
	verbose = isVerbose;
}

I2c_Codec::~I2c_Codec()
{
	if(running)
		stopAudio();
	Mcasp::stopAhclkx();
}

McaspConfig& I2c_Codec::getMcaspConfig()
{
/*
#define BELA_TLV_MCASP_DATA_FORMAT_TX_VALUE 0x8074 // MSB first, 0 bit delay, 16 bits, DAT bus, ROR 16bits
#define BELA_TLV_MCASP_DATA_FORMAT_RX_VALUE 0x8074 // MSB first, 0 bit delay, 16 bits, DAT bus, ROR 16bits
#define BELA_TLV_MCASP_ACLKRCTL_VALUE 0x00 // External clk, polarity (falling edge)
#define BELA_TLV_MCASP_ACLKXCTL_VALUE 0x00 // External clk, polarity (falling edge)
#define BELA_TLV_MCASP_AFSXCTL_VALUE 0x100 // 2 Slot I2S, external fsclk, polarity (rising edge), single bit
#define BELA_TLV_MCASP_AFSRCTL_VALUE 0x100 // 2 Slot I2S, external fsclk, polarity (rising edge), single bit
#define MCASP_OUTPUT_PINS MCASP_PIN_AHCLKX | (1 << 2) // AHCLKX and AXR2 outputs
*/
	unsigned int numSlots;
	switch(params.tdmMode)
	{
		case kTdmModeI2s:
		case kTdmModeDsp:
			numSlots = 2;
			break;
		case kTdmModeTdm:
			// codec is in 256-bit mode
			numSlots = 256 / params.slotSize;
			break;
		default:
			throw std::runtime_error("I2c_Codec: invalid TdmMode");
	}
	bool isI2s = (kTdmModeI2s == params.tdmMode);
	mcaspConfig.params.inChannels = getNumIns();
	mcaspConfig.params.outChannels = getNumOuts();;
	mcaspConfig.params.inSerializers = {0};
	mcaspConfig.params.outSerializers = {2};
	mcaspConfig.params.numSlots = numSlots;
	mcaspConfig.params.slotSize = params.slotSize;
	mcaspConfig.params.dataSize = params.slotSize;
	// in I2S mode, 0 bitDelay means (10.3.2.3) "the MSB of the left
	// channel is valid on the second rising edge of the bit clock after
	// the falling edge of the word clock", which - for the McASP - means 1
	// bit delay.
	// Therefore in I2s mode the codec always has 1 implicity extra bit delay.
	mcaspConfig.params.bitDelay = isI2s ? params.bitDelay + 1 : params.bitDelay;
	mcaspConfig.params.ahclkIsInternal = true;
	mcaspConfig.params.ahclkFreq = params.mclk;
	mcaspConfig.params.aclkIsInternal = (kClockSourceMcasp == params.bclk);
	mcaspConfig.params.wclkIsInternal = (kClockSourceMcasp == params.wclk);
	mcaspConfig.params.wclkIsWord = isI2s;
	mcaspConfig.params.wclkFalling = isI2s;
	mcaspConfig.params.externalSamplesRisingEdge = isI2s;

	return mcaspConfig;
}

unsigned int I2c_Codec::getNumIns(){
	return 2;
}

unsigned int I2c_Codec::getNumOuts(){
	return 2;
}

float I2c_Codec::getSampleRate() {
	return params.samplingRate;
}

int I2c_Codec::setParameters(const AudioCodecParams& codecParams)
{
	params = codecParams;
	int ret = 0;
	if(kClockSourceCodec != params.bclk && kClockSourceCodec == params.wclk) {
		verbose && fprintf(stderr, "I2c_Codec: cannot generate Wclk if it doesn't generate Bclk\n");
		ret = -1;
	}
	if(params.samplingRate > 53000 || params.samplingRate < 39000) {
		verbose && fprintf(stderr, "I2c_Codec: sample rate %f out of range\n", params.samplingRate);
		ret = -1;
	}
	if(params.bitDelay > 2) {
		verbose && fprintf(stderr, "I2c_Codec: max bitDelay is 2\n");
		params.bitDelay = 2;
		ret = -1;
	}
	if(kTdmModeDsp == params.tdmMode && 0 != params.startingSlot) {
		verbose && fprintf(stderr, "I2c_Codec: startingSlot has to be 0 in DSP mode\n");
		params.startingSlot = 0;
		ret = -1;
	}
	return ret;
}

AudioCodecParams I2c_Codec::getParameters()
{
	return params;
}

#include "../include/MiscUtilities.h"
int I2c_Codec::setMode(std::string str)
{
	std::vector<std::string> tokens = StringUtils::split(str, ',');
	int err = 0;
	for(auto parameter : tokens)
	{
		parameter = StringUtils::trim(parameter);
		if("init" == parameter)
			mode = InitMode_init;
		else if("noDeinit" == parameter)
			mode = InitMode_noDeinit;
		else if("noInit" == parameter)
			mode = InitMode_noInit;
		else if("I2sMain" == parameter || "I2sSecondary" == parameter)
		{
			params.tdmMode = kTdmModeI2s;
			AudioCodecParams::ClockSource cg = ("I2sMain" == parameter) ? kClockSourceCodec : kClockSourceExternal;
			params.bclk = cg;
			params.wclk = cg;
		} else if("diff" == parameter) {
			differentialInput = true;
		} else if("single" == parameter) {
			differentialInput = false;
		} else if("bias" == std::string(parameter.begin(), parameter.begin() + 4)) {
			std::vector<std::string> tokens = StringUtils::split(str, '=');
			if(2 == tokens.size())
			{
				micBias = atof(tokens[1].c_str());
			}
		} else {
			++err;
			continue;
		}
	}
	if(verbose)
	{
		if(err)
			fprintf(stderr, "%d error(s) occurred while setting codec to %s\n", err, str.c_str());
		else
			printf("Codec mode: %d (%s)\n", mode, str.c_str());
	}
	return err;
}

#include <iostream>
void AudioCodecParams::print()
{
#define P(FIELD) std::cout << #FIELD << ": " << FIELD << "\n"
	std::cout << "AudioCodec parameters:\n";
	P(slotSize);
	P(startingSlot);
	P(bitDelay);
	P(mclk);
	P(samplingRate);
	P(dualRate);
	P(tdmMode);
	P(bclk);
	P(wclk);
};
