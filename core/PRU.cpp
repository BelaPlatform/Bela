/*
 * PRU.cpp
 *
 * Code for communicating with the Programmable Realtime Unit (PRU)
 * on the BeagleBone AM335x series processors. The PRU loads and runs
 * a separate code image compiled from an assembly file. Here it is
 * used to handle audio and SPI ADC/DAC data.
 *
 * This code is specific to the PRU code in the assembly file; for example,
 * it uses certain GPIO resources that correspond to that image.
 *
 *  Created on: May 27, 2014
 *      Author: andrewm
 */

#include "../include/PRU.h"

#include "../include/digital_gpio_mapping.h"
#include "../include/GPIOcontrol.h"
#include "../include/Bela.h"
#include "../include/Gpio.h"
#include "../include/PruArmCommon.h"
#include "../include/board_detect.h"
#include "../include/bela_hw_settings.h"

#include <iostream>
#include <stdlib.h>
#include <cstdio>
#include <cmath>
#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>
#include <vector>

#include <sys/mman.h>
#include <string.h>

#if !(defined(BELA_USE_POLL) || defined(BELA_USE_RTDM) || defined(BELA_USE_BUSYWAIT))
#error Define one of BELA_USE_POLL, BELA_USE_RTDM, BELA_USE_BUSYWAIT
#endif

#ifdef BELA_USE_RTDM
#if __has_include(<linux/rtdm_pruss_irq.h>)
#include <linux/rtdm_pruss_irq.h>
#else /* has_include */
#define RTDM_PRUSS_IRQ_VERSION 0
#endif /* has_include */
#endif /* BELA_USE_RTDM */

#ifdef BELA_USE_RTDM
static char rtdm_driver[] = "/dev/rtdm/rtdm_pruss_irq_0";
static int rtdm_fd_pru_to_arm = 0;
#if RTDM_PRUSS_IRQ_VERSION >= 1
static const unsigned int pru_system_event_rtdm = PRU_SYSTEM_EVENT_RTDM;
#define PRU_SYS_EV_MCASP_RX_INTR    54 // mcasp_r_intr_pend
#define PRU_SYS_EV_MCASP_TX_INTR    55 // mcasp_x_intr_pend
static const uint8_t pru_system_events_mcasp[] = {PRU_SYS_EV_MCASP_RX_INTR, PRU_SYS_EV_MCASP_TX_INTR};
enum {mcasp_to_pru_channel = 1};
static int rtdm_fd_mcasp_to_pru = 0;
#endif /* RTDM_PRUSS_IRQ_VERSION >= 1 */
#endif

// Xenomai-specific includes
#include <pthread.h>

#include "../include/xenomai_wraps.h"

using namespace std;
using namespace BelaHwComponent;

// Select whether to use NEON-based sample conversion
// (this will probably go away in a future commit once its performance
//  is verified over extended use)
#undef USE_NEON_FORMAT_CONVERSION

// PRU memory: PRU0- and PRU1- DATA RAM are 8kB (0x2000) long each
//             PRU-SHARED RAM is 12kB (0x3000) long

#define PRU_MEM_MCASP_OFFSET 0x2000  // Offset within PRU-SHARED RAM
#define PRU_MEM_MCASP_LENGTH 0x1000  // Length of McASP memory, in bytes
#define PRU_MEM_DAC_OFFSET 0x0     // Offset within PRU-DATA RAM
#define PRU_MEM_DAC_LENGTH 0x2000  // Length of ADC+DAC memory, in bytes
#define PRU_MEM_COMM_OFFSET 0x0    // Offset within PRU-SHARED RAM
#define PRU_MEM_DIGITAL_OFFSET 0x1000 //Offset within PRU-SHARED RAM
#define PRU_MEM_DIGITAL_BUFFER1_OFFSET 0x400 //Start pointer to DIGITAL_BUFFER1, which is 256 words.
                                         // 256 is the maximum number of frames allowed
extern int gRTAudioVerbose;

class PruMemory
{
public:
	PruMemory(int pruNumber, InternalBelaContext* newContext, PruManager& pruManager) :
		context(newContext)
	{
		pruSharedRam = static_cast<char*>(pruManager.getSharedMemory());
		audioIn.resize(context->audioInChannels * context->audioFrames);
		audioOut.resize(context->audioOutChannels * context->audioFrames);
		digital.resize(context->digitalFrames);
		pruAudioOutStart[0] = pruSharedRam + PRU_MEM_MCASP_OFFSET;
		pruAudioOutStart[1] = pruSharedRam + PRU_MEM_MCASP_OFFSET + audioOut.size() * sizeof(audioOut[0]);
		pruAudioInStart[0] = pruAudioOutStart[1] + audioOut.size() * sizeof(audioOut[0]);
		pruAudioInStart[1] = pruAudioInStart[0] + audioIn.size() * sizeof(audioIn[0]);
		pruDigitalStart[0] = pruSharedRam + PRU_MEM_DIGITAL_OFFSET;
		pruDigitalStart[1] = pruSharedRam + PRU_MEM_DIGITAL_OFFSET + PRU_MEM_DIGITAL_BUFFER1_OFFSET;
		if(context->analogFrames > 0)
		{
			pruDataRam = static_cast<char*>(pruManager.getOwnMemory());
			analogOut.resize(context->analogOutChannels * context->analogFrames);
			analogIn.resize(context->analogInChannels * context->analogFrames);
			pruAnalogOutStart[0] = pruDataRam + PRU_MEM_DAC_OFFSET;
			pruAnalogOutStart[1] = pruDataRam + PRU_MEM_DAC_OFFSET + analogOut.size() * sizeof(analogOut[0]);
			pruAnalogInStart[0] = pruAnalogOutStart[1] + analogOut.size() * sizeof(analogOut[0]);
			pruAnalogInStart[1] = pruAnalogInStart[0] + analogIn.size() * sizeof(analogIn[0]);
		}

		// Clear / initialize memory
		for(int buffer = 0; buffer < 2; ++buffer)
		{
			for(unsigned int i = 0; i < analogOut.size(); i++)
				pruAnalogOutStart[buffer][i] = 0;
			for(unsigned int i = 0; i < analogIn.size(); i++)
				pruAnalogInStart[buffer][i] = 0;
			for(unsigned int i = 0; i < audioOut.size(); i++)
				pruAudioOutStart[buffer][i] = 0;
			for(unsigned int i = 0; i < audioIn.size(); i++)
				pruAudioInStart[buffer][i] = 0;
			 // set digital to all inputs, to avoid unexpected spikes
			uint32_t* digitalUint32View = (uint32_t*)pruDigitalStart[buffer];
			for(unsigned int i = 0; i < digital.size(); i++)
			{
				digitalUint32View[i] = 0x0000ffff;
			}
		}
		if(gRTAudioVerbose)
		{
			printf("PRU memory mapped to ARM:\n");
			printf("digital: %p %p\n", pruDigitalStart[0], pruDigitalStart[1]);
			printf("audio: %p %p %p %p\n", pruAudioOutStart[0], pruAudioOutStart[1], pruAudioInStart[0], pruAudioInStart[1]);
			printf("analog: %p %p %p %p\n", pruAnalogOutStart[0], pruAnalogOutStart[1], pruAnalogInStart[0], pruAnalogInStart[1]);
			printf("analog offset: %#x %#x %#x %#x\n", pruAnalogOutStart[0] - pruSharedRam, pruAnalogOutStart[1] - pruSharedRam, pruAnalogInStart[0] - pruSharedRam, pruAnalogInStart[1] - pruSharedRam);
		}
	}
	void copyFromPru(int buffer)
	{
		// buffer must be 0 or 1
		memcpy((void*)audioIn.data(), pruAudioInStart[buffer], audioIn.size() * sizeof(audioIn[0]));
		memcpy((void*)analogIn.data(), pruAnalogInStart[buffer], analogIn.size() * sizeof(analogIn[0]));
		memcpy((void*)digital.data(), pruDigitalStart[buffer], digital.size() * sizeof(digital[0]));
	}

