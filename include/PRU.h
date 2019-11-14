/*
 * PRU.h
 *
 *  Created on: May 27, 2014
 *      Author: andrewm
 */

#ifndef PRU_H_
#define PRU_H_

#include <stdint.h>
#include "Bela.h"
#include "Gpio.h"
#include "AudioCodec.h"

/**
 * Internal version of the BelaContext struct which does not have const
 * elements, so it can be modified by the code. When it's passed to the user
 * code, it is typecast to the standard BelaContext.
 *
 * Important: make sure this retains the same structure as BelaContext!
 */
typedef struct {
	/// \brief Buffer holding audio input samples
	///
	/// This buffer may be in either interleaved or non-interleaved format,
	/// depending on the contents of the BelaInitSettings structure.
	/// \b Note: this element is available in render() only.
	float *audioIn;

	/// \brief Buffer holding audio output samples
	///
	/// This buffer may be in either interleaved or non-interleaved format,
	/// depending on the contents of the BelaInitSettings structure.
	/// \b Note: this element is available in render() only.
	float *audioOut;

	/// \brief Buffer holding analog input samples
	///
	/// This buffer may be in either interleaved or non-interleaved format,
	/// depending on the contents of the BelaInitSettings structure.
	/// \b Note: this element is available in render() only.
	float *analogIn;

	/// \brief Buffer holding analog output samples
	///
	/// This buffer may be in either interleaved or non-interleaved format,
	/// depending on the contents of the BelaInitSettings structure.
	/// \b Note: this element is available in render() only.
	float *analogOut;

	/// \brief Buffer holding digital input/output samples
	///
	/// \b Note: this element is available in render() only.
	uint32_t *digital;

	/// Number of audio frames per period
	uint32_t audioFrames;
	/// Number of input audio channels
	uint32_t audioInChannels;
	/// Number of output audio channels
	uint32_t audioOutChannels;
	/// Audio sample rate in Hz (currently always 44100.0)
	float audioSampleRate;

	/// \brief Number of analog frames per period
	///
	/// This will be 0 if analog I/O is disabled.
	uint32_t analogFrames;

	/// \brief Number of input analog channels
	///
	/// This will be 0 if analog I/O is disabled.
	uint32_t analogInChannels;

	/// \brief Number of output analog channels
	///
	/// This will be 0 if analog I/O is disabled.
	uint32_t analogOutChannels;

	/// \brief Analog sample rate in Hz
	///
	/// The analog sample rate depends on the number of analog channels used. If
	/// 8 channels are used, the sample rate is 22050. If 4 channels are used, the sample
	/// rate is 44100. If 2 channels are used, the sample rate is 88200. If analog I/O
	/// is disabled, the sample rate is 0.
	float analogSampleRate;

	/// Number of digital frames per period
	uint32_t digitalFrames;
	/// \brief Number of digital channels
	///
	/// Currently this will always be 16, unless digital I/O is disabled, in which case it will be 0.
	uint32_t digitalChannels;
	/// Digital sample rate in Hz (currently always 44100.0)
	float digitalSampleRate;

	/// \brief Number of elapsed audio frames since the start of rendering.
	///
	/// This holds the total number of audio frames as of the beginning of the current period. To
	/// find the current number of analog or digital frames elapsed, multiply by the ratio of the
	/// sample rates (e.g. half the number of analog frames will have elapsed if the analog sample
	/// rate is 22050).
	uint64_t audioFramesElapsed;

	/// \brief Number of multiplexer channels for each analog input.
	///
	/// This will be 2, 4 or 8 if the multiplexer capelet is enabled, otherwise it will be 1.
	/// 2, 4 and 8 correspond to 16, 32 and 64 analog inputs, respectively.
	uint32_t multiplexerChannels;

	/// \brief Multiplexer channel corresponding to the first analog frame.
	///
	/// This indicates the multiplexer setting corresponding to the first analog frame in the
	/// buffer.
	uint32_t multiplexerStartingChannel;

	/// \brief Buffer which holds multiplexed analog inputs, when multiplexer capelet is enabled.
	///
	/// Because the analog in buffer size may be smaller than a complete cycle of the multiplexer 
	/// capelet, this buffer will always be big enough to hold at least one complete cycle of all
	/// channels. It will be null if the multiplexer capelet is not enabled.
	float *multiplexerAnalogIn;

	/// \brief Flags for whether audio expander is enabled on given analog channels.
	///
	/// Bits 0-15, when set, indicate audio expander enabled on the analog inputs. Bits 16-31
	/// indicate audio expander enabled on the analog outputs.
	uint32_t audioExpanderEnabled;

	/// \brief Other audio/sensor settings
	///
	/// Binary combination of flags including:
	///
	/// BELA_FLAG_INTERLEAVED: indicates the audio and analog buffers are interleaved
	///
	/// BELA_FLAG_ANALOG_OUTPUTS_PERSIST: indicates that writes to the analog outputs will
	/// persist for future frames. If not set, writes affect one frame only.
	uint32_t flags;

	/// Name of running project.
	char projectName[MAX_PROJECTNAME_LENGTH];
	operator BelaContext () {return *(BelaContext*)this;}
} InternalBelaContext;

class PruMemory;
class PRU
{
private:
	static const unsigned int kPruGPIODACSyncPin;
	static const unsigned int kPruGPIOADCSyncPin;

public:
	// Constructor
	PRU(InternalBelaContext *input_context, AudioCodec *audio_codec);

	// Destructor
	~PRU();

	// Prepare the GPIO pins needed for the PRU
	int prepareGPIO(int include_led);

	// Clean up the GPIO at the end
	void cleanupGPIO();

	// Initialise and open the PRU
	int initialise(BelaHw newBelaHw, int pru_num, bool uniformSampleRate,
				   int mux_channels,
				   bool capeButtonMonitoring, bool enableLed);

	// Run the code image in pru_rtaudio_bin.h
	int start(char * const filename);

	// Loop: read and write data from the PRU and call the user-defined audio callback
	void loop(void *userData, void(*render)(BelaContext*, void*), bool highPerformanceMode);

	// Wait for an interrupt from the PRU indicate it is finished
	void waitForFinish();

	// Turn off the PRU when done
	void disable();

	// Exit the whole PRU subsystem
	void exitPRUSS();

private:
	void initialisePruCommon();
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
	bool gpio_enabled;	// Whether GPIO has been prepared
	bool led_enabled;	// Whether a user LED is enabled

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

	Gpio belaCapeButton; // Monitoring the bela cape button
	Gpio underrunLed; // Flashing an LED upon underrun
	AudioCodec *codec; // Required to hard reset audio codec from loop
};


#endif /* PRU_H_ */
