#pragma once

#include <stdint.h>
#include "Bela.h"
#include "Gpio.h"
#include "PruManager.h"
#include "InternalBelaContext.h"
struct McaspRegisters;

class PruMemory;
class PRU
{
private:
	static const unsigned int kPruGPIODACSyncPin;
	static const unsigned int kPruGPIOADCSyncPin;

public:
	// Constructor
	PRU(InternalBelaContext *input_context);

	// Destructor
	~PRU();

	// Prepare the GPIO pins needed for the PRU
	int prepareGPIO(int include_led);

	// Clean up the GPIO at the end
	void cleanupGPIO();

	// Initialise and open the PRU
	int initialise(BelaHw newBelaHw, int pru_num, bool uniformSampleRate,
				   int mux_channels,
				   int stopButtonPin, bool enableLed,
				   uint32_t disabledBelaDigitalChannels);

	// Run the code image in pru_rtaudio_bin.h
	int start(const char * const filename, const McaspRegisters& mcaspRegisters);

	// Loop: read and write data from the PRU and call the user-defined audio callback
	void loop(void *userData, void(*render)(BelaContext*, void*), bool highPerformanceMode, BelaCpuData* cpuData);

	void cleanup();
	// Wait for an interrupt from the PRU indicate it is finished
	void waitForFinish();

	// Turn off the PRU when done
	void disable();

	// Exit the whole PRU subsystem
	void exitPRUSS();
	PruManager *pruManager;

private:
	void initialisePruCommon(const McaspRegisters& mcaspRegisters);
	int testPruError();
	InternalBelaContext *context;	// Overall settings

	int pru_number;		// Which PRU we use
	bool initialised;	// Whether the prussdrv system is initialised
	bool running;		// Whether the PRU is running
	bool analog_enabled;  // Whether SPI ADC and DAC are used
	bool digital_enabled; // Whether digital is used
	float analogs_per_audio; // How many analog frames per each audio frame
	bool uniform_sample_rate; // Should the sampling rate of the analog and audio forced to be the same, as far as ARM is concerned
	int hardware_analog_frames; // The actual number of frames for the analog channels, as far as the PRU is concerned
	bool led_enabled;	// Whether a user LED is enabled
	bool analog_out_is_audio;
	size_t pru_audio_out_channels;

	PruMemory* pruMemory;
	volatile uint32_t *pru_buffer_comm;
	uint32_t pruBufferMcaspFrames;

	float *last_analog_out_frame;
	uint32_t *last_digital_buffer;
	float *audio_expander_input_history;
	float *audio_expander_output_history;
	float audio_expander_filter_coeff;
	bool pruUsesMcaspIrq;
	BelaHw belaHw;

	Gpio stopButton; // Monitoring the bela cape button
	Gpio underrunLed; // Flashing an LED upon underrun
	Gpio adcNrstPin; // Resetting the ADC on Bela Mini Rev C
	uint32_t disabledDigitalChannels;
};