	void copyToPru(int buffer)
	{
		// buffer must be 0 or 1
		memcpy(pruAudioOutStart[buffer], (void*)audioOut.data(), audioOut.size() * sizeof(audioOut[0]));
		memcpy(pruAnalogOutStart[buffer], (void*)analogOut.data(), analogOut.size() * sizeof(analogOut[0]));
		memcpy(pruDigitalStart[buffer], (void*)digital.data(), digital.size() * sizeof(digital[0]));
	}

	uint16_t* getAnalogInPtr() { return analogIn.data(); }
	uint16_t* getAnalogOutPtr() { return analogOut.data(); }
	int16_t* getAudioInPtr() { return audioIn.data(); }
	int16_t* getAudioOutPtr() { return audioOut.data(); }
	uint32_t* getDigitalPtr() { return digital.data(); }
	uint32_t* getPruBufferComm() { return (uint32_t*)(pruSharedRam + PRU_MEM_COMM_OFFSET); }
private:
	char* pruDataRam = NULL;
	char* pruSharedRam = NULL;
	char* pruAnalogInStart[2];
	char* pruAudioInStart[2];
	char* pruAnalogOutStart[2];
	char* pruAudioOutStart[2];
	char* pruDigitalStart[2];
	std::vector<uint16_t> analogIn;
	std::vector<uint16_t> analogOut;
	std::vector<int16_t> audioIn;
	std::vector<int16_t> audioOut;
	std::vector<uint32_t> digital;
	InternalBelaContext* context;
};

static unsigned int* gDigitalPins = NULL;

const uint32_t userLed3GpioBase = Gpio::getBankAddress(1);
const uint32_t userLed3GpioPinMask = 1 << 24;
const unsigned int belaMiniLedBlue = 87;
const uint32_t belaMiniLedBlueGpioBase = Gpio::getBankAddress(2); // GPIO2(23) is BelaMini LED blue
const uint32_t belaMiniLedBlueGpioPinMask = 1 << 23;
const unsigned int belaMiniLedRed = 89;
const unsigned int belaMiniRevCAdcPin = 65;
const unsigned int underrunLedDuration = 20000;
const unsigned int saltSwitch1Gpio = 60; // P9_12

const unsigned int PRU::kPruGPIODACSyncPin = kSpiDacChipSelectPin;
const unsigned int PRU::kPruGPIOADCSyncPin = kSpiAdcChipSelectPin;

#ifdef USE_NEON_FORMAT_CONVERSION
// These four functions are written in assembly in FormatConvert.S
extern "C" {
	void int16_to_float_audio(int numSamples, int16_t *inBuffer, float *outBuffer);
	void int16_to_float_analog(int numSamples, uint16_t *inBuffer, float *outBuffer);
	void float_to_int16_audio(int numSamples, float *inBuffer, int16_t *outBuffer);
	void float_to_int16_analog(int numSamples, float *inBuffer, uint16_t *outBuffer);
}
#endif /* USE_NEON_FORMAT_CONVERSION */

// Constructor: specify a PRU number (0 or 1)
PRU::PRU(InternalBelaContext *input_context)
: context(input_context),
  pru_number(1),
  initialised(false),
  running(false),
  analog_enabled(false),
  digital_enabled(false), gpio_enabled(false), led_enabled(false),
  pru_buffer_comm(0),
  audio_expander_input_history(0), audio_expander_output_history(0),
  audio_expander_filter_coeff(0), pruUsesMcaspIrq(false), belaHw(BelaHw_NoHw)
{
}

// Destructor
PRU::~PRU()
{
	if(running)
		disable();
	exitPRUSS();
	delete pruMemory;
	if(gpio_enabled)
		cleanupGPIO();
	if(audio_expander_input_history != 0)
		free(audio_expander_input_history);
	if(audio_expander_output_history != 0)
		free(audio_expander_output_history);
}

// Prepare the GPIO pins needed for the PRU
//If include_led is set,
// user LED 3 on the BBB is taken over by the PRU
// to indicate activity
int PRU::prepareGPIO(int include_led)
{
	if(context->analogFrames != 0) {
		// Prepare DAC CS/ pin: output, high to begin
		if(gpio_export(kPruGPIODACSyncPin)) {
			if(gRTAudioVerbose)
				fprintf(stderr, "Warning: couldn't export DAC sync pin\n");
		}
		if(gpio_set_dir(kPruGPIODACSyncPin, OUTPUT_PIN)) {
			if(gRTAudioVerbose)
				fprintf(stderr, "Couldn't set direction on DAC sync pin\n");
			return -1;
		}
		if(gpio_set_value(kPruGPIODACSyncPin, HIGH)) {
			if(gRTAudioVerbose)
				fprintf(stderr, "Couldn't set value on DAC sync pin\n");
			return -1;
		}

		// Prepare ADC CS/ pin: output, high to begin
		if(gpio_export(kPruGPIOADCSyncPin)) {
			if(gRTAudioVerbose)
				fprintf(stderr, "Warning: couldn't export ADC sync pin\n");
		}
		if(gpio_set_dir(kPruGPIOADCSyncPin, OUTPUT_PIN)) {
			if(gRTAudioVerbose)
				fprintf(stderr, "Couldn't set direction on ADC sync pin\n");
			return -1;
		}
		if(gpio_set_value(kPruGPIOADCSyncPin, HIGH)) {
			if(gRTAudioVerbose)
				fprintf(stderr, "Couldn't set value on ADC sync pin\n");
			return -1;
		}

		analog_enabled = true;
	}

	if(context->digitalFrames != 0){
		if(Bela_hwContains(belaHw, PocketBeagle))
		{
			gDigitalPins = digitalPinsPocketBeagle;
		} else {
			gDigitalPins = digitalPinsBeagleBone;
		}
		for(unsigned int i = 0; i < context->digitalChannels; i++){
			if(belaHw == BelaHw_Salt) {
				if(gDigitalPins[i] == saltSwitch1Gpio)
					continue; // leave alone this pin as it is used by bela_button.service
			}
			if(gpio_export(gDigitalPins[i])) {
				if(gRTAudioVerbose)
					fprintf(stderr,"Warning: couldn't export digital GPIO pin %d\n" , gDigitalPins[i]); // this is left as a warning because if the pin has been exported by somebody else, can still be used
			}
			if(gpio_set_dir(gDigitalPins[i], Gpio::INPUT)) {
				if(gRTAudioVerbose)
					fprintf(stderr,"Error: Couldn't set direction on digital GPIO pin %d\n" , gDigitalPins[i]);
				return -1;
			}
		}
		digital_enabled = true;
	}

	if(include_led) {
		if(Bela_hwContains(belaHw, BelaMiniCape))
		{
			//using on-board LED
			gpio_export(belaMiniLedBlue);
			gpio_set_dir(belaMiniLedBlue, OUTPUT_PIN);
			led_enabled = true;
		} else {
			// Using BeagleBone's USR3 LED
			// Turn off system function for LED3 so it can be reused by PRU
			led_set_trigger(3, "none");
			led_enabled = true;
		}
	}

	gpio_enabled = true;

	return 0;
}

// Clean up the GPIO at the end
void PRU::cleanupGPIO()
{
	if(!gpio_enabled)
		return;
	if(analog_enabled) {
		gpio_unexport(kPruGPIODACSyncPin);
		gpio_unexport(kPruGPIOADCSyncPin);
	}
	if(digital_enabled){
		for(unsigned int i = 0; i < context->digitalChannels; i++){
			if(belaHw == BelaHw_Salt) {
				if(gDigitalPins[i] == saltSwitch1Gpio)
					continue; // leave alone this pin as it is used by bela_button.service
			}
			if(gpio_unexport(gDigitalPins[i]))
			{
				// if unexport fails, we at least turn off the outputs
				gpio_set_dir(gDigitalPins[i], OUTPUT_PIN);
				gpio_set_value(gDigitalPins[i], 0);
			}
		}
	}
	if(led_enabled) {
		if(Bela_hwContains(belaHw, BelaMiniCape))
		{
			//using on-board LED
			gpio_unexport(belaMiniLedBlue);
		} else {
			// Set LED back to default eMMC status
			// TODO: make it go back to its actual value before this program,
			// rather than the system default
			led_set_trigger(3, "mmc1");
		}
	}
	gpio_enabled = false;
}

