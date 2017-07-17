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
#include "../include/prussdrv.h"
#include "../include/pruss_intc_mapping.h"
#include "../include/digital_gpio_mapping.h"
#include "../include/GPIOcontrol.h"
#include "../include/Bela.h"
#include "../include/pru_rtaudio_bin.h"
#include "../include/Utilities.h"

#include <iostream>
#include <stdlib.h>
#include <cstdio>
#include <cerrno>
#include <cmath>
#include <fcntl.h>
#include <sys/mman.h>
#include <unistd.h>

// Xenomai-specific includes
#include <sys/mman.h>
#include <native/task.h>
#include <native/timer.h>
#include <rtdk.h>

using namespace std;

// Select whether to use NEON-based sample conversion
// (this will probably go away in a future commit once its performance
//  is verified over extended use)
#undef USE_NEON_FORMAT_CONVERSION

// PRU memory: PRU0 and PRU1 RAM are 8kB (0x2000) long each
//             PRU-SHARED RAM is 12kB (0x3000) long

#define PRU_MEM_MCASP_OFFSET 0x2000  // Offset within PRU-SHARED RAM
#define PRU_MEM_MCASP_LENGTH 0x1000  // Length of McASP memory, in bytes
#define PRU_MEM_DAC_OFFSET 0x0     // Offset within PRU0 RAM
#define PRU_MEM_DAC_LENGTH 0x2000  // Length of ADC+DAC memory, in bytes
#define PRU_MEM_COMM_OFFSET 0x0    // Offset within PRU-SHARED RAM
#define PRU_MEM_DIGITAL_OFFSET 0x1000 //Offset within PRU-SHARED RAM
#define MEM_DIGITAL_BUFFER1_OFFSET 0x400 //Start pointer to DIGITAL_BUFFER1, which is 256 words.
											// 256 is the maximum number of frames allowed

// Offsets within CPU <-> PRU communication memory (4 byte slots)
#define PRU_SHOULD_STOP 	0
#define PRU_CURRENT_BUFFER  1
#define PRU_BUFFER_FRAMES   2
#define PRU_SHOULD_SYNC     3
#define PRU_SYNC_ADDRESS    4
#define PRU_SYNC_PIN_MASK   5
#define PRU_LED_ADDRESS	     6
#define PRU_LED_PIN_MASK     7
#define PRU_FRAME_COUNT      8
#define PRU_USE_SPI          9
#define PRU_SPI_NUM_CHANNELS 10
#define PRU_USE_DIGITAL      11
#define PRU_PRU_NUMBER       12
#define PRU_MUX_CONFIG       13
#define PRU_MUX_END_CHANNEL  14

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

