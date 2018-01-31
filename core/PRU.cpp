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
#include "../include/PruBinary.h"
#include "../include/prussdrv.h"
#include "../include/pruss_intc_mapping.h"
#include "../include/digital_gpio_mapping.h"
#include "../include/GPIOcontrol.h"
#include "../include/Bela.h"
#include "../include/Gpio.h"
#include "../include/Utilities.h"

#include <iostream>
#include <stdlib.h>
#include <cstdio>
#include <cerrno>
#include <cmath>
#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>
#include <vector>

#include <sys/mman.h>
#include <string.h>

//#define CTAG_FACE_8CH
//#define CTAG_BEAST_16CH

#if (defined(CTAGE_FACE_8CH) || defined(CTAG_FACE_16CH))
	#define PRU_USES_MCASP_IRQ
#endif

#if !(defined(BELA_USE_POLL) || defined(BELA_USE_RTDM))
#error Define one of BELA_USE_POLL, BELA_USE_RTDM
#endif

#ifdef BELA_USE_RTDM
static char rtdm_driver[] = "/dev/rtdm/rtdm_pruss_irq_0";
static int rtdm_fd;
#endif

// Xenomai-specific includes
#if defined(XENOMAI_SKIN_native)
#include <native/task.h>
#include <native/timer.h>
#include <rtdk.h>
#endif

#if defined(XENOMAI_SKIN_posix)
#include <pthread.h>
#endif

#include "../include/xenomai_wraps.h"

using namespace std;

// Select whether to use NEON-based sample conversion
// (this will probably go away in a future commit once its performance
//  is verified over extended use)
#undef USE_NEON_FORMAT_CONVERSION

#if defined(USE_NEON_FORMAT_CONVERSION) && defined (BELA_MODULAR)
#error BELA_MODULAR is incompatible with USE_NEON_FORMAT_CONVERSION
#endif

// PRU memory: PRU0- and PRU1- DATA RAM are 8kB (0x2000) long each
//             PRU-SHARED RAM is 12kB (0x3000) long

#define PRU_MEM_MCASP_OFFSET 0x2000  // Offset within PRU-SHARED RAM
#define PRU_MEM_MCASP_LENGTH 0x1000  // Length of McASP memory, in bytes
#define PRU_MEM_DAC_OFFSET 0x0     // Offset within PRU-DATA RAM
#define PRU_MEM_DAC_LENGTH 0x2000  // Length of ADC+DAC memory, in bytes
#define PRU_MEM_COMM_OFFSET 0x0    // Offset within PRU-SHARED RAM
#define PRU_MEM_DIGITAL_OFFSET 0x1000 //Offset within PRU-SHARED RAM
#define MEM_DIGITAL_BUFFER1_OFFSET 0x400 //Start pointer to DIGITAL_BUFFER1, which is 256 words.
                                         // 256 is the maximum number of frames allowed
extern int gRTAudioVerbose;