// Initialise and open the PRU
int PRU::initialise(BelaHw newBelaHw, int pru_num, bool uniformSampleRate, int mux_channels, int stopButtonPin, bool enableLed)
{
	belaHw = newBelaHw;
	// Initialise the GPIO pins, including possibly the digital pins in the render routines
	if(prepareGPIO(enableLed)) {
		fprintf(stderr, "Error: unable to prepare GPIO for PRU audio\n");
		return 1;
	}

	hardware_analog_frames = context->analogFrames;

	if(!gpio_enabled) {
		fprintf(stderr, "PRU::initialise() called before GPIO enabled\n");
		return 1;
	}

	pru_number = pru_num;

	/* Allocate and initialize memory */
#if ENABLE_PRU_UIO == 1
	pruManager = new PruManagerUio(pru_number, gRTAudioVerbose);
#endif	// ENABLE_PRU_UIO
#if ENABLE_PRU_RPROC == 1
	pruManager = new PruManagerRprocMmap(pru_number, gRTAudioVerbose);
#endif	// ENABLE_PRU_RPROC
	pruMemory = new PruMemory(pru_number, context, *pruManager);

	if(0 <= stopButtonPin){
		stopButton.open(stopButtonPin, Gpio::INPUT, false);
	}
	if(Bela_hwContains(belaHw, BelaMiniCape) && enableLed){
		underrunLed.open(belaMiniLedRed, Gpio::OUTPUT);
		underrunLed.clear();
	}
	if(Bela_hwContains(belaHw, BelaMiniCape))
	{
		// BelaMini Rev C requires resetting the SPI ADC via dedicated
		// pin before we start
		if(context->analogInChannels)
		{
			adcNrstPin.open(belaMiniRevCAdcPin, Gpio::OUTPUT, true);
			adcNrstPin.clear();
			usleep(1000);
			adcNrstPin.set();
		}
	}

	// after setting all PRU settings, we adjust
	// the "software" sampling rate with appropriate
	// allowing for "resampling" as/if required
	uniform_sample_rate = uniformSampleRate;
	if(uniform_sample_rate)
	{
		if(context->analogOutChannels && (context->analogInChannels != context->analogOutChannels))
		{
			fprintf(stderr, "Different numbers of inputs and outputs is not supported yet\n");
			return 1;

		}

		if(context->analogInChannels == 8)
			analogs_per_audio = 0.5;
		else if (context->analogInChannels == 4)
			analogs_per_audio = 1;
		else if (context->analogInChannels == 2)
			analogs_per_audio = 2;
		else if (context->analogInChannels != 0)
		{
			fprintf(stderr, "Unsupported number of analog channels per audio channels: %.3f\n", analogs_per_audio);
			return 1;
		}
		context->analogSampleRate = context->audioSampleRate;
		context->analogFrames = context->audioFrames;
	}

	// Allocate audio buffers
#ifdef USE_NEON_FORMAT_CONVERSION
	if(belaHw == BelaHw_Salt)
	{
		fprintf(stderr, "USE_NEON_FORMAT_CONVERSION is incompatible with Salt\n");
		return 1;
	}
	if(uniform_sample_rate && context->analogFrames != hardaware_analog_frames)
	{
		fprintf(stderr, "Error: using uniform_sample_rate is not allowed with USE_NEON_FORMAT_CONVERSION\n");
		return 1;
	}
	if(posix_memalign((void **)&context->audioIn, 16, 2 * context->audioFrames * sizeof(float))) {
		fprintf(stderr, "Error allocating audio input buffer\n");
		return 1;
	}
	if(posix_memalign((void **)&context->audioOut, 16, 2 * context->audioFrames * sizeof(float))) {
		fprintf(stderr, "Error allocating audio output buffer\n");
		return 1;
	}
#else
	context->audioIn = (float *)malloc(context->audioInChannels * context->audioFrames * sizeof(float));
	context->audioOut = (float *)calloc(1, context->audioOutChannels * context->audioFrames * sizeof(float));
	if(context->audioIn == 0 || context->audioOut == 0) {
		fprintf(stderr, "Error: couldn't allocate audio buffers\n");
		return 1;
	}
#endif
	
	// Allocate analog buffers
	if(analog_enabled) {
#ifdef USE_NEON_FORMAT_CONVERSION
		if(posix_memalign((void **)&context->analogIn, 16, 
							context->analogInChannels * context->analogFrames * sizeof(float))) {
			fprintf(stderr, "Error allocating analog input buffer\n");
			return 1;
		}
		if(posix_memalign((void **)&context->analogOut, 16, 
							context->analogOutChannels * context->analogFrames * sizeof(float))) {
			fprintf(stderr, "Error allocating analog output buffer\n");
			return 1;
		}
		last_analog_out_frame = (float *)malloc(context->analogOutChannels * sizeof(float));

		if(last_analog_out_frame == 0) {
			fprintf(stderr, "Error: couldn't allocate analog persistence buffer\n");
			return 1;
		}		
#else
		context->analogIn = (float *)malloc(context->analogInChannels * context->analogFrames * sizeof(float));
		context->analogOut = (float *)calloc(1, context->analogOutChannels * context->analogFrames * sizeof(float));
		last_analog_out_frame = (float *)calloc(1, context->analogOutChannels * sizeof(float));

		if(context->analogIn == 0 || context->analogOut == 0 || last_analog_out_frame == 0) {
			fprintf(stderr, "Error: couldn't allocate analog buffers\n");
			return 1;
		}
#endif
		
		memset(last_analog_out_frame, 0, context->analogOutChannels * sizeof(float));

		context->multiplexerChannels = mux_channels;
		if(mux_channels != 0 && mux_channels != 2 && mux_channels != 4 && mux_channels != 8)
		{
			fprintf(stderr, "Error: %d is not a valid number of multiplexer channels (options: 0 = off, 2, 4, 8).\n", mux_channels);
			return 1;
		}
	
		/* Multiplexer only works with 8 analog channels. (It could be made to work with 4, with updates to the PRU code.) */
		if(context->multiplexerChannels != 0 && context->analogInChannels != 8) {
			fprintf(stderr, "Error: multiplexer capelet can only be used with 8 analog channels.\n");
			return 1;
		}
		if(context->multiplexerChannels != 0) {
			// If mux enabled, allocate buffers and set initial values
			context->multiplexerStartingChannel = 0;
		
			// Buffer holds 1 frame of every mux setting for every analog in
			context->multiplexerAnalogIn = (float *)malloc(context->analogInChannels * context->multiplexerChannels * sizeof(float));
			if(context->multiplexerAnalogIn == 0) {
				fprintf(stderr, "Error: couldn't allocate audio buffers\n");
				return 1;
			}
		}
		else {
			context->multiplexerStartingChannel = 0;
			context->multiplexerAnalogIn = 0;
		}
		
		if((context->audioExpanderEnabled & 0x0000FFFF) != 0) {
			// Audio expander enabled on at least one analog input. Allocate filter buffers
			// and calculate coefficient.
			audio_expander_input_history = (float *)malloc(context->analogInChannels * sizeof(float));
			audio_expander_output_history = (float *)malloc(context->analogInChannels * sizeof(float));
			if(audio_expander_input_history == 0 || audio_expander_output_history == 0) {
				fprintf(stderr, "Error: couldn't allocate audio expander history buffers\n");
				return 1;				
			}
			
			for(unsigned int n = 0; n < context->analogInChannels; n++)
				audio_expander_input_history[n] = audio_expander_output_history[n] = 0;
			
			float cutoffFreqHz = 10.0; 
			audio_expander_filter_coeff = 1.0 / ((2.0 * M_PI * cutoffFreqHz / context->analogSampleRate) + 1.0);
		}
	}
	else {
		context->multiplexerChannels = 0;
		context->multiplexerStartingChannel = 0;
		context->multiplexerAnalogIn = 0;		
	}

	if(digital_enabled) {
		context->digital = pruMemory->getDigitalPtr();
		last_digital_buffer = (uint32_t *)malloc(context->digitalFrames * sizeof(uint32_t)); //temp buffer to hold previous states
		if(last_digital_buffer == 0) {
			fprintf(stderr, "Error: couldn't allocate digital buffers\n");
			return 1;
		}

		for(unsigned int n = 0; n < context->digitalFrames; n++){
			// Initialize default value for digitals to all inputs
			context->digital[n] = 0x0000ffff;
		}
	}

	initialised = true;
	return 0;
}