extern int gRTAudioVerbose;

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
  pru_buffer_comm(0), pru_buffer_spi_dac(0), pru_buffer_spi_adc(0),
  pru_buffer_digital(0), pru_buffer_audio_dac(0), pru_buffer_audio_adc(0),
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
	hardware_analog_sample_rate = context->analogSampleRate;
	hardware_analog_frames = context->analogFrames;
	uint32_t *pruMem = 0;

	if(!gpio_enabled) {
		rt_printf("initialise() called before GPIO enabled\n");
		return 1;
	}

	pru_number = pru_num;

    /* Initialize structure used by prussdrv_pruintc_intc   */
    /* PRUSS_INTC_INITDATA is found in pruss_intc_mapping.h */
    tpruss_intc_initdata pruss_intc_initdata = PRUSS_INTC_INITDATA;

    /* Allocate and initialize memory */
    prussdrv_init();
    if(prussdrv_open(PRU_EVTOUT_0)) {
    	rt_printf("Failed to open PRU driver\n");
    	return 1;
    }

    /* Map PRU's INTC */
    prussdrv_pruintc_init(&pruss_intc_initdata);

    /* Map PRU memory to pointers */
	prussdrv_map_prumem (PRUSS0_SHARED_DATARAM, (void **)&pruMem);
    pru_buffer_comm = (uint32_t *)&pruMem[PRU_MEM_COMM_OFFSET/sizeof(uint32_t)];
	pru_buffer_audio_dac = (int16_t *)&pruMem[PRU_MEM_MCASP_OFFSET/sizeof(uint32_t)];

	/* ADC memory starts 2(ch)*2(buffers)*bufsize samples later */
	pru_buffer_audio_adc = &pru_buffer_audio_dac[4 * context->audioFrames];

	if(analog_enabled) {
		prussdrv_map_prumem (pru_number == 0 ? PRUSS0_PRU0_DATARAM : PRUSS0_PRU1_DATARAM, (void **)&pruMem);
		pru_buffer_spi_dac = (uint16_t *)&pruMem[PRU_MEM_DAC_OFFSET/sizeof(uint32_t)];

		/* ADC memory starts after N(ch)*2(buffers)*bufsize samples */
		pru_buffer_spi_adc = &pru_buffer_spi_dac[2 * context->analogInChannels * hardware_analog_frames];
	}
	else {
		pru_buffer_spi_dac = pru_buffer_spi_adc = 0;
	}

	if(digital_enabled) {
		prussdrv_map_prumem (PRUSS0_SHARED_DATARAM, (void **)&pruMem);
		pru_buffer_digital = (uint32_t *)&pruMem[PRU_MEM_DIGITAL_OFFSET/sizeof(uint32_t)];
	}
	else {
		pru_buffer_digital = 0;
	}

    /* Set up flags */
    pru_buffer_comm[PRU_SHOULD_STOP] = 0;
    pru_buffer_comm[PRU_CURRENT_BUFFER] = 0;
    unsigned int pruFrames;
    if(analog_enabled)
        pruFrames = hardware_analog_frames;
    else
        pruFrames = context->audioFrames / 2; // PRU assumes 8 "fake" channels when SPI is disabled
    pru_buffer_comm[PRU_BUFFER_FRAMES] = pruFrames;
    pru_buffer_comm[PRU_SHOULD_SYNC] = 0;
    pru_buffer_comm[PRU_SYNC_ADDRESS] = 0;
    pru_buffer_comm[PRU_SYNC_PIN_MASK] = 0;
    pru_buffer_comm[PRU_PRU_NUMBER] = pru_number;
	

	/* Set up multiplexer info */
	if(mux_channels == 2) {
		pru_buffer_comm[PRU_MUX_CONFIG] = 1;
		context->multiplexerChannels = 2;
	}
	else if(mux_channels == 4) {
		pru_buffer_comm[PRU_MUX_CONFIG] = 2;
		context->multiplexerChannels = 4;
	}
	else if(mux_channels == 8) {
		pru_buffer_comm[PRU_MUX_CONFIG] = 3;
		context->multiplexerChannels = 8;
	}
	else if(mux_channels == 0) {
		pru_buffer_comm[PRU_MUX_CONFIG] = 0;
		context->multiplexerChannels = 0;
	}
	else {
		rt_printf("Error: %d is not a valid number of multiplexer channels (options: 0 = off, 2, 4, 8).\n", mux_channels);
		return 1;
	}
	
	/* Multiplexer only works with 8 analog channels. (It could be made to work with 4, with updates to the PRU code.) */
	if(context->multiplexerChannels != 0 && context->analogInChannels != 8) {
		rt_printf("Error: multiplexer capelet can only be used with 8 analog channels.\n");
		return 1;
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
    	if(context->analogInChannels != context->analogOutChannels){
    		printf("Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
    		return 1;
    	}
    	unsigned int analogChannels = context->analogInChannels;
    	pru_buffer_comm[PRU_SPI_NUM_CHANNELS] = analogChannels;
    }
    else {
    	pru_buffer_comm[PRU_USE_SPI] = 0;
    	pru_buffer_comm[PRU_SPI_NUM_CHANNELS] = 0;
    }
    if(digital_enabled) {
    	pru_buffer_comm[PRU_USE_DIGITAL] = 1;
//TODO: add mask
    }
    else {
    	pru_buffer_comm[PRU_USE_DIGITAL] = 0;

    }

    /* Clear ADC and DAC memory.*/
    //TODO: this initialisation should only address the memory effectively used by these buffers, i.e.:depend on the number of frames
    //  (otherwise might cause issues if we move memory locations later on)
    if(analog_enabled) {
		for(int i = 0; i < PRU_MEM_DAC_LENGTH / 2; i++)
			pru_buffer_spi_dac[i] = 0;
    }
	if(digital_enabled){
		for(int i = 0; i < PRU_MEM_DIGITAL_OFFSET*2; i++)
			pru_buffer_digital[i] = 0x0000ffff; // set to all inputs, to avoid unexpected spikes
	}
	for(int i = 0; i < PRU_MEM_MCASP_LENGTH / 2; i++)
		pru_buffer_audio_dac[i] = 0;

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
			fprintf(stderr, "Unsupported number of analog channels\n", analogs_per_audio);
			return 1;
		}
		printf("Using %f analogs per audio\n", analogs_per_audio);
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
		printf("Error allocating audio input buffer\n");
		return 1;
	}
	if(posix_memalign((void **)&context->audioOut, 16, 2 * context->audioFrames * sizeof(float))) {
		printf("Error allocating audio output buffer\n");
		return 1;
	}