class PruMemory
{
public:
	PruMemory(int pruNumber, InternalBelaContext* newContext) :
		context(newContext)
	{
		prussdrv_map_prumem (PRUSS0_SHARED_DATARAM, (void **)&pruSharedRam);
		audioIn.resize(context->audioInChannels * context->audioFrames);
		audioOut.resize(context->audioOutChannels * context->audioFrames);
		digital.resize(context->digitalFrames);
		pruAudioOutStart[0] = pruSharedRam + PRU_MEM_MCASP_OFFSET;
		pruAudioOutStart[1] = pruSharedRam + PRU_MEM_MCASP_OFFSET + audioOut.size() * sizeof(audioOut[0]);
		pruAudioInStart[0] = pruAudioOutStart[1] + audioOut.size() * sizeof(audioOut[0]);
		pruAudioInStart[1] = pruAudioInStart[0] + audioIn.size() * sizeof(audioIn[0]);
		pruDigitalStart[0] = pruSharedRam + PRU_MEM_DIGITAL_OFFSET;
		pruDigitalStart[1] = pruSharedRam + PRU_MEM_DIGITAL_OFFSET + MEM_DIGITAL_BUFFER1_OFFSET;
		if(context->analogFrames > 0)
		{
			prussdrv_map_prumem (pruNumber == 0 ? PRUSS0_PRU0_DATARAM : PRUSS0_PRU1_DATARAM, (void**)&pruDataRam);
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
			for(int i = 0; i < analogOut.size(); i++)
				pruAnalogOutStart[buffer][i] = 0;
			for(int i = 0; i < analogIn.size(); i++)
				pruAnalogInStart[buffer][i] = 0;
			for(int i = 0; i < audioOut.size(); i++)
				pruAudioOutStart[buffer][i] = 0;
			for(int i = 0; i < audioIn.size(); i++)
				pruAudioInStart[buffer][i] = 0;
			 // set digital to all inputs, to avoid unexpected spikes
			uint32_t* digitalUint32View = (uint32_t*)pruDigitalStart[buffer];
			for(int i = 0; i < digital.size(); i++)
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

// Offsets within CPU <-> PRU communication memory (4 byte slots)
#define PRU_SHOULD_STOP         0
#define PRU_CURRENT_BUFFER      1
#define PRU_BUFFER_MCASP_FRAMES 2
#define PRU_SHOULD_SYNC         3
#define PRU_SYNC_ADDRESS        4
#define PRU_SYNC_PIN_MASK       5
#define PRU_LED_ADDRESS         6
#define PRU_LED_PIN_MASK        7
#define PRU_FRAME_COUNT         8
#define PRU_USE_SPI             9
#define PRU_SPI_NUM_CHANNELS   10
#define PRU_USE_DIGITAL        11
#define PRU_PRU_NUMBER         12
#define PRU_MUX_CONFIG         13
#define PRU_MUX_END_CHANNEL    14
#define PRU_BUFFER_SPI_FRAMES  15

short int digitalPins[NUM_DIGITALS] = {
		GPIO_NO_BIT_0,
		GPIO_NO_BIT_1,
		GPIO_NO_BIT_2,
		GPIO_NO_BIT_3,
		GPIO_NO_BIT_4,
		GPIO_NO_BIT_5,
		GPIO_NO_BIT_6,
		GPIO_NO_BIT_7,
		GPIO_NO_BIT_8,
		GPIO_NO_BIT_9,
		GPIO_NO_BIT_10,
		GPIO_NO_BIT_11,
		GPIO_NO_BIT_12,
		GPIO_NO_BIT_13,
		GPIO_NO_BIT_14,
		GPIO_NO_BIT_15,
};

#define PRU_SAMPLE_INTERVAL_NS 11338	// 88200Hz per SPI sample = 11.338us

#define GPIO0_ADDRESS 		0x44E07000
#define GPIO1_ADDRESS 		0x4804C000
#define GPIO_SIZE			0x198
#define GPIO_CLEARDATAOUT 	(0x190 / 4)
#define GPIO_SETDATAOUT 	(0x194 / 4)

#define TEST_PIN_GPIO_BASE	GPIO0_ADDRESS	// Use GPIO0(31) for debugging
#define TEST_PIN_MASK		(1 << 31)
#define TEST_PIN2_MASK		(1 << 26)

#define USERLED3_GPIO_BASE  GPIO1_ADDRESS // GPIO1(24) is user LED 3
#define USERLED3_PIN_MASK   (1 << 24)

#define BELA_CAPE_BUTTON_PIN 115

const unsigned int PRU::kPruGPIODACSyncPin = 5;	// GPIO0(5); P9-17
const unsigned int PRU::kPruGPIOADCSyncPin = 48; // GPIO1(16); P9-15

const unsigned int PRU::kPruGPIOTestPin = 60;	// GPIO1(28); P9-12
const unsigned int PRU::kPruGPIOTestPin2 = 31;	// GPIO0(31); P9-13
const unsigned int PRU::kPruGPIOTestPin3 = 26;	// GPIO0(26); P8-14

// These four functions are written in assembly in FormatConvert.S
extern "C" {
	void int16_to_float_audio(int numSamples, int16_t *inBuffer, float *outBuffer);
	void int16_to_float_analog(int numSamples, uint16_t *inBuffer, float *outBuffer);
	void float_to_int16_audio(int numSamples, float *inBuffer, int16_t *outBuffer);
	void float_to_int16_analog(int numSamples, float *inBuffer, uint16_t *outBuffer);
}
// Constructor: specify a PRU number (0 or 1)
PRU::PRU(InternalBelaContext *input_context)
: context(input_context),
  pru_number(1),
  initialised(false),
  running(false),
  analog_enabled(false),
  digital_enabled(false), gpio_enabled(false), led_enabled(false),
  gpio_test_pin_enabled(false),
  pru_buffer_comm(0),
  audio_expander_input_history(0), audio_expander_output_history(0),
  audio_expander_filter_coeff(0)
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
				cout << "Warning: couldn't export DAC sync pin\n";
		}
		if(gpio_set_dir(kPruGPIODACSyncPin, OUTPUT_PIN)) {
			if(gRTAudioVerbose)
				cout << "Couldn't set direction on DAC sync pin\n";
			return -1;
		}
		if(gpio_set_value(kPruGPIODACSyncPin, HIGH)) {
			if(gRTAudioVerbose)
				cout << "Couldn't set value on DAC sync pin\n";
			return -1;
		}

		// Prepare ADC CS/ pin: output, high to begin
		if(gpio_export(kPruGPIOADCSyncPin)) {
			if(gRTAudioVerbose)
				cout << "Warning: couldn't export ADC sync pin\n";
		}
		if(gpio_set_dir(kPruGPIOADCSyncPin, OUTPUT_PIN)) {
			if(gRTAudioVerbose)
				cout << "Couldn't set direction on ADC sync pin\n";
			return -1;
		}
		if(gpio_set_value(kPruGPIOADCSyncPin, HIGH)) {
			if(gRTAudioVerbose)
				cout << "Couldn't set value on ADC sync pin\n";
			return -1;
		}

		analog_enabled = true;
	}