void PRU::initialisePruCommon(const McaspRegisters& mcaspRegisters)
{
	uint32_t board_flags = 0;
	switch(belaHw) {
	case BelaHw_BelaMiniMultiTdm:
	case BelaHw_BelaMiniMultiAudio:
	case BelaHw_BelaMultiTdm:
	case BelaHw_BelaMiniMultiI2s:
	case BelaHw_CtagFace:
	case BelaHw_CtagBeast:
	case BelaHw_CtagFaceBela:
	case BelaHw_CtagBeastBela:
		board_flags |= 1 << BOARD_FLAGS_BELA_GENERIC_TDM;
		break;
	case BelaHw_Bela:
	case BelaHw_BelaMini:
	case BelaHw_Salt:
	case BelaHw_NoHw:
	default:
		break;
	}
	if(Bela_hwContains(belaHw, BelaMiniCape))
		board_flags |= 1 << BOARD_FLAGS_BELA_MINI;
	pru_buffer_comm[PRU_COMM_BOARD_FLAGS] = board_flags;
    /* Set up flags */
	pru_buffer_comm[PRU_COMM_SHOULD_STOP] = 0;
	pru_buffer_comm[PRU_COMM_CURRENT_BUFFER] = 0;
	unsigned int pruFrames;
	if(analog_enabled)
		pruFrames = hardware_analog_frames;
	else
		pruFrames = context->audioFrames / 2; // PRU assumes 8 "fake" channels when SPI is disabled
	pru_buffer_comm[PRU_COMM_BUFFER_SPI_FRAMES] = pruFrames;
	if(pruUsesMcaspIrq)
		pruBufferMcaspFrames = context->audioFrames;
	else // TODO: it seems that PRU_COMM_BUFFER_MCASP_FRAMES is not very meaningful(cf pru_rtaudio_irq.p)
		pruBufferMcaspFrames = pruFrames * context->audioOutChannels / 2;
	pru_buffer_comm[PRU_COMM_BUFFER_MCASP_FRAMES] = pruBufferMcaspFrames;
	pru_buffer_comm[PRU_COMM_SHOULD_SYNC] = 0;
	pru_buffer_comm[PRU_COMM_SYNC_ADDRESS] = 0;
	pru_buffer_comm[PRU_COMM_SYNC_PIN_MASK] = 0;
	pru_buffer_comm[PRU_COMM_PRU_NUMBER] = pru_number;
	pru_buffer_comm[PRU_COMM_ERROR_OCCURRED] = 0;
	pru_buffer_comm[PRU_COMM_ACTIVE_CHANNELS] = ((uint16_t)context->audioOutChannels & 0xFFFF) << 16 | ((uint16_t)(context->audioInChannels) & 0xFFFF);
	memcpy((void*)(pru_buffer_comm + PRU_COMM_MCASP_CONF_PDIR), &mcaspRegisters,
			sizeof(mcaspRegisters));
	/* Set up multiplexer info */
	if(context->multiplexerChannels == 2) {
		pru_buffer_comm[PRU_COMM_MUX_CONFIG] = 1;
	}
	else if(context->multiplexerChannels == 4) {
		pru_buffer_comm[PRU_COMM_MUX_CONFIG] = 2;
	}
	else if(context->multiplexerChannels == 8) {
		pru_buffer_comm[PRU_COMM_MUX_CONFIG] = 3;
	}
	else { 
		// we trust that the number of multiplexer channels has been
		// checked elsewhere
		pru_buffer_comm[PRU_COMM_MUX_CONFIG] = 0;
	}
	
	if(led_enabled) {
		if(Bela_hwContains(belaHw, BelaMiniCape))
		{
			pru_buffer_comm[PRU_COMM_LED_ADDRESS] = belaMiniLedBlueGpioBase;
			pru_buffer_comm[PRU_COMM_LED_PIN_MASK] = belaMiniLedBlueGpioPinMask;
		} else {
			pru_buffer_comm[PRU_COMM_LED_ADDRESS] = userLed3GpioBase;
			pru_buffer_comm[PRU_COMM_LED_PIN_MASK] = userLed3GpioPinMask;
		}
	}
	else {
		pru_buffer_comm[PRU_COMM_LED_ADDRESS] = 0;
		pru_buffer_comm[PRU_COMM_LED_PIN_MASK] = 0;
	}
	if(analog_enabled) {
		pru_buffer_comm[PRU_COMM_USE_SPI] = 1;
		// TODO : a different number of channels for inputs and outputs
		// is not yet supported
		unsigned int analogChannels = context->analogInChannels;
		pru_buffer_comm[PRU_COMM_SPI_NUM_CHANNELS] = analogChannels;
	} else {
		pru_buffer_comm[PRU_COMM_USE_SPI] = 0;
		pru_buffer_comm[PRU_COMM_SPI_NUM_CHANNELS] = 0;
	}
	if(digital_enabled) {
		pru_buffer_comm[PRU_COMM_USE_DIGITAL] = 1;
	}
	else {
		pru_buffer_comm[PRU_COMM_USE_DIGITAL] = 0;
	}
}