#else
	context->audioIn = (float *)malloc(2 * context->audioFrames * sizeof(float));
	context->audioOut = (float *)malloc(2 * context->audioFrames * sizeof(float));
	if(context->audioIn == 0 || context->audioOut == 0) {
		rt_printf("Error: couldn't allocate audio buffers\n");
		return 1;
	}
#endif
	
	// Allocate analog buffers
	if(analog_enabled) {
#ifdef USE_NEON_FORMAT_CONVERSION
		if(posix_memalign((void **)&context->analogIn, 16, 
							context->analogInChannels * context->analogFrames * sizeof(float))) {
			printf("Error allocating analog input buffer\n");
			return 1;
		}
		if(posix_memalign((void **)&context->analogOut, 16, 
							context->analogOutChannels * context->analogFrames * sizeof(float))) {
			printf("Error allocating analog output buffer\n");
			return 1;
		}
		last_analog_out_frame = (float *)malloc(context->analogOutChannels * sizeof(float));

		if(last_analog_out_frame == 0) {
			rt_printf("Error: couldn't allocate analog persistence buffer\n");
			return 1;
		}		
#else
		context->analogIn = (float *)malloc(context->analogInChannels * context->analogFrames * sizeof(float));
		context->analogOut = (float *)malloc(context->analogOutChannels * context->analogFrames * sizeof(float));
		last_analog_out_frame = (float *)malloc(context->analogOutChannels * sizeof(float));

		if(context->analogIn == 0 || context->analogOut == 0 || last_analog_out_frame == 0) {
			rt_printf("Error: couldn't allocate analog buffers\n");
			return 1;
		}
#endif
		
		memset(last_analog_out_frame, 0, context->analogOutChannels * sizeof(float));

		if(context->multiplexerChannels != 0) {
			// If mux enabled, allocate buffers and set initial values
			context->multiplexerStartingChannel = 0;
		
			// Buffer holds 1 frame of every mux setting for every analog in
			context->multiplexerAnalogIn = (float *)malloc(context->analogInChannels * context->multiplexerChannels * sizeof(float));
			if(context->multiplexerAnalogIn == 0) {
				rt_printf("Error: couldn't allocate audio buffers\n");
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
				rt_printf("Error: couldn't allocate audio expander history buffers\n");
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

	// Allocate digital buffers
	digital_buffer0 = pru_buffer_digital;
	digital_buffer1 = pru_buffer_digital + MEM_DIGITAL_BUFFER1_OFFSET / sizeof(uint32_t);
	if(digital_enabled) {
		last_digital_buffer = (uint32_t *)malloc(context->digitalFrames * sizeof(uint32_t)); //temp buffer to hold previous states
		if(last_digital_buffer == 0) {
			rt_printf("Error: couldn't allocate digital buffers\n");
			return 1;
		}

		for(unsigned int n = 0; n < context->digitalFrames; n++){
			// Initialize lastDigitalFrames to all inputs
			last_digital_buffer[n] = 0x0000ffff;
		}
	}

	context->digital = digital_buffer0;

	initialised = true;
	return 0;
}

// Run the code image in the specified file
int PRU::start(char * const filename)
{
	/* Clear any old interrupt */
	prussdrv_pru_clear_event(PRU_EVTOUT_0, PRU0_ARM_INTERRUPT);

	/* Load and execute binary on PRU */
	if(filename[0] == '\0') { //if the string is empty, load the embedded code
		if(gRTAudioVerbose)
			rt_printf("Using embedded PRU code\n");
		if(prussdrv_exec_code(pru_number, PRUcode, sizeof(PRUcode))) {
			rt_printf("Failed to execute PRU code\n");
			return 1;
		}
	} else {
		if(gRTAudioVerbose)
			rt_printf("Using PRU code from %s\n",filename);
		if(prussdrv_exec_program(pru_number, filename)) {
			rt_printf("Failed to execute PRU code from %s\n", filename);
			return 1;
		}
	}

    running = true;
    return 0;
}

// Main loop to read and write data from/to PRU
void PRU::loop(RT_INTR *pru_interrupt, void *userData)
{
#ifdef BELA_USE_XENOMAI_INTERRUPTS
	RTIME irqTimeout = PRU_SAMPLE_INTERVAL_NS * 1024;	// Timeout for PRU interrupt: about 10ms, much longer than any expected period
#else
	if(context->analogInChannels != context->analogOutChannels){
		printf("Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
		return;
	}
	// Polling interval is 1/4 of the period
	RTIME sleepTime = PRU_SAMPLE_INTERVAL_NS * (context->audioInChannels) * context->audioFrames / 4;
#endif

	uint32_t pru_audio_offset, pru_spi_offset;

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

	// TESTING
	// uint32_t testCount = 0;
	// RTIME startTime = rt_timer_read();

#ifdef BELA_USE_XENOMAI_INTERRUPTS
	int result;
#else
	// Which buffer the PRU was last processing
	uint32_t lastPRUBuffer = 0;
#endif


	bool interleaved = context->flags & BELA_FLAG_INTERLEAVED;
	while(!gShouldStop) {

#ifdef BELA_USE_XENOMAI_INTERRUPTS
		// Wait for PRU to move to change buffers;
		// PRU will send an interrupts which we wait for
		rt_intr_enable(pru_interrupt);
		while(!gShouldStop) {
			result = rt_intr_wait(pru_interrupt, irqTimeout);
			if(result >= 0)
				break;
			else if(result == -ETIMEDOUT)
				rt_printf("Warning: PRU timeout!\n");
			else {
				rt_printf("Error: wait for interrupt failed (%d)\n", result);
				gShouldStop = 1;
			}
		}

		// Clear pending PRU interrupt
		prussdrv_pru_clear_event(PRU_EVTOUT_1, PRU1_ARM_INTERRUPT);
#else
		// Poll
		while(pru_buffer_comm[PRU_CURRENT_BUFFER] == lastPRUBuffer && !gShouldStop) {
			rt_task_sleep(sleepTime);
		}

		lastPRUBuffer = pru_buffer_comm[PRU_CURRENT_BUFFER];
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

		// Check which buffer we're on-- will have been set right
		// before the interrupt was asserted
		if(pru_buffer_comm[PRU_CURRENT_BUFFER] == 1) {
			// PRU is on buffer 1. We read and write to buffer 0
			pru_audio_offset = 0;
			pru_spi_offset = 0;
			if(digital_enabled)
				context->digital = digital_buffer0;
		}
		else {
			// PRU is on buffer 0. We read and write to buffer 1
			if(context->audioInChannels != context->audioOutChannels){
				printf("Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
				return;
			}
			unsigned int audioChannels = context->audioInChannels;
			pru_audio_offset = context->audioFrames * audioChannels;
			if(context->analogInChannels != context->analogOutChannels){
				printf("Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
				return;
			}
	    	unsigned int analogChannels = context->analogInChannels;
			pru_spi_offset = hardware_analog_frames * analogChannels;
			if(digital_enabled)
				context->digital = digital_buffer1;
		}

		// FIXME: some sort of margin is needed here to prevent the audio
		// code from completely eating the Linux system
		// testCount++;
		//rt_task_sleep(sleepTime*4);
		//rt_task_sleep(sleepTime/4);

		int16_t* audio_adc_pru_buffer = pru_buffer_audio_adc + pru_audio_offset;
		// Convert short (16-bit) samples to float
#ifdef USE_NEON_FORMAT_CONVERSION
		int16_to_float_audio(2 * context->audioFrames, audio_adc_pru_buffer, context->audioIn);
		// TODO: implement non-interlaved
#else
		if(interleaved)
		{
			for(unsigned int n = 0; n < context->audioInChannels * context->audioFrames; n++) {
				context->audioIn[n] = (float)audio_adc_pru_buffer[n] / 32768.0f;
			}
		}
		else
		{
			for(unsigned int f = 0; f < context->audioFrames; ++f)
			{
				for(unsigned int c = 0; c < context->audioInChannels; ++c)
				{
					unsigned int srcIdx = f * context->audioInChannels + c;
					unsigned int dstIdx = c * context->audioFrames + f;
					float value = (float)audio_adc_pru_buffer[srcIdx] / 32768.0f;
					context->audioIn[dstIdx] = value;
				}
			}
		}
#endif
		
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
			
			uint16_t* adc_pru_buffer = pru_buffer_spi_adc + pru_spi_offset;
#ifdef USE_NEON_FORMAT_CONVERSION
			// TODO: add support for different analogs_per_audio ratios
			int16_to_float_analog(context->analogInChannels * context->analogFrames, 
									adc_pru_buffer, context->analogIn);
#else
			if(uniform_sample_rate && analogs_per_audio == 0.5)
			{
				int channels = context->analogInChannels;
				unsigned int frames = hardware_analog_frames;
				if(interleaved)
				{
					for(unsigned int f = 0; f < frames; ++f)
					{
						for(unsigned int c = 0; c < channels; ++c)
						{
							float value = (float)adc_pru_buffer[f * channels + c] / 65536.0f;
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
							float value = (float)adc_pru_buffer[srcIdx] / 65536.0f;
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
						float value = (float)adc_pru_buffer[n] / 65536.0f;
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
							float value = (float)adc_pru_buffer[srcIdx] / 65536.0f;
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
							float value = (float)adc_pru_buffer[f * channels + c] / 65536.0f;
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
							float value = (float)adc_pru_buffer[srcIdx] / 65536.0f;
							context->analogIn[dstIdx] = value;
						}
					}
				}
			}
	#endif
			
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

			for(unsigned int n = 0; n < context->digitalFrames; n++){
				uint16_t inputs = last_digital_buffer[n] & 0xffff; // half-word, has 1 for inputs and 0 for outputs

				uint16_t outputs = ~inputs; // half-word has 1 for outputs and 0 for inputs;
				context->digital[n] = (last_digital_buffer[context->digitalFrames - 1] & (outputs << 16)) | // keep output values set in the last frame of the previous buffer
									   (context->digital[n] & (inputs << 16))   | // inputs from current context->digital[n];
									   (last_digital_buffer[n] & (inputs));     // keep pin configuration from previous context->digital[n]
//                    context->digital[n]=digitalBufferTemp[n]; //ignores inputs
			}
		}

		// Call user render function
        // ***********************
		render((BelaContext *)context, userData);
		// ***********************

		if(analog_enabled) {
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
			uint16_t* dac_pru_buffer = pru_buffer_spi_dac + pru_spi_offset;
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
							dac_pru_buffer[f * channels + c] = (uint16_t)out;
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
							dac_pru_buffer[dstIdx] = (uint16_t)out;
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
						dac_pru_buffer[n] = (uint16_t)out;
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
							dac_pru_buffer[dstIdx] = (uint16_t)out;
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
							dac_pru_buffer[firstFrame] = (uint16_t)out;
							dac_pru_buffer[firstFrame + channels] = (uint16_t)out;
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
							dac_pru_buffer[dstIdx] = (uint16_t)out;
							dac_pru_buffer[dstIdx + channels] = (uint16_t)out;
						}
					}
				}
			}
#endif
		}

		if(digital_enabled) { // keep track of past digital values
			for(unsigned int n = 0; n < context->digitalFrames; n++){
				last_digital_buffer[n] = context->digital[n];
			}
		}

        // Convert float back to short for audio
		int16_t* audio_dac_pru_buffer = pru_buffer_audio_dac + pru_audio_offset;
#ifdef USE_NEON_FORMAT_CONVERSION
		float_to_int16_audio(2 * context->audioFrames, context->audioOut, audio_dac_pru_buffer);
#else	
		if(interleaved)
		{
			for(unsigned int n = 0; n < context->audioOutChannels * context->audioFrames; n++) {
				int out = context->audioOut[n] * 32768.0f;
				if(out < -32768) out = -32768;
				else if(out > 32767) out = 32767;
				audio_dac_pru_buffer[n] = (int16_t)out;
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
					audio_dac_pru_buffer[dstIdx] = (int16_t)out;
				}
			}
		}
#endif

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
			uint32_t expectedFrameCount = lastPruFrameCount + pruFramesPerBlock;
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

#ifdef BELA_USE_XENOMAI_INTERRUPTS
	// Turn off the interrupt for the PRU if it isn't already off
	rt_intr_disable(pru_interrupt);
#endif

	// Tell PRU to stop
	pru_buffer_comm[PRU_SHOULD_STOP] = 1;

	// Wait two buffer lengths for the PRU to finish
	rt_task_sleep(PRU_SAMPLE_INTERVAL_NS * context->analogFrames * 4 * 2);

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
    prussdrv_pru_wait_event (PRU_EVTOUT_0);
	prussdrv_pru_clear_event(PRU_EVTOUT_0, PRU0_ARM_INTERRUPT);
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