	if(context->digitalFrames != 0){
		for(unsigned int i = 0; i < context->digitalChannels; i++){
			if(gpio_export(digitalPins[i])) {
				if(gRTAudioVerbose)
					cerr << "Warning: couldn't export digital GPIO pin " << digitalPins[i] << "\n"; // this is left as a warning because if the pin has been exported by somebody else, can still be used
			}
			if(gpio_set_dir(digitalPins[i], INPUT_PIN)) {
				if(gRTAudioVerbose)
					cerr << "Error: Couldn't set direction on digital GPIO pin " << digitalPins[i] << "\n";
				return -1;
			}
		}
		digital_enabled = true;
	}

	if(include_led) {
		// Turn off system function for LED3 so it can be reused by PRU
		led_set_trigger(3, "none");
		led_enabled = true;
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
			gpio_unexport(digitalPins[i]);
		}
	}
	if(gpio_test_pin_enabled) {
		gpio_unexport(kPruGPIOTestPin);
		gpio_unexport(kPruGPIOTestPin2);
		gpio_unexport(kPruGPIOTestPin3);
	}
	if(led_enabled) {
		// Set LED back to default eMMC status
		// TODO: make it go back to its actual value before this program,
		// rather than the system default
		led_set_trigger(3, "mmc1");
	}
	gpio_enabled = gpio_test_pin_enabled = false;
}