// Run the code image in the specified file
int PRU::start(char * const filename, const McaspRegisters& mcaspRegisters)
{
	switch(belaHw)
	{
		case BelaHw_Bela:
			//nobreak
		case BelaHw_BelaMini:
			//nobreak
		case BelaHw_Salt:
			pruUsesMcaspIrq = false;
			break;
		case BelaHw_BelaMiniMultiAudio:
			//nobreak
		case BelaHw_BelaMiniMultiTdm:
                        //nobreak
		case BelaHw_BelaMultiTdm:
                        //nobreak
		case BelaHw_BelaMiniMultiI2s:
                        //nobreak
		case BelaHw_CtagFace:
			//nobreak
		case BelaHw_CtagBeast:
			//nobreak
		case BelaHw_CtagFaceBela:
			//nobreak
		case BelaHw_CtagBeastBela:
			pruUsesMcaspIrq = true;
			break;
		case BelaHw_NoHw:
		default:
			fprintf(stderr, "Error: unrecognized hardware\n");
			return 1;
	}

        if(gRTAudioVerbose)
                printf("%ssing McASP->PRU irq\n", pruUsesMcaspIrq ? "U" : "Not u");

#if RTDM_PRUSS_IRQ_VERSION < 1
        if(pruUsesMcaspIrq)
        {
                fprintf(stderr, "Error: the installed rtdm_pruss_irq driver cannot be used in conjunction with McASP interrupts. Update the driver\n");
                return -1;
        }

#endif /* RTDM_PRUSS_IRQ_VERSION */
#ifdef BELA_USE_RTDM
        // Open RTDM driver
        // NOTE: if this is moved later on, (e.g.: at the beginning of loop())
        // it will often hang the system (especially for small blocksizes).
        // Not sure why this would happen, perhaps a race condition between the PRU
        // and the rtdm_driver?
        if ((rtdm_fd_pru_to_arm = BELA_RT_WRAP(open(rtdm_driver, O_RDWR))) < 0) {
                fprintf(stderr, "Failed to open the kernel driver: (%d) %s.\n", errno, strerror(errno));
                if(errno == EBUSY) // Device or resource busy
                {
                        fprintf(stderr, "Another program is already running?\n");
                }
                if(errno == ENOENT) // No such file or directory
                {
                        fprintf(stderr, "Maybe try\n  modprobe rtdm_pruss_irq\n?\n");
                }
                return 1;
        }
#if RTDM_PRUSS_IRQ_VERSION >= 2
	{
		// From version 2 onwards we can set the verbose level
		int ret = BELA_RT_WRAP(ioctl(rtdm_fd_pru_to_arm, RTDM_PRUSS_IRQ_VERBOSE, 0));
		if(ret == -1)
			fprintf(stderr, "ioctl verbose failed: %d %s\n", errno, strerror(errno));
		// do not fail
	}
#endif // RTDM_PRUSS_IRQ_VERSION >= 2
#if RTDM_PRUSS_IRQ_VERSION >= 1
        // From version 1 onwards, we need to specify the PRU system event we want to receive interrupts from (see rtdm_pruss_irq.h)
        // For rtdm_fd_pru_to_arm we use the default mapping
        int ret = BELA_RT_WRAP(ioctl(rtdm_fd_pru_to_arm, RTDM_PRUSS_IRQ_REGISTER, pru_system_event_rtdm));
        if(ret == -1)
        {
                fprintf(stderr, "ioctl failed: %d %s\n", errno, strerror(errno));
                return 1;
        }
        if(pruUsesMcaspIrq)
	{
                if ((rtdm_fd_mcasp_to_pru = BELA_RT_WRAP(open(rtdm_driver, O_RDWR))) < 0) {
                        fprintf(stderr, "Unable to open rtdm driver to register McASP interrupts: (%d) %s.\n", errno, strerror(errno));
                        return 1;
                }
                // For rtdm_fd_mcasp_to_pru we use an arbitrary mapping to set up
                // the McASP to PRU interrupt.
                // We use PRU-INTC channel 0, which will trigger the PRUs R31.t30
                // This will not propagate to ARM (in
                // fact we have to mask it from ARM elsewhere), so no Linux/rtdm
                // IRQ is set up by the driver and we will not be able/need to
                // call `read()` on  `rtdm_fd_mcasp_to_pru`.
                struct rtdm_pruss_irq_registration rtdm_struct;
                rtdm_struct.pru_system_events = pru_system_events_mcasp;
                rtdm_struct.pru_system_events_count = sizeof(pru_system_events_mcasp);
                rtdm_struct.pru_intc_channel = mcasp_to_pru_channel;
                rtdm_struct.pru_intc_host = mcasp_to_pru_channel;
                int ret = BELA_RT_WRAP(ioctl(rtdm_fd_mcasp_to_pru, RTDM_PRUSS_IRQ_REGISTER_FULL, &rtdm_struct));
                if(ret == -1)
                {
                        fprintf(stderr, "ioctl failed: %d %s\n", errno, strerror(errno));
                        return 1;
                }
	}
#endif /* RTDM_PRUSS_IRQ_VERSION >= 1 */
#endif /* BELA_USE_RTDM */
	pru_buffer_comm = pruMemory->getPruBufferComm();
	initialisePruCommon(mcaspRegisters);
	// NOTE: we assume that something else has masked the McASP interrupts
	// from ARM, or rather that no one else unmasked them.
	// For instance, make sure the McASP driver does not get to get hold of them
	// by NOT setting `interrupt-names = "rx", "tx";` in the overlay

	/* Load and execute binary on PRU */
	bool useEmbeddedPruCode = ("" == std::string(filename));
	unsigned int pruManager_ret = 0;
	if(gRTAudioVerbose)
		printf("Using %s %s PRU firmware\n", pruUsesMcaspIrq ? "McASP IRQ" : "Non-McASP IRQ", useEmbeddedPruCode ? "embedded" : filename);
	if(useEmbeddedPruCode)
		pruManager_ret = pruManager->start(pruUsesMcaspIrq);
	else
		pruManager_ret = pruManager->start(std::string(filename)); // simply passing filename calls the wrong overload
	if(pruManager_ret)
	{
		fprintf(stderr, "Failed to execute PRU code\n");
		return 1;
	}
	running = true;
	return 0;
}

int PRU::testPruError()
{
	if (unsigned int errorCode = pru_buffer_comm[PRU_COMM_ERROR_OCCURRED])
	{
		// only print warnings if we have been running for a while, or forced to do so
		bool verbose = (context->audioFramesElapsed > 5000) || gRTAudioVerbose;
		verbose && rt_fprintf(stderr, "audio frame %llu, errorCode: %d\n", context->audioFramesElapsed, errorCode);
		int ret;
		switch(errorCode){
			case ARM_ERROR_XUNDRUN:
				verbose && rt_fprintf(stderr, "McASP transmitter underrun occurred\n");
				ret = 1;
			break;
			case ARM_ERROR_XSYNCERR:
				verbose && rt_fprintf(stderr, "McASP unexpected transmit frame sync occurred\n");
				ret = 1;
			break;
			// Sometimes a transmit clock error arises after boot. If the PRU loop
			// continues, the clock error is automatically solved. Hence, no additional
			// error handling is required on ARM side.
			case ARM_ERROR_XCKFAIL:
				verbose && rt_fprintf(stderr, "McASP transmit clock failure occurred\n");
				ret = 1;
			break;
			// Same for DMA error. No action needed on ARM side.
			case ARM_ERROR_XDMAERR:
				verbose && rt_fprintf(stderr, "McASP transmit DMA error occurred\n");
				ret = 1;
			break;
			case ARM_ERROR_TIMEOUT:
				verbose && rt_fprintf(stderr, "PRU event loop timed out\n");
				ret = 1;
			break;
			case ARM_ERROR_INVALID_INIT:
				fprintf(stderr, "Invalid PRU configuration settings\n");
				ret = 2;
			break;
			default:
				verbose && rt_fprintf(stderr, "Unknown PRU error: %d\n", errorCode);
				ret = 1;
		}
		pru_buffer_comm[PRU_COMM_ERROR_OCCURRED] = 0;
		return ret;
	} else {
		return 0;
	}
}

