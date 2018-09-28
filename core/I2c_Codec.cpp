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

#define TLV320_DSP_MODE
I2c_Codec::I2c_Codec(int i2cBus, int i2cAddress, bool isVerbose /*= false*/)
: dacVolumeHalfDbs(0), adcVolumeHalfDbs(0), hpVolumeHalfDbs(0), running(false)
{
	setVerbose(isVerbose);
	initI2C_RW(i2cBus, i2cAddress, -1);
}

// This method initialises the audio codec to its default state
int I2c_Codec::initCodec()
{
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
// The dual_rate flag, when true, runs the codec at 88.2kHz; otherwise
// it runs at 44.1kHz
int I2c_Codec::startAudio(int dual_rate)
{
	// As a best-practice it's safer not to assume the implementer has issued initCodec()
	// or has not otherwise modified codec registers since that call.
	// Explicit Switch to config register page 0:
	if(writeRegister(0x00, 0x00))	// Page Select Register
		return 1;
	
	// see datasehet for TLV320AIC3104 from page 44
	if(writeRegister(0x02, 0x00))	// Codec sample rate register: fs_ref / 1
		return 1;
	//	The sampling frequency is given as f_{S(ref)} = (PLLCLK_IN × K × R)/(2048 × P)
	// The master clock PLLCLK_IN is 12MHz
	// K can be varied in intervals of resolution of 0.0001 up to 63.9999
	// using P=8 and R=1 gives a resolution of 0.0732421875Hz ( 0.000166% at 44.1kHz)
	// to obtain Fs=44100 we need to have K=60.2112

	if(setPllP(8))
		return 1;
	if(setPllR(1))
		return 1;
	if(setAudioSamplingRate(44100)) //this will automatically find and set K for the given P and R so that Fs=44100
		return 1;
	if(dual_rate) {
		if(writeRegister(0x07, 0xEA))	// Codec datapath register: 44.1kHz; dual rate; standard datapath
			return 1;
	}
	else {
		if(writeRegister(0x07, 0x8A))	// Codec datapath register: 44.1kHz; std rate; standard datapath
			return 1;
	}
	if(writeRegister(0x08, 0xC0))	// Audio serial control register A: BLCK, WCLK outputs
		return 1;
#ifdef TLV320_DSP_MODE // to use with old PRU code
	if(writeRegister(0x09, 0x40))   // Audio serial control register B: DSP mode, word len 16 bits
#else
	if(writeRegister(0x09, 0x00))   // Audio serial control register B: I2S mode, word len 16 bits
#endif
		return 1;
#ifdef TLV320_DSP_MODE // to use with old PRU code
	if(writeRegister(0x0A, 0x00))   // Audio serial control register C: 0 bit offset
#else
	if(writeRegister(0x0A, 0x01))   // Audio serial control register C: 1 bit offset
#endif
		return 1;
	if(writeRegister(0x0D, 0x00))	// Headset / button press register A: disabled
		return 1;
	if(writeRegister(0x0E, 0x00))	// Headset / button press register B: disabled
		return 1;
	if(writeRegister(0x25, 0xC0))	// DAC power/driver register: DAC power on (left and right)
		return 1;
	if(writeRegister(0x26, 0x04))	// High power output driver register: Enable short circuit protection
		return 1;
	if(writeRegister(0x28, 0x02))	// High power output stage register: disable soft stepping
		return 1;

	if(writeRegister(0x52, 0x80))	// DAC_L1 to LEFT_LOP volume control: routed, volume 0dB
		return 1;
	if(writeRegister(0x5C, 0x80))	// DAC_R1 to RIGHT_LOP volume control: routed, volume 0dB
		return 1;
	if(writeHPVolumeRegisters())	// Send DAC to high-power outputs
		return 1;

	if(writeRegister(0x66, 0x02))	// Clock generation control register: use MCLK, PLL N = 2
		return 1;
	
	//Set-up hardware high-pass filter for DC removal
	if(configureDCRemovalIIR())
		return 1;
	if(writeRegister(25, 0b10000000))	// Enable mic bias 2.5V
		return 1;

	
	// wait for the codec to stabilize before unmuting the HP amp.
	// this gets rid of the loud pop.
	usleep(10000);
	// note : a small click persists, but it is unavoidable
	// (i.e.: fading in the hpVolumeHalfDbs after it is turned on does not remove it).

	if(writeRegister(0x33, 0x0D))	// HPLOUT output level control: output level = 0dB, not muted, powered up
		return 1;
	if(writeRegister(0x41, 0x0D))	// HPROUT output level control: output level = 0dB, not muted, powered up
		return 1;
	if(writeRegister(0x56, 0x09))	// LEFT_LOP output level control: 0dB, not muted, powered up
		return 1;
	if(writeRegister(0x5D, 0x09))	// RIGHT_LOP output level control: 0dB, not muted, powered up
		return 1;
	if(writeDACVolumeRegisters(false))	// Unmute and set volume
		return 1;

	if(writeRegister(0x65, 0x00))	// GPIO control register B: disabled; codec uses PLLDIV_OUT
		return 1;

	if(writeADCVolumeRegisters(false))	// Unmute and set ADC volume
		return 1;

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

int I2c_Codec::configureDCRemovalIIR(){

	//Explicit Switch to config register page 0:
	if(writeRegister(0x00, 0x00))	//Page 1/Register 0: Page Select Register
		return 1;

	//
	//  Config Page 0 commands
	//
	if(writeRegister(0x0C, 0x50))	// Digital filter register: enable HPF on L&R Channels
		return 1;
	if(writeRegister(0x6B, 0xC0))	// HPF coeff select register: Use programmable coeffs
		return 1;

	//Switch to config register page 1:
	if(writeRegister(0x00, 0x01))	//Page 1/Register 0: Page Select Register
		return 1;
	//
	//  Config Page 0 commands
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
int I2c_Codec::setAudioSamplingRate(float newSamplingRate){
	long int PLLCLK_IN=12000000;
	//	f_{S(ref)} = (PLLCLK_IN × K × R)/(2048 × P)
	float k = ((double)(newSamplingRate * pllP * 2048.0f/(float)pllR)) / PLLCLK_IN ;
	return (setPllK(k));
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
	long int PLLCLK_IN=12000000;
	//	f_{S(ref)} = (PLLCLK_IN × K × R)/(2048 × P)
	float fs = (PLLCLK_IN/2048.0f) * getPllK()*getPllR()/(float)getPllP();
	return fs;
}

int I2c_Codec::setPga(float newGain, unsigned short int channel){
	unsigned short int reg;
	if(channel == 0)
		reg = 0x0F;
	else if(channel == 1)
		reg =  0x10;
	else
		return 1; // error, wrong channel
	if(newGain > 59.5)
		return 2; // error, gain out of range
	unsigned short int value;
	if(newGain < 0)
		value = 0b10000000; // PGA is muted
	else {
		// gain is adjustable from 0 to 59.5dB in steps of 0.5dB between 0x0 and 0x7f.
		// Values between 0b01110111 and 0b01111111 are clipped to 59.5dB
		value = (int)(newGain * 2 + 0.5) & 0x7f;
	}
	return writeRegister(reg, value);
}

// Set the volume of the DAC output
int I2c_Codec::setDACVolume(int halfDbSteps)
{
	dacVolumeHalfDbs = halfDbSteps;
	if(running)
		return writeDACVolumeRegisters(false);

	return 0;
}

// Set the volume of the ADC input
int I2c_Codec::setADCVolume(int halfDbSteps)
{
	adcVolumeHalfDbs = halfDbSteps;
	if(running)
		return writeADCVolumeRegisters(false);

	return 0;
}

// Update the DAC volume control registers
int I2c_Codec::writeDACVolumeRegisters(bool mute)
{
	int volumeBits = 0;

	if(dacVolumeHalfDbs < 0) { // Volume is specified in half-dBs with 0 as full scale
		volumeBits = -dacVolumeHalfDbs;
		if(volumeBits > 127)
			volumeBits = 127;
	}

	if(mute) {
		if(writeRegister(0x2B, volumeBits | 0x80))	// Left DAC volume control: muted
			return 1;
		if(writeRegister(0x2C, volumeBits | 0x80))	// Right DAC volume control: muted
			return 1;
	}
	else {
		if(writeRegister(0x2B, volumeBits))	// Left DAC volume control: not muted
			return 1;
		if(writeRegister(0x2C, volumeBits))	// Right DAC volume control: not muted
			return 1;
	}

	return 0;
}

// Update the ADC volume control registers
int I2c_Codec::writeADCVolumeRegisters(bool mute)
{
	int volumeBits = 0;

	// Volume is specified in half-dBs with 0 as full scale
	// The codec uses 1.5dB steps so we divide this number by 3
	if(adcVolumeHalfDbs < 0) {
		volumeBits = -adcVolumeHalfDbs / 3;
		if(volumeBits > 8)
			volumeBits = 8;
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
		if(writeRegister(0x11, (volumeBits << 4) | 0x0F))	// Line2L connected to left ADC
			return 1;
		if(writeRegister(0x12, volumeBits | 0xF0))		    // Line2R connected to right ADC
			return 1;
	}

	return 0;
}

// Set the volume of the headphone output
int I2c_Codec::setHPVolume(int halfDbSteps)
{
	hpVolumeHalfDbs = halfDbSteps;
	if(running)
		return writeHPVolumeRegisters();

	return 0;
}


// Update the headphone volume control registers
int I2c_Codec::writeHPVolumeRegisters()
{
	int volumeBits = 0;

	if(hpVolumeHalfDbs < 0) { // Volume is specified in half-dBs with 0 as full scale
		volumeBits = -hpVolumeHalfDbs;
		if(volumeBits > 127)
			volumeBits = 127;
	}

	if(writeRegister(0x2F, volumeBits | 0x80)) // DAC_L1 to HPLOUT register: route to HPLOUT, volume 0dB
		return 1;
	if(writeRegister(0x40, volumeBits | 0x80)) // DAC_R1 to HPROUT register: route to HPROUT, volume 0dB
		return 1;

	return 0;
}

// This tells the codec to stop generating audio and mute the outputs
int I2c_Codec::stopAudio()
{
	if(writeDACVolumeRegisters(true))	// Mute the DACs
		return 1;
	if(writeADCVolumeRegisters(true))	// Mute the ADCs
		return 1;

	usleep(10000);

	if(writeRegister(0x33, 0x0C))		// HPLOUT output level register: muted
		return 1;
	if(writeRegister(0x41, 0x0C))		// HPROUT output level register: muted
		return 1;
	if(writeRegister(0x56, 0x08))		// LEFT_LOP output level control: muted
		return 1;
	if(writeRegister(0x5D, 0x08))		// RIGHT_LOP output level control: muted
		return 1;
	if(writeRegister(0x25, 0x00))		// DAC power/driver register: power off
		return 1;
	if(writeRegister(0x03, 0x11))		// PLL register A: disable
		return 1;
	if(writeRegister(0x01, 0x80))		// Reset codec to defaults
		return 1;

	running = false;
	return 0;
}

// Write a specific register on the codec
int I2c_Codec::writeRegister(unsigned int reg, unsigned int value)
{
	char buf[2] = { static_cast<char>(reg & 0xFF), static_cast<char>(value & 0xFF) };

	if(write(i2C_file, buf, 2) != 2)
	{
		verbose && fprintf(stderr, "Failed to write register %d on I2c codec\n", reg);
		return 1;
	}

	return 0;
}

// Put codec to Hi-z (required for CTAG face)
int I2c_Codec::disable(){
	if (writeRegister(0x0, 0)) // Select page 0
		return 1;
	if(writeRegister(0x01, 0x80)) // Reset codec to defaults
		return 1;
	if (writeRegister(0x08, 0xE0)) // Put codec in master mode (required for hi-z mode)
		return 1;
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


int I2c_Codec::readI2C()
{
	// Nothing to do here, we only write the registers
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
}