// Initialise and open the PRU
int PRU::initialise(int pru_num, bool uniformSampleRate, int mux_channels, bool capeButtonMonitoring)
{
	if(context->analogInChannels != context->analogOutChannels){
		fprintf(stderr, "Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
		return 1;
	}
	hardware_analog_frames = context->analogFrames;

	if(!gpio_enabled) {
		fprintf(stderr, "PRU::initialise() called before GPIO enabled\n");
		return 1;
	}

	pru_number = pru_num;

	/* Allocate and initialize memory */
	prussdrv_init();
	if(prussdrv_open(PRU_EVTOUT_0)) {
		fprintf(stderr, "Failed to open PRU driver\n");
		return 1;
	}
	pruMemory = new PruMemory(pru_number, context);

#ifdef CTAG_FACE_8CH
//TODO :  check that this ifdef block is not needed
	//pru_buffer_audio_adc = &pru_buffer_audio_dac[16 * context->audioFrames];
#elif defined(CTAG_BEAST_16CH)
	//pru_buffer_audio_adc = &pru_buffer_audio_dac[32 * context->audioFrames];
#else
	//pru_buffer_audio_adc = &pru_buffer_audio_dac[4 * context->audioFrames];
#endif

	if(capeButtonMonitoring){
		belaCapeButton.open(BELA_CAPE_BUTTON_PIN, INPUT, false);
	}

	// after setting all PRU settings, we adjust
	// the "software" sampling rate with appropriate
	// allowing for "resampling" as/if required
	uniform_sample_rate = uniformSampleRate;
	if(uniform_sample_rate)
	{
		if(context->analogInChannels != context->analogOutChannels)
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
	context->audioOut = (float *)malloc(context->audioOutChannels * context->audioFrames * sizeof(float));
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
		context->analogOut = (float *)malloc(context->analogOutChannels * context->analogFrames * sizeof(float));
		last_analog_out_frame = (float *)malloc(context->analogOutChannels * sizeof(float));

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

#ifdef PRU_USES_MCASP_IRQ
static int devMemWrite(off_t target, uint32_t* value)
{
	const unsigned long MAP_SIZE = 4096UL;
	const unsigned long MAP_MASK = (MAP_SIZE - 1);
	int fd;
	void *map_base, *virt_addr;
	uint32_t writeval = *value;

	if((fd = open("/dev/mem", O_RDWR | O_SYNC)) == -1) // NOWRAP
	{
		fprintf(stderr, "Unable to open /dev/mem: %d %s\n", fd, strerror(-fd));
		return -1;
	}
	map_base = mmap(0, MAP_SIZE, PROT_READ | PROT_WRITE, MAP_SHARED, fd, target & ~MAP_MASK); // NOWRAP
	if(map_base == (void *) -1)
	{
		fprintf(stderr, "Unable to mmap %ld\n", target);
		return -1;
	}

	virt_addr = ((char*)map_base) + (target & MAP_MASK);
	// writes 4-byte word (unsigned long)
	*((unsigned long *) virt_addr) = writeval;
	uint32_t read_result = *((unsigned long *) virt_addr);
	*value = read_result;
	if(munmap(map_base, MAP_SIZE) == -1)
	{
		fprintf(stderr, "Error while unmapping memory\n");
	}
	close(fd);
	return 0;
}

static int maskMcAspInterrupt()
{
	off_t address = 0x482000cc;
	uint32_t value = 0x30000;
	int ret = devMemWrite(address, &value);
	if(ret < 0)
	{
		return -1;
	} else
		return 0;
}
#endif /* PRU_USES_MCASP_IRQ */

void PRU::initialisePruCommon()
{
    /* Set up flags */
	pru_buffer_comm[PRU_SHOULD_STOP] = 0;
	pru_buffer_comm[PRU_CURRENT_BUFFER] = 0;
	unsigned int pruFrames;
	if(analog_enabled)
		pruFrames = hardware_analog_frames;
	else
		pruFrames = context->audioFrames / 2; // PRU assumes 8 "fake" channels when SPI is disabled
	pru_buffer_comm[PRU_BUFFER_SPI_FRAMES] = pruFrames;
#ifdef CTAG_FACE_8CH
//TODO :  factor out the number of channels
	pruFrames *= 4;
#elif defined(CTAG_BEAST_16CH)
	pruFrames *= 8;
#endif
	pru_buffer_comm[PRU_BUFFER_MCASP_FRAMES] = pruFrames;
	pru_buffer_comm[PRU_SHOULD_SYNC] = 0;
	pru_buffer_comm[PRU_SYNC_ADDRESS] = 0;
	pru_buffer_comm[PRU_SYNC_PIN_MASK] = 0;
	pru_buffer_comm[PRU_PRU_NUMBER] = pru_number;


	/* Set up multiplexer info */
	if(context->multiplexerChannels == 2) {
		pru_buffer_comm[PRU_MUX_CONFIG] = 1;
	}
	else if(context->multiplexerChannels == 4) {
		pru_buffer_comm[PRU_MUX_CONFIG] = 2;
	}
	else if(context->multiplexerChannels == 8) {
		pru_buffer_comm[PRU_MUX_CONFIG] = 3;
	}
	else { 
		// we trust that the number of multiplexer channels has been
		// checked elsewhere
		pru_buffer_comm[PRU_MUX_CONFIG] = 0;
	}
	
	if(led_enabled) {
		pru_buffer_comm[PRU_LED_ADDRESS] = USERLED3_GPIO_BASE;
		pru_buffer_comm[PRU_LED_PIN_MASK] = USERLED3_PIN_MASK;
	}
	else {
		pru_buffer_comm[PRU_LED_ADDRESS] = 0;
		pru_buffer_comm[PRU_LED_PIN_MASK] = 0;
	}
	if(analog_enabled) {
		pru_buffer_comm[PRU_USE_SPI] = 1;
		// TODO : a different number of channels for inputs and outputs
		// is not yet supported
		unsigned int analogChannels = context->analogInChannels;
		pru_buffer_comm[PRU_SPI_NUM_CHANNELS] = analogChannels;
	} else {
		pru_buffer_comm[PRU_USE_SPI] = 0;
		pru_buffer_comm[PRU_SPI_NUM_CHANNELS] = 0;
	}
	if(digital_enabled) {
		pru_buffer_comm[PRU_USE_DIGITAL] = 1;
	}
	else {
		pru_buffer_comm[PRU_USE_DIGITAL] = 0;
	}
}

// Run the code image in the specified file
int PRU::start(char * const filename)
{
#ifdef PRU_USES_MCASP_IRQ
	/* The PRU will enable the McASP interrupts. Here we mask
	 * them out from ARM so that they do not hang the CPU. */
	if(maskMcAspInterrupt() < 0)
	{
		fprintf(stderr, "Error: failed to disable the McASP interrupt\n");
		return 1;
	}
	#warning TODO: unmask interrupt when program stops
#endif

#ifdef BELA_USE_RTDM
	// Open RTDM driver
	// NOTE: if this is moved later on, (e.g.: at the beginning of loop())
	// it will often hang the system (especially for small blocksizes).
	// Not sure why this would happen, perhaps a race condition between the PRU
	// and the rtdm_driver?
	if ((rtdm_fd = __wrap_open(rtdm_driver, O_RDWR)) < 0) {
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
#endif

	pru_buffer_comm = pruMemory->getPruBufferComm();
	initialisePruCommon();

#ifdef PRU_USES_MCASP_IRQ
	const unsigned int* pruCode = IrqPruCode::getBinary();
	const unsigned int pruCodeSize = IrqPruCode::getBinarySize();
#else /* PRU_USES_MCASP_IRQ */
	const unsigned int* pruCode = NonIrqPruCode::getBinary();
	const unsigned int pruCodeSize = NonIrqPruCode::getBinarySize();
#endif /* PRU_USES_MCASP_IRQ */

	/* Load and execute binary on PRU */
	if(filename[0] == '\0') { //if the string is empty, load the embedded code
		if(gRTAudioVerbose)
			printf("Using embedded PRU code\n");
		if(prussdrv_exec_code(pru_number, pruCode, pruCodeSize)) {
			fprintf(stderr, "Failed to execute PRU code\n");
			return 1;
		}
	} else {
		if(gRTAudioVerbose)
			printf("Using PRU code from %s\n",filename);
		if(prussdrv_exec_program(pru_number, filename)) {
			fprintf(stderr, "Failed to execute PRU code from %s\n", filename);
			return 1;
		}
	}

	running = true;
	return 0;
}

// Main loop to read and write data from/to PRU
void PRU::loop(void *userData, void(*render)(BelaContext*, void*), bool highPerformanceMode)
{

	// these pointers will be constant throughout the lifetime of pruMemory
	uint16_t* analogInRaw = pruMemory->getAnalogInPtr();
	uint16_t* analogOutRaw = pruMemory->getAnalogOutPtr();
	int16_t* audioInRaw = pruMemory->getAudioInPtr();
	int16_t* audioOutRaw = pruMemory->getAudioOutPtr();
	if(context->analogInChannels != context->analogOutChannels){
		fprintf(stderr, "Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
		return;
	}
	// Polling interval is 1/4 of the period
#ifdef CTAG_FACE_8CH
	time_ns_t sleepTime = PRU_SAMPLE_INTERVAL_NS * (2) * context->audioFrames / 4;
#elif defined(CTAG_BEAST_16CH)
	time_ns_t sleepTime = PRU_SAMPLE_INTERVAL_NS * (2) * context->audioFrames / 4;
#else
	time_ns_t sleepTime = PRU_SAMPLE_INTERVAL_NS * (context->audioInChannels) * context->audioFrames / 4;
#endif
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
	while(!gShouldStop) {

#ifdef BELA_USE_POLL
		// Which buffer the PRU was last processing
		static uint32_t lastPRUBuffer = 0;
		// Poll
		while(pru_buffer_comm[PRU_CURRENT_BUFFER] == lastPRUBuffer && !gShouldStop) {
			task_sleep_ns(sleepTime);
		}

		lastPRUBuffer = pru_buffer_comm[PRU_CURRENT_BUFFER];
#endif
#ifdef BELA_USE_RTDM
		// make sure we always sleep a tiny bit to prevent hanging the board
		if(!highPerformanceMode) // unless the user requested us not to.
			task_sleep_ns(sleepTime / 2);
		int ret = __wrap_read(rtdm_fd, NULL, 0);
		if(ret < 0)
		{
			static int interruptTimeoutCount = 0;
			++interruptTimeoutCount;
			rt_fprintf(stderr, "PRU interrupt timeout, %d %d %s\n", ret, errno, strerror(errno));
			if(interruptTimeoutCount >= 5)
			{
				fprintf(stderr, "The PRU stopped responding. Is the light still blinking? It would be very helpful if you could send the output of the `dmesg` command to the developers to help track down the issue. Quitting.\n");
				exit(1); // Quitting abruptly, purposedly skipping the cleanup so that we can inspect the PRU with prudebug.
			}
			task_sleep_ns(100000000);
		}
#endif

		if(belaCapeButton.enabled()){
			static int belaCapeButtonCount = 0;
			if(belaCapeButton.read() == 0){
				if(++belaCapeButtonCount > 10){
					printf("Button pressed, quitting\n");
					gShouldStop = true;
				}
			} else {
				belaCapeButtonCount = 0;
			}
		}

		if(gShouldStop)
			break;

		// pru_buffer_comm[PRU_CURRENT_BUFFER] will have been set by
		// the PRU just before signalling ARM. We use buffer that is
		// not in use by the PRU
		int pruBufferForArm = pru_buffer_comm[PRU_CURRENT_BUFFER] == 0 ? 1 : 0;
		pruMemory->copyFromPru(pruBufferForArm);

		// Convert short (16-bit) samples to float
#ifdef USE_NEON_FORMAT_CONVERSION
		int16_to_float_audio(2 * context->audioFrames, audio_adc_pru_buffer, context->audioIn);
		// TODO: implement non-interlaved
#else
		int audioInChannels = context->audioInChannels;
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
		
		if(analog_enabled) {
			if(context->multiplexerChannels != 0) {
				// If multiplexer is enabled, find out which channels we have by pulling out
				// the place that it ended. Based on the buffer size, we can work out the
				// mux setting for the beginning of the buffer.
				int pruMuxReference = pru_buffer_comm[PRU_MUX_END_CHANNEL];
			
				
				// Value from the PRU is ahead by 1 + (frame size % 8); correct that when unrolling here.
				int multiplexerChannelLastFrame = (pruMuxReference - 1 - (context->analogFrames % 8) + context->multiplexerChannels) 
													% context->multiplexerChannels;
				
				// Add 1, wrapping around, to get the starting channel		
				context->multiplexerStartingChannel = (multiplexerChannelLastFrame + 1) % context->multiplexerChannels;
				
				// Write the inputs to the buffer of multiplexed samples
				if(context->multiplexerAnalogIn != 0) {
					unsigned int muxChannelCount = 0;
					int multiplexerChannel = multiplexerChannelLastFrame;

					for(int n = context->analogFrames - 1; n >= 0; n--) {
						for(unsigned int ch = 0; ch < context->analogInChannels; ch++) {
							context->multiplexerAnalogIn[multiplexerChannel * context->analogInChannels + ch] =
								context->analogIn[n * context->analogInChannels + ch];
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
#ifdef BELA_MODULAR // invert input and account for a maximum input of 3.3V
			const float analogInMax = 0.81f;
			for(unsigned int n = 0; n < context->analogInChannels * context->analogFrames; ++n)
			{
				context->analogIn[n] = 1 - context->analogIn[n] / analogInMax;
				// clip it to avoid reading out of range values
				if(context->analogIn[n] > 1)
					context->analogIn[n] = 1;
			}
#endif /* BELA_MODULAR */
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

			for(unsigned int n = 0; n < context->digitalFrames; ++n){
				uint16_t inputs = last_digital_buffer[n] & 0xffff; // half-word, has 1 for inputs and 0 for outputs

				uint16_t outputs = ~inputs; // half-word has 1 for outputs and 0 for inputs;
				context->digital[n] = (last_digital_buffer[context->digitalFrames - 1] & (outputs << 16)) | // keep output values set in the last frame of the previous buffer
#ifdef BELA_MODULAR // invert inputs
									   (~context->digital[n] & (inputs << 16))   | // inputs from current context->digital[n];
#else /* BELA_MODULAR */
									   (context->digital[n] & (inputs << 16))   | // inputs from current context->digital[n];
#endif /* BELA_MODULAR */
									   (last_digital_buffer[n] & (inputs));     // keep pin configuration from previous context->digital[n]
//                    context->digital[n]=digitalBufferTemp[n]; //ignores inputs
			}
		}

		// Call user render function
		// ***********************
		(*render)((BelaContext *)context, userData);
		// ***********************

		if(analog_enabled) {
#ifdef BELA_MODULAR // invert output
			for(unsigned int n = 0; n < context->analogOutChannels * context->analogFrames; n++)
			{
				// also rescale it to avoid
				// headroom problem on the analog outputs with a sagging
				// 5V USB supply
				const float analogOutMax = 0.93;
				context->analogOut[n] = (1.f - context->analogOut[n]) * analogOutMax;
			}
#endif /* BELA_MODULAR */
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
			static uint32_t pruFramesPerBlock = hardware_analog_frames ? hardware_analog_frames : context->audioFrames / 2;
			// read the PRU counter
			uint32_t pruFrameCount = pru_buffer_comm[PRU_FRAME_COUNT];
			// we initialize lastPruFrameCount the first time we get here,
			// just in case the PRU is already ahead of us
			static uint32_t lastPruFrameCount = pruFrameCount - pruFramesPerBlock;
#ifdef CTAG_FACE_8CH
//TODO :  factor out the number of channels
			uint32_t expectedFrameCount = lastPruFrameCount + pruFramesPerBlock * 4;
#elif defined(CTAG_BEAST_16CH)
			uint32_t expectedFrameCount = lastPruFrameCount + pruFramesPerBlock * 8;
#else
			uint32_t expectedFrameCount = lastPruFrameCount + pruFramesPerBlock;
#endif
			if(pruFrameCount > expectedFrameCount)
			{
				// don't print a warning if we are stopping
				if(!gShouldStop)
					rt_fprintf(stderr, "Underrun detected: %u blocks dropped\n", (pruFrameCount - expectedFrameCount) / pruFramesPerBlock);
			}
			lastPruFrameCount = pruFrameCount;
		}

		// Increment total number of samples that have elapsed.
		context->audioFramesElapsed += context->audioFrames;

	}

#if defined(BELA_USE_RTDM)
        __wrap_close(rtdm_fd);
#endif

	// Tell PRU to stop
	pru_buffer_comm[PRU_SHOULD_STOP] = 1;

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
#ifdef BELA_USE_POLL
	// nothing to wait for
#endif
#ifdef BELA_USE_RTDM
	int value;
	read(rtdm_fd, &value, sizeof(value));
#endif
	return;
}

// Turn off the PRU when done
void PRU::disable()
{
    /* Disable PRU and close memory mapping*/
    prussdrv_pru_disable(pru_number);
	running = false;
}

// Exit the prussdrv subsystem (affects both PRUs)
void PRU::exitPRUSS()
{
	if(initialised)
	    prussdrv_exit();
	initialised = false;
}