// Main loop to read and write data from/to PRU
void PRU::loop(void *userData, void(*render)(BelaContext*, void*), bool highPerformanceMode, BelaCpuData* cpuData)
{

	// these pointers will be constant throughout the lifetime of pruMemory
	uint16_t* analogInRaw = pruMemory->getAnalogInPtr();
	uint16_t* analogOutRaw = pruMemory->getAnalogOutPtr();
	int16_t* audioInRaw = pruMemory->getAudioInPtr();
	int16_t* audioOutRaw = pruMemory->getAudioOutPtr();
	// Polling interval is 1/4 of the period
	time_ns_t sleepTime = 1000000000 * (float)context->audioFrames / (context->audioSampleRate * 4);
	if(highPerformanceMode) // sleep less, more CPU available for us
		sleepTime /= 4;
#ifdef BELA_USE_RTDM
	// If we have ultra-small block sizes, sleeping is just detrimental: disable it 
	// by enabling highPerformanceMode
	if(context->audioFrames <= 2)
		highPerformanceMode = true;
#endif

	//sleepTime = context->audioFrames / context->audioSampleRate / 4.f * 1000000000.f;

	// Before starting, look at the last state of the analog and digital outputs which might
	// have been changed by the user during the setup() function. This lets us start with pin
	// directions and output values at something other than defaults.

	if(analog_enabled) {
		if(context->flags & BELA_FLAG_ANALOG_OUTPUTS_PERSIST) {
			// Remember the content of the last_analog_out_frame
			for(unsigned int ch = 0; ch < context->analogOutChannels; ch++){
				last_analog_out_frame[ch] = context->analogOut[context->analogOutChannels * (context->analogFrames - 1) + ch];
			}
		}
	}

	if(digital_enabled) {
		for(unsigned int n = 0; n < context->digitalFrames; n++){
			last_digital_buffer[n] = context->digital[n];
		}
	}

	bool interleaved = context->flags & BELA_FLAG_INTERLEAVED;
	int underrunLedCount = -1;
	while(!Bela_stopRequested()) {

#if defined BELA_USE_POLL || defined BELA_USE_BUSYWAIT
		// Which buffer the PRU was last processing
		static uint32_t lastPRUBuffer = 0;
		// Poll
		while(pru_buffer_comm[PRU_COMM_CURRENT_BUFFER] == lastPRUBuffer && !Bela_stopRequested()) {
#ifdef BELA_USE_POLL
			task_sleep_ns(sleepTime);
#endif /* BELA_USE_POLL */
			if(testPruError())
				break;
		}

		lastPRUBuffer = pru_buffer_comm[PRU_COMM_CURRENT_BUFFER];
#endif /* BELA_USE_POLL || BELA_USE_BUSYWAIT */
#ifdef BELA_USE_RTDM
		// make sure we always sleep a tiny bit to prevent hanging the board
		if(!highPerformanceMode) // unless the user requested us not to.
			task_sleep_ns(sleepTime / 2);
		int ret = BELA_RT_WRAP(read(rtdm_fd_pru_to_arm, NULL, 0));
		int error = testPruError();
		if(2 == error) {
                        gShouldStop = true;
                        break;
                }
		if(ret < 0)
		{
			static int interruptTimeoutCount = 0;
			++interruptTimeoutCount;
			rt_fprintf(stderr, "PRU interrupt timeout, %d %d %s\n", ret, errno, strerror(errno));
			if(interruptTimeoutCount >= 5)
			{
				fprintf(stderr, "McASP error, abort\n");
				exit(1); // Quitting abruptly, purposedly skipping the cleanup so that we can inspect the PRU with prudebug.
			}
			task_sleep_ns(100000000);
		}
#endif
		if(cpuData)
			Bela_cpuTic(cpuData);

		if(stopButton.enabled()){
			static int stopButtonCount = 0;
			if(stopButton.read() == 0){
				if(++stopButtonCount > 10){
					printf("Button pressed, quitting\n");
					Bela_requestStop();
				}
			} else {
				stopButtonCount = 0;
			}
		}

		if(Bela_stopRequested())
			break;

		// pru_buffer_comm[PRU_COMM_CURRENT_BUFFER] will have been set by
		// the PRU just before signalling ARM. We use buffer that is
		// not in use by the PRU
		int pruBufferForArm = pru_buffer_comm[PRU_COMM_CURRENT_BUFFER] == 0 ? 1 : 0;
		pruMemory->copyFromPru(pruBufferForArm);

		// Convert short (16-bit) samples to float
#ifdef USE_NEON_FORMAT_CONVERSION
		int16_to_float_audio(2 * context->audioFrames, audio_adc_pru_buffer, context->audioIn);
		// TODO: implement non-interlaved
#else
		unsigned int audioInChannels = context->audioInChannels;
		if(interleaved)
		{
			for(unsigned int n = 0; n < audioInChannels * context->audioFrames; n++) {
				context->audioIn[n] = (float)audioInRaw[n] / 32768.0f;
			}
		}
		else
		{
			for(unsigned int f = 0; f < context->audioFrames; ++f)
			{
				for(unsigned int c = 0; c < audioInChannels; ++c)
				{
					unsigned int srcIdx = f * context->audioInChannels + c;
					unsigned int dstIdx = c * context->audioFrames + f;
					float value = (float)audioInRaw[srcIdx] / 32768.0f;
					context->audioIn[dstIdx] = value;
				}
			}
		}
#endif /* defined USE_NEON_FORMAT_CONVERSION */
		if(BelaHw_CtagBeast == belaHw || BelaHw_CtagBeastBela == belaHw)
		{
			// on the input data line we get:
			// - inputs from main codec (slots 0:3)
			// - inputs from secondary codec (slots 4:7)
			// on the output data line we get:
			// - outputs to secondary codec (slots 0:7)
			// - outputs to main codec (slots 8:15)
			// For historical reasons, we want them to be all in the same
			// order, with secondary codec's channels first. So here we
			// swap the inputs
			for(unsigned int f = 0; f < context->audioFrames; ++f)
			{
				for(unsigned int c = 0; c < audioInChannels / 2; ++c)
				{
					size_t offset0;
					size_t offset1;
					if(interleaved)
					{
						offset0 = context->audioInChannels * f + c;
						offset1 = context->audioInChannels * f + c + context->audioInChannels / 2;
					} else {
						offset0 = context->audioFrames * c + f;
						offset1 = context->audioFrames * (c + context->audioInChannels / 2) + f;
					}
					float valueA = context->audioIn[offset1];
					float valueB = context->audioIn[offset0];
					context->audioIn[offset0] = valueA;
					context->audioIn[offset1] = valueB;
				}
			}
		}
		
		if(analog_enabled) {
			if(context->multiplexerChannels != 0) {
				// If multiplexer is enabled, find out which channels we have by pulling out
				// the place that it ended. Based on the buffer size, we can work out the
				// mux setting for the beginning of the buffer.
				int pruMuxReference = pru_buffer_comm[PRU_COMM_MUX_END_CHANNEL];
			
				
				// Value from the PRU is ahead by 1 + (frame size % 8); correct that when unrolling here.
				int multiplexerChannelLastFrame = (pruMuxReference - 1 - (hardware_analog_frames % 8) + context->multiplexerChannels)
													% context->multiplexerChannels;
				
				// Add 1, wrapping around, to get the starting channel		
				context->multiplexerStartingChannel = (multiplexerChannelLastFrame + 1) % context->multiplexerChannels;
				
				// Write the inputs to the buffer of multiplexed samples
				if(context->multiplexerAnalogIn != 0) {
					unsigned int muxChannelCount = 0;
					int multiplexerChannel = multiplexerChannelLastFrame;

					for(int n = hardware_analog_frames - 1; n >= 0; n--) {
						for(unsigned int ch = 0; ch < context->analogInChannels; ch++) {
							 // rather than supporting all possible combinations of (non-)interleavead/(non-)uniform,
							 // we go back to the raw samples and convert them again.
							context->multiplexerAnalogIn[multiplexerChannel * context->analogInChannels + ch] =
								analogInRaw[n * context->analogInChannels + ch] / 65536.f;
						}

						multiplexerChannel--;
						if(multiplexerChannel < 0)
							multiplexerChannel = context->multiplexerChannels - 1;
						// If we have made a full circle of the multiplexer channels, then
						// stop here.
						if(++muxChannelCount >= context->multiplexerChannels)
							break;
					}
				}
			}
			
#ifdef USE_NEON_FORMAT_CONVERSION
			// TODO: add support for different analogs_per_audio ratios
			int16_to_float_analog(context->analogInChannels * context->analogFrames, 
									analogInRaw, context->analogIn);
#else
			if(uniform_sample_rate && analogs_per_audio == 0.5)
			{
				unsigned int channels = context->analogInChannels;
				unsigned int frames = hardware_analog_frames;
				if(interleaved)
				{
					for(unsigned int f = 0; f < frames; ++f)
					{
						for(unsigned int c = 0; c < channels; ++c)
						{
							float value = (float)analogInRaw[f * channels + c] / 65536.0f;
							int firstFrame = channels * 2 * f + c;
							context->analogIn[firstFrame] = value;
							context->analogIn[firstFrame + channels] = value;
						}
					}
				}
				else
				{
					for(unsigned int f = 0; f < frames; ++f)
					{
						for(unsigned int c = 0; c < channels; ++c)
						{
							unsigned int srcIdx = f * channels + c;
							unsigned int dstIdx = frames * c * 2 + f * 2;
							float value = (float)analogInRaw[srcIdx] / 65536.0f;
							context->analogIn[dstIdx] = value;
							context->analogIn[dstIdx + 1] = value;
						}
					}
				}
			}
			else if (!uniform_sample_rate || analogs_per_audio == 1)
			{
				if(interleaved)
				{
					for(unsigned int n = 0;
						n < context->analogInChannels * context->analogFrames;
						++n)
					{
						float value = (float)analogInRaw[n] / 65536.0f;
						context->analogIn[n] = value;
					}
				}
				else
				{
					for(unsigned int f = 0; f < context->analogFrames; ++f)
					{
						for(unsigned int c = 0; c < context->analogInChannels; ++c)
						{
							unsigned int srcIdx = context->analogInChannels * f + c;
							unsigned int dstIdx = context->analogFrames * c + f;
							float value = (float)analogInRaw[srcIdx] / 65536.0f;
							context->analogIn[dstIdx] = value;
						}
					}
				}
			}
			else if (uniform_sample_rate && analogs_per_audio == 2)
			{
				unsigned int channels = context->analogInChannels;
				unsigned int frames = hardware_analog_frames;
				if(interleaved)
				{
					for(unsigned int f = 0; f < frames; f += 2)
					{
						for(unsigned int c = 0; c < channels; ++c)
						{
							float value = (float)analogInRaw[f * channels + c] / 65536.0f;
							context->analogIn[(f / 2) * channels + c] = value;
						}
					}
				}
				else
				{
					for(unsigned int f = 0; f < frames; f += 2)
					{
						for(unsigned int c = 0; c < channels; ++c)
						{
							unsigned int srcIdx = f * channels + c;
							unsigned int dstIdx = c * (frames / 2) + f / 2;
							float value = (float)analogInRaw[srcIdx] / 65536.0f;
							context->analogIn[dstIdx] = value;
						}
					}
				}
			}
			if(belaHw == BelaHw_Salt) {
				const float analogInMax = 65535.f/65536.f;
				for(unsigned int n = 0; n < context->analogInChannels * context->analogFrames; ++n)
				{
					context->analogIn[n] = analogInMax - context->analogIn[n];
					// if analogInMax is different from 65535/65536, we should
					// clip it to avoid reading out of range values:
					// if(context->analogIn[n] > 1)
						// context->analogIn[n] = 1;
				}
			}
#endif /* USE_NEON_FORMAT_CONVERSION */
			
			if((context->audioExpanderEnabled & 0x0000FFFF) != 0) {
				// Audio expander enabled on at least one analog input
				if(interleaved)
				{
					for(unsigned int ch = 0; ch < context->analogInChannels; ch++) {
						if(context->audioExpanderEnabled & (1 << ch)) {
							// Audio expander enabled on this channel:
							// apply highpass filter and scale by 2 to get -1 to 1 range
							// rather than 0-1
							for(unsigned int n = 0; n < context->analogFrames; n++) {
								float filteredOut = audio_expander_filter_coeff *
									(audio_expander_output_history[ch] + 
									 context->analogIn[n * context->analogInChannels + ch] -
									 audio_expander_input_history[ch]);
								
								audio_expander_input_history[ch] = context->analogIn[n * context->analogInChannels + ch];
								audio_expander_output_history[ch] = filteredOut;
								context->analogIn[n * context->analogInChannels + ch] = 2.0f * filteredOut;
							}
						}
					}
				}
				else
				{
					for(unsigned int ch = 0; ch < context->analogInChannels; ch++) {
						if(context->audioExpanderEnabled & (1 << ch)) {
							// Audio expander enabled on this channel:
							// apply highpass filter and scale by 2 to get -1 to 1 range
							// rather than 0-1
							for(unsigned int n = 0; n < context->analogFrames; n++) {
								float filteredOut = audio_expander_filter_coeff *
									(audio_expander_output_history[ch] + 
									 context->analogIn[ch * context->analogFrames + n] -
									 audio_expander_input_history[ch]);
								
								audio_expander_input_history[ch] = context->analogIn[ch * context->analogFrames + n];
								audio_expander_output_history[ch] = filteredOut;
								context->analogIn[ch * context->analogFrames + n] = 2.0f * filteredOut;
							}
						}
					}
				}
			}
			
			if(context->flags & BELA_FLAG_ANALOG_OUTPUTS_PERSIST) {
				// Initialize the output buffer with the values that were in the last frame of the previous output
				if(interleaved)
				{
					for(unsigned int ch = 0; ch < context->analogOutChannels; ++ch)
						analogWrite((BelaContext*)context, 0, ch, last_analog_out_frame[ch]);
				}
				else
				{
					for(unsigned int ch = 0; ch < context->analogOutChannels; ++ch)
						analogWriteNI((BelaContext*)context, 0, ch, last_analog_out_frame[ch]);
				}
			}
			else {
				// Outputs are 0 unless set otherwise
				memset(context->analogOut, 0, context->analogOutChannels * context->analogFrames * sizeof(float));
			}
		}

		if(digital_enabled){
			// Use past digital values to initialize the array properly.
			// For each frame:
			// - pins previously set as outputs will keep the output value they had in the last frame of the previous buffer,
			// - pins previously set as inputs will carry the newly read input value

			uint32_t inputXorMask; // which digital input values need to be inverted
			if(belaHw == BelaHw_Salt)
				inputXorMask = 0xffff0000; // on Salt, inputs are inverted. When ^ with the input values, this will invert the values.
			else
				inputXorMask = 0; // everywhere else, inputs are not inverted. When ^ with the input values, this will leave them untouched.
			for(unsigned int n = 0; n < context->digitalFrames; ++n){
				uint16_t inputs = last_digital_buffer[n] & 0xffff; // half-word, has 1 for inputs and 0 for outputs

				uint16_t outputs = ~inputs; // half-word has 1 for outputs and 0 for inputs;
				context->digital[n] = (last_digital_buffer[context->digitalFrames - 1] & (outputs << 16)) | // keep output values set in the last frame of the previous buffer
									   ( inputXorMask ^ (context->digital[n] & (inputs << 16)) )   | // inputs from current context->digital[n];
									   (last_digital_buffer[n] & (inputs));     // keep pin configuration from previous context->digital[n]
			}
		}

		// Call user render function
		// ***********************
		(*render)((BelaContext *)context, userData);
		// ***********************

		if(analog_enabled) {
			if(belaHw == BelaHw_Salt) {
				for(unsigned int n = 0; n < context->analogOutChannels * context->analogFrames; n++)
				{
					// also rescale it to avoid
					// headroom problem on the analog outputs with a sagging
					// 5V USB supply
					const float analogOutMax = 0.93;
					context->analogOut[n] = (1.f - context->analogOut[n]) * analogOutMax;
				}
			}
			if(context->flags & BELA_FLAG_ANALOG_OUTPUTS_PERSIST) {
				// Remember the content of the last_analog_out_frame
				if(interleaved)
				{
					for(unsigned int ch = 0; ch < context->analogOutChannels; ch++){
						last_analog_out_frame[ch] = context->analogOut[context->analogOutChannels * (context->analogFrames - 1) + ch];
					}
				}
				else
				{
					for(unsigned int ch = 0; ch < context->analogOutChannels; ch++){
						last_analog_out_frame[ch] = context->analogOut[ch * context->analogFrames + context->analogFrames - 1];
					}
				}
			}
			
			if((context->audioExpanderEnabled & 0xFFFF0000) != 0) {
				// Audio expander enabled on at least one analog output
				// We expect the range to be -1 to 1; rescale to
				// 0 to 0.93, the top value being designed to avoid a
				// headroom problem on the analog outputs with a sagging
				// 5V USB supply
				
				if(interleaved)
				{
					for(unsigned int ch = 0; ch < context->analogOutChannels; ch++) {
						if(context->audioExpanderEnabled & (0x00010000 << ch)) {
							// Audio expander enabled on this output channel:
							for(unsigned int n = 0; n < context->analogFrames; n++) {
								context->analogOut[n * context->analogOutChannels + ch] = 
									(context->analogOut[n * context->analogOutChannels + ch] + 1.f) * (0.93f/2.f);
							}
						}
					}
				}
				else
				{
					for(unsigned int ch = 0; ch < context->analogOutChannels; ch++) {
						if(context->audioExpanderEnabled & (0x00010000 << ch)) {
							// Audio expander enabled on this output channel:
							for(unsigned int n = 0; n < context->analogFrames; n++) {
								context->analogOut[ch * context->analogFrames + n] = 
									(context->analogOut[ch * context->analogFrames + n] + 1.f) * (0.93f/2.f);
							}
						}
					}
				}
			}

			// Convert float back to short for SPI output
#ifdef USE_NEON_FORMAT_CONVERSION
			float_to_int16_analog(context->analogOutChannels * context->analogFrames, 
								  context->analogOut, dac_pru_buffer);
#else		
			if(uniform_sample_rate && analogs_per_audio == 0.5)
			{
				unsigned int channels = context->analogOutChannels;
				unsigned int frames = hardware_analog_frames;
				if(interleaved)
				{
					for(unsigned int f = 0; f < frames; ++f)
					{
						for(unsigned int c = 0; c < channels; ++c)
						{
							int out = context->analogOut[f * channels * 2 + c] * 65536.0f;
							if(out < 0) out = 0;
							else if(out > 65535) out = 65535;
							analogOutRaw[f * channels + c] = (uint16_t)out;
						}
					}
				}
				else
				{
					for(unsigned int f = 0; f < frames; ++f)
					{
						for(unsigned int c = 0; c < channels; ++c)
						{
							unsigned int srcIdx = c * frames * 2 + f * 2;
							unsigned int dstIdx = f * channels + c;
							int out = context->analogOut[srcIdx] * 65536.0f;
							if(out < 0) out = 0;
							else if(out > 65535) out = 65535;
							analogOutRaw[dstIdx] = (uint16_t)out;
						}
					}
				}
			}
			else if(!uniform_sample_rate || analogs_per_audio == 1)
			{
				unsigned int frames = context->analogFrames;
				unsigned int channels = context->analogOutChannels;
				if(interleaved)
				{
					for(unsigned int n = 0; n < frames * channels; ++n)
					{
						int out = context->analogOut[n] * 65536.0f;
						if(out < 0) out = 0;
						else if(out > 65535) out = 65535;
						analogOutRaw[n] = (uint16_t)out;
					}
				}
				else
				{
					for(unsigned int f = 0; f < frames; ++f)
					{
						for(unsigned int c = 0; c < channels; ++c)
						{
							unsigned int srcIdx = c * frames + f;
							unsigned int dstIdx = f * channels + c;
							int out = context->analogOut[srcIdx] * 65536.0f;
							if(out < 0) out = 0;
							else if(out > 65535) out = 65535;
							analogOutRaw[dstIdx] = (uint16_t)out;
						}
					}
				}
			}
			else if(uniform_sample_rate && analogs_per_audio == 2)
			{
				unsigned int channels = context->analogOutChannels;
				unsigned int frames = hardware_analog_frames;
				if(interleaved)
				{
					for(unsigned int f = 0; f < frames; f += 2)
					{
						for(unsigned int c = 0; c < channels; ++c)
						{
							int out = context->analogOut[f * channels / 2 + c] * 65536.0f;
							if(out < 0) out = 0;
							else if(out > 65535) out = 65535;
							unsigned int firstFrame = f * channels + c;
							analogOutRaw[firstFrame] = (uint16_t)out;
							analogOutRaw[firstFrame + channels] = (uint16_t)out;
						}
					}
				}
				else
				{
					for(unsigned int f = 0; f < frames; f += 2)
					{
						for(unsigned int c = 0; c < channels; ++c)
						{
							unsigned int srcIdx = frames / 2 * c + f / 2;
							unsigned int dstIdx = f * channels + c;
							int out = context->analogOut[srcIdx] * 65536.0f;
							if(out < 0) out = 0;
							else if(out > 65535) out = 65535;
							analogOutRaw[dstIdx] = (uint16_t)out;
							analogOutRaw[dstIdx + channels] = (uint16_t)out;
						}
					}
				}
			}
#endif /* USE_NEON_FORMAT_CONVERSION */
		}

		if(digital_enabled) { // keep track of past digital values
			for(unsigned int n = 0; n < context->digitalFrames; n++){
				if(belaHw == BelaHw_Salt) {
					// invert output channels (trig out on the module are inverted)
					// Also invert input channels. This way, in case
					// there is an underrun and ARM partially
					// overwrites the PRU memory, we read (old)
					// meaningful values back (see https://github.com/BelaPlatform/Bela/issues/406)
					context->digital[n] =
						(~context->digital[n] & 0xffff0000) | // invert high word (input/output values)
						(context->digital[n] & 0xffff); // leave low word as is (1 means input)
				}
				last_digital_buffer[n] = context->digital[n];
			}
		}

		// Convert float back to short for audio
#ifdef USE_NEON_FORMAT_CONVERSION
		float_to_int16_audio(2 * context->audioFrames, context->audioOut, audio_dac_pru_buffer);
#else	
		if(interleaved)
		{
			for(unsigned int n = 0; n < context->audioOutChannels * context->audioFrames; ++n) {
				int out = context->audioOut[n] * 32768.0f;
				if(out < -32768) out = -32768;
				else if(out > 32767) out = 32767;
				audioOutRaw[n] = (int16_t)out;
			}
		}
		else
		{
			for(unsigned int f = 0; f < context->audioFrames; ++f)
			{
				for(unsigned int c = 0; c < context->audioOutChannels; ++c)
				{
					unsigned int srcIdx = c * context->audioFrames + f;
					unsigned int dstIdx = f * context->audioOutChannels + c;
					int out = context->audioOut[srcIdx] * 32768.0f;
					if(out < -32768) out = -32768;
					else if(out > 32767) out = 32767;
					audioOutRaw[dstIdx] = (int16_t)out;
				}
			}
		}
#endif /* USE_NEON_FORMAT_CONVERSION */
		pruMemory->copyToPru(pruBufferForArm);

		// Check for underruns by comparing the number of samples reported
		// by the PRU with a local counter
		// This is a pessimistic approach: you will occasionally get an underrun warning
		// without a glitch actually occurring, but you will be right there on the edge anyhow.

		if(context->flags & BELA_FLAG_DETECT_UNDERRUNS) {
			// If analog is disabled, then PRU assumes 8 analog channels, and therefore
			// half as many analog frames as audio frames
			uint32_t pruFramesPerBlock = pruBufferMcaspFrames;
			// read the PRU counter
			uint32_t pruFrameCount = pru_buffer_comm[PRU_COMM_FRAME_COUNT];
			// we initialize lastPruFrameCount the first time we get here,
			// just in case the PRU is already ahead of us
			static uint32_t lastPruFrameCount = pruFrameCount - pruFramesPerBlock;
			uint32_t expectedFrameCount = lastPruFrameCount + pruFramesPerBlock;
			if(pruFrameCount > expectedFrameCount)
			{
				// don't print a warning if we are stopping
				if(!Bela_stopRequested())
				{
					rt_fprintf(stderr, "Underrun detected: %u blocks dropped\n", (pruFrameCount - expectedFrameCount) / pruFramesPerBlock);
					if(underrunLed.enabled())
						underrunLed.set();
					underrunLedCount = underrunLedDuration;
				}
				context->underrunCount++;
			}
			lastPruFrameCount = pruFrameCount;
			if(underrunLedCount > 0)
			{
				underrunLedCount -= context->audioFrames;
				if(underrunLedCount <= 0)
				{
					if(underrunLed.enabled())
						underrunLed.clear();
				}
			}
		}

		// Increment total number of samples that have elapsed.
		context->audioFramesElapsed += context->audioFrames;
		if(cpuData)
			Bela_cpuToc(cpuData);

	}

#if defined(BELA_USE_RTDM)
        if(rtdm_fd_pru_to_arm)
                BELA_RT_WRAP(close(rtdm_fd_pru_to_arm));
#if RTDM_PRUSS_IRQ_VERSION >= 1
        if(rtdm_fd_pru_to_arm)
                BELA_RT_WRAP(close(rtdm_fd_mcasp_to_pru));
#endif /* RTDM_PRUSS_IRQ_VERSION */
#endif /* BELA_USE_RTDM */

	// Tell PRU to stop
	pru_buffer_comm[PRU_COMM_SHOULD_STOP] = 1;
	if(underrunLed.enabled())
		underrunLed.clear();

	// Wait for the PRU to finish
	task_sleep_ns(100000000);

	// Clean up after ourselves
	free(context->audioIn);
	free(context->audioOut);

	if(analog_enabled) {
		free(context->analogIn);
		free(context->analogOut);
		free(last_analog_out_frame);
		if(context->multiplexerAnalogIn != 0)
			free(context->multiplexerAnalogIn);
		if(audio_expander_input_history != 0) {
			free(audio_expander_input_history);
			audio_expander_input_history = 0;
		}
		if(audio_expander_output_history != 0) {
			free(audio_expander_output_history);
			audio_expander_output_history = 0;
		}
	}

	if(digital_enabled) {
		free(last_digital_buffer);
	}

	context->audioIn = context->audioOut = 0;
	context->analogIn = context->analogOut = 0;
	context->digital = 0;
	context->multiplexerAnalogIn = 0;
}

// Wait for an interrupt from the PRU indicate it is finished
void PRU::waitForFinish()
{
	if(!running)
		return;
#if defined BELA_USE_POLL || defined BELA_USE_BUSYWAIT
	// nothing to wait for
#endif
#ifdef BELA_USE_RTDM
	int value;
	BELA_RT_WRAP(read(rtdm_fd_pru_to_arm, &value, sizeof(value)));
#endif
	return;
}

// Turn off the PRU when done
void PRU::disable()
{
	/* Disable PRU and close memory mapping*/
	pruManager->stop();
	running = false;
}

// Exit the pru subsystem
void PRU::exitPRUSS()
{
	if(initialised)
		delete pruManager;
	initialised = false;
}

