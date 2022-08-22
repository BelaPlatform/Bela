/**
 *  @file
 *  @brief Main Bela public API
 *
 *  Central control code for hard real-time audio on BeagleBone Black
 *  using PRU and Xenomai Linux extensions. This code began as part
 *  of the Hackable Instruments project (EPSRC) at Queen Mary University
 *  of London, 2013-14.
 *
 *  (c) 2014-15 Andrew McPherson, Victor Zappi and Giulio Moro,
 *  Queen Mary University of London
 */

/**
 * \mainpage
 *
 * Bela is a hard-real-time, ultra-low latency audio and sensor environment for
 * BeagleBone Black, which works with the BeagleBone Audio Cape or a custom "Bela Cape"
 * which incorporates stereo audio with 8x, 16-bit analog inputs and outputs.
 *
 * Bela is based on the Xenomai real-time Linux extensions (http://xenomai.org) and
 * uses the BeagleBone %PRU subsystem to address the audio and sensor hardware.
 *
 * Further information can be found at http://bela.io
 */

#ifndef BELA_H_
#define BELA_H_
#define BELA_MAJOR_VERSION 1
#define BELA_MINOR_VERSION 13
#define BELA_BUGFIX_VERSION 0

// Version history / changelog:
// 1.14.0
// - added disabledDigitalChannels to BelaInitSettings and corresponding command-line
// 1.13.0
// - added Bela_setLineOutLevel() which replaces Bela_setDacLevel() (though
// with different semantics).
// - in BelaInitSettings, dacGains is _replaced_ by lineOutGains
// - replaced --dac-level with --line-out-level, -D now means --line-out-level
// - replaced DEFAULT_DAC_LEVEL with DEFAULT_LINE_OUT_LEVEL
// - removed setAdcLevel(): use setAudioInputGain() instead
// - removed -A/--adc-gain, now ignored (non-bw-compatible)
// - removed DEFAULT_ADC_LEVEL
// - deprecated Bela_setDacLevel()
// 1.12.0
// - added Bela_cpuTic(), Bela_cpuToc(), Bela_cpuMonitoringInit(),
// Bela_cpuMonitoringGet() and BelaCpuData.
// 1.11.0
// - added BelaChannelGain and BelaChannelGainArray
// - added setHpLevel(), setAudioInputGain(), setAdcLevel(), setDacLevel(),
// deprecated the functions they are intended to replace
// - added the corresponding fields in BelaInitSettings: headphoneGains,
// audioInputGains, adcGains, dacGains
// 1.10.0
// - added parameter to Bela_detectHw(), and associated typedef
// - added more values to the BelaHw enum
// - added codecMode to BelaInitSettings
// 1.9.0
// - added Bela_HwConfig_{new,delete}
// 1.8.0
// - added callback for when the audio thread is done: settings->audioThreadDone
// 1.7.0
// - Bela_getopt_long takes a char* const []
// - added the functions and definitions from Utilities.h
// - INPUT and OUTPUT are now an enum
// 1.6.0
// - added Bela_setUserData(), Bela_requestStop(), Bela_stopRequested()
// 1.5.1
// - in BelaInitSettings, renamed unused members, preserving binary compatibility
// 1.5.0
// - in BelaInitSettings, board becomes BelaHw
// - added to BelaInitSettings char* projectName
// - added to BelaContext char* projectName
// 1.4.0
// - added allocator/de-allocator for BelaInitSettings
// - added char board field to BelaInitSettings
// 1.3.0
// - removed define for I2C codec address
// - removed user option in settings for I2C address
// 1.2.0
// - renames and re-ordered BelaHw enum
// 1.1.0
// - adds BelaHw, Bela_detectHw()
// - removes digital_gpio_mapping.h

#ifdef __cplusplus
extern "C"
{
#endif

#include <stdint.h>
#include <unistd.h>
#include <stdbool.h>
#include <stdio.h>

// use attributes to provide printf-style compiler warnings
#ifdef __GNUC__
#define _ATTRIBUTE(attrs) __attribute__ (attrs)
#else
#define _ATTRIBUTE(attrs)
#endif

// RT-safe printing
// these functions are currently provided by xenomai.
// We put these declarations here so we do not have to include
// Xenomai specific files
int rt_printf(const char *format, ...) _ATTRIBUTE ((__format__ (__printf__, 1, 2)));
int rt_fprintf(FILE *stream, const char *format, ...) _ATTRIBUTE ((__format__ (__printf__, 2, 3)));
int rt_vprintf(const char *format, va_list ap) _ATTRIBUTE ((__format__ (__printf__, 1, 0)));
int rt_vfprintf(FILE *stream, const char *format, va_list ap) _ATTRIBUTE ((__format__ (__printf__, 2, 0)));
// these are more future-proof wrappers
int Bela_printf(const char *format, ...) _ATTRIBUTE ((__format__ (__printf__, 1, 2)));
int Bela_fprintf(FILE *stream, const char *format, ...) _ATTRIBUTE ((__format__ (__printf__, 2, 3)));
int Bela_vprintf(const char *format, va_list ap) _ATTRIBUTE ((__format__ (__printf__, 1, 0)));
int Bela_vfprintf(FILE *stream, const char *format, va_list ap) _ATTRIBUTE ((__format__ (__printf__, 2, 0)));

/**
 * A type of Bela hardware.
 */
typedef enum
{
	BelaHw_NoHw = -1, ///< No hardware
	BelaHw_Bela, ///< Bela
	BelaHw_BelaMini, ///< Bela Mini
	BelaHw_Salt, ///< Salt
	BelaHw_CtagFace, ///< Ctag Face
	BelaHw_CtagBeast, ///< Ctag Beast
	BelaHw_CtagFaceBela, ///< Ctag Face and Bela cape
	BelaHw_CtagBeastBela, ///< Ctag Beast and Bela cape
	BelaHw_BelaMiniMultiAudio, ///< Bela Mini with extra codecs
	BelaHw_BelaMiniMultiTdm, ///< Bela Mini with extra codecs and/or tdm devices
	BelaHw_BelaMultiTdm, ///< Bela with extra codecs and/or tdm devices
	BelaHw_BelaMiniMultiI2s, ///< Bela Mini with extra rx and tx I2S data lines.
	BelaHw_BelaEs9080, ///< A Bela cape with Es9080 EVB on top, all as audio
	BelaHw_BelaRevC, ///< A Bela cape rev C: Es9080 is used for analog outs
	BelaHw_Batch, ///< Dummy offline
} BelaHw;

typedef struct _BelaHwConfig
{
	float audioSampleRate;
	unsigned int audioInChannels;
	unsigned int audioOutChannels;
	unsigned int analogInChannels;
	unsigned int analogOutChannels;
	unsigned int digitalChannels;
} BelaHwConfig;

/**
 * Returns the configuration for a given BelaHw or `nullptr` if `hw` is
 * invalid.
 *
 * The returned pointer has to be deleted with Bela_HwConfig_delete().
 */
BelaHwConfig* Bela_HwConfig_new(BelaHw hw);

/**
 * Use this to delete a pointer returned by Bela_HwConfig_new()
 */
void Bela_HwConfig_delete(BelaHwConfig* cfg);

/**
 * Arguments to be passed to Bela_detectHw()
 */
typedef enum
{
	BelaHwDetectMode_Scan, ///< perform an automatic detection by scanning the peripherals and busses available, and cache value in `/run/bela/belaconfig`
	BelaHwDetectMode_Cache, ///< read cached value from `/run/bela/belaconfig` first. If it does not exist, fall back to #BelaHwDetectMode_Scan
	BelaHwDetectMode_CacheOnly, ///<read cached value from `/run/bela/belaconfig`. If it does not exist, return #BelaHw_NoHw
	BelaHwDetectMode_User, ///<read user-specified value from `~/.bela/belaconfig`. If it does not exist, fall back to #BelaHwDetectMode_Cache
	BelaHwDetectMode_UserOnly, ///<read user-specified value from `~/.bela/belaconfig`. If it does not exist, return #BelaHw_NoHw
} BelaHwDetectMode;

#include <GPIOcontrol.h>

// Useful constants

/** \cond PRIVATE */
#define MAX_PRU_FILENAME_LENGTH 256
#define MAX_UNUSED_LENGTH 220
#define MAX_PROJECTNAME_LENGTH 256
/** \endcond */

/**
 * \ingroup auxtask
 *
 * Xenomai priority level for audio processing. Maximum possible priority is 99.
 * In general, all auxiliary tasks should have a level lower than this unless for\
 * special purposes where the task needs to interrupt audio processing.
 */
#define BELA_AUDIO_PRIORITY		95

// Default volume levels

/**
 * \addtogroup levels
 *
 * @{
 */

/**
 * Default level of the line out in decibels. See Bela_setLineOutLevel().
 */
#define DEFAULT_LINE_OUT_LEVEL	0.0

/**
 * Default level of the Programmable Gain Amplifier in decibels.
 */
#define DEFAULT_PGA_GAIN 16

/**
 * Default level of the headphone output in decibels. See Bela_setHeadphoneLevel().
 */
#define DEFAULT_HP_LEVEL	-6.0
/** @} */

/**
 * Flag for BelaContext. If set, indicates the audio and analog buffers are interleaved.
 */
#define BELA_FLAG_INTERLEAVED				(1 << 0)	// Set if buffers are interleaved
/**
 * Flag for BelaContext. If set, indicates analog outputs persist for future frames.
 */
#define BELA_FLAG_ANALOG_OUTPUTS_PERSIST	(1 << 1)	// Set if analog/digital outputs persist for future buffers
/**
 * Flag for BelaContext. If set, indicates the user will be warned if an underrun occurs
 */
#define BELA_FLAG_DETECT_UNDERRUNS	(1 << 2)	// Set if the user will be displayed a message when an underrun occurs
/**
 * Flag for BelaContext. If set, it means that render() is called offline, i.e.: the audio time does not correspond to wall clock time.
 */
#define BELA_FLAG_OFFLINE (1 << 3)

struct option;

/**
 * \ingroup render
 * \brief Structure holding audio and sensor settings and pointers to I/O data buffers.
 *
 * This structure is passed to setup(), render() and cleanup() and provides access to 
 * Bela's I/O functionality. It is initialised in Bela_initAudio() based on the contents 
 * of the BelaInitSettings structure.
 */
typedef struct {
	/// \brief Buffer holding audio input samples
	///
	/// This buffer allows Bela's audio input data to be read during render().
	/// By default the buffer contains data from all the audio input channels arranged
	/// in interleaved format.
	///
	/// Every time render() runs this buffer is filled with a block of new audio samples.
	/// The block is made up of frames, individual slices of time consisting of one sample
	/// taken from each audio input channel simultaneously. The number of frames per
	/// block is given by context->audioFrames, and the number of audio input channels
	/// by context->audioInChannels. The length of this buffer is the product of these
	/// two values.
	///
	/// The buffer can be accessed manually with standard array notation or more 
	/// conveniently using the audioRead() utility.
	///
	/// \b Note: this element is available in render() only.
	const float * const audioIn;

	/// \brief Buffer holding audio output samples
	///
	/// This buffer allows Bela's audio output data to be written during render().
	/// By default the buffer must contain data from all the audio output channels
	/// arranged in interleaved format.
	///
	/// Every time render() runs it is the job of the developer to fill this buffer with 
	/// a block of new audio samples, structured in the same way as context->audioIn.
	///
	/// The buffer can be accessed manually with standard array notation or more 
	/// conveniently using the audioWrite() utility.
	///
	/// \b Note: this element is available in render() only.
	float * const audioOut;

	/// \brief Buffer holding analog input samples
	///
	/// This buffer allows Bela's analog input data to be read during render().
	/// By default the buffer contains data from all the analog input channels arranged
	/// in interleaved format.
	///
	/// Every time render() runs this buffer is filled with a block of new analog samples.
	/// The block is made up of frames, individual slices of time consisting of one sample
	/// taken from each analog input channel simultaneously. The number of frames per
	/// block is given by context->analogFrames, and the number of analog input channels
	/// by context->analogInChannels. The length of this buffer is the product of these
	/// two values.
	///
	/// The buffer can be accessed manually with standard array notation or more 
	/// conveniently using the analogRead() utility.
	///
	/// \b Note: this element is available in render() only.
	const float * const analogIn;

	/// \brief Buffer holding analog output samples
	///
	/// This buffer allows Bela's analog output data to be written during render().
	/// By default the buffer must contain data from all the analog output channels
	/// arranged in interleaved format.
	///
	/// Every time render() runs it is the job of the developer to fill this buffer with 
	/// a block of new analog samples, structured in the same way as context->analogIn.
	///
	/// The buffer can be accessed manually with standard array notation or more 
	/// conveniently using the analogWrite() utility.
	///
	/// \b Note: this element is available in render() only.
	float * const analogOut;

	/// \brief Buffer holding digital input/output samples
	///
	/// This buffer allows Bela's digital GPIO data to be read and written during render().
	///
	/// The buffer can be accessed manually with standard array notation or somewhat more 
	/// conveniently using the digitalRead() and digitalWrite() utilities.
	///
	/// \b Note: this element is available in render() only.
	uint32_t * const digital;

	/// \brief The number of audio frames per block
	///
	/// Every time render() runs context->audioIn is filled with a block of new audio 
	/// samples. The block is made up of frames, individual slices of time consisting of 
	/// one sample taken from each audio input channel simultaneously.
	///
	/// This value determines the number of audio frames in each block and can be adjusted 
	/// in the IDE settings tab (or via the command line arguments) from 2 to 128, 
	/// defaulting to 16.
	///
	/// This value also determines how often render() is called, and reducing it decreases 
	/// audio latency at the cost of increased CPU consumption.
	const uint32_t audioFrames;
	/// \brief The number of audio input channels
	const uint32_t audioInChannels;
	/// \brief The number of audio output channels
	const uint32_t audioOutChannels;
	/// \brief The audio sample rate in Hz (currently always 44100.0)
	const float audioSampleRate;

	/// \brief The number of analog frames per block
	///
	/// Every time render() runs context->analogIn is filled with a block of new analog 
	/// samples. The block is made up of frames, individual slices of time consisting of 
	/// one sample taken from each analog input channel simultaneously.
	///
	/// This value determines the number of analog frames in each block. It cannot be
	/// set directly as it is dependant on the number of audio frames per block 
	/// (context->audioFrames) and the analog sample rate (context->analogSampleRate).
	///
	/// This value will be 0 if analog I/O is disabled.
	const uint32_t analogFrames;

	/// \brief The number of analog input channels
	///
	/// This will be 0 if analog I/O is disabled.
	const uint32_t analogInChannels;

	/// \brief The number of analog output channels
	///
	/// This will be 0 if analog I/O is disabled.
	const uint32_t analogOutChannels;

	/// \brief Analog sample rate in Hz
	///
	/// This value determines the rate at which each analog input is sampled, and is
	/// directly related to the number of analog channels available. It can be adjusted 
	/// in the IDE settings tab (or via the command line arguments) to 22050, 44100
	/// or 88200, allowing 8, 4, or 2 analog channels respectively. By default, all 8
	/// channels are sampled at 22050Hz.
	///
	/// If analog I/O is disabled, this value is 0.
	const float analogSampleRate;

	/// Number of digital frames per period
	const uint32_t digitalFrames;
	/// \brief Number of digital channels
	///
	/// Currently this will always be 16, unless digital I/O is disabled, in which case it will be 0.
	const uint32_t digitalChannels;
	/// Digital sample rate in Hz (currently always 44100.0)
	const float digitalSampleRate;

	/// \brief Number of elapsed audio frames since the start of rendering.
	///
	/// This holds the total number of audio frames as of the beginning of the current block. To
	/// find the current number of analog or digital frames elapsed, multiply by the ratio of the
	/// sample rates (e.g. half the number of analog frames will have elapsed if the analog sample
	/// rate is 22050).
	const uint64_t audioFramesElapsed;

	/// \brief Number of multiplexer channels for each analog input.
	///
	/// This will be 2, 4 or 8 if the multiplexer capelet is enabled, otherwise it will be 1.
	/// 2, 4 and 8 correspond to 16, 32 and 64 analog inputs, respectively.
	const uint32_t multiplexerChannels;

	/// \brief Multiplexer channel corresponding to the first analog frame.
	///
	/// This indicates the multiplexer setting corresponding to the first analog frame in the
	/// buffer.
	const uint32_t multiplexerStartingChannel;

	/// \brief Buffer which holds multiplexed analog inputs, when multiplexer capelet is enabled.
	///
	/// Because the analog in buffer size may be smaller than a complete cycle of the multiplexer
	/// capelet, this buffer will always be big enough to hold at least one complete cycle of all
	/// channels. It will be null if the multiplexer capelet is not enabled.
	const float * const multiplexerAnalogIn;

	/// \brief Flags for whether audio expander is enabled on given analog channels.
	///
	/// Bits 0-15, when set, indicate audio expander enabled on the analog inputs. Bits 16-31
	/// indicate audio expander enabled on the analog outputs.
	const uint32_t audioExpanderEnabled;

	/// \brief Other audio/sensor settings
	///
	/// Binary combination of flags including:
	///
	/// BELA_FLAG_INTERLEAVED
	/// BELA_FLAG_ANALOG_OUTPUTS_PERSIST
	/// BELA_FLAG_DETECT_UNDERRUNS
	/// BELA_FLAG_OFFLINE
	const uint32_t flags;

	/// Name of running project.
	char projectName[MAX_PROJECTNAME_LENGTH];

	/// Number of detected underruns.
	const unsigned int underrunCount;
} BelaContext;

struct BelaChannelGain {
	int channel; ///< Channel number. Negative value means all the channels
	float gain; ///< Gain in dB.
};

struct BelaChannelGainArray {
	unsigned int length;
	struct BelaChannelGain* data;
};
/**
 * \ingroup control
 * \brief Structure containing initialisation parameters for the real-time
 * audio control system.
 *
 * This structure is initialised using Bela_defaultSettings(). Its contents
 * are used up through the point of calling
 * Bela_initAudio() at which point it is no longer needed.
 */
typedef struct {
	// These items might be adjusted by the user:

	/// \brief Number of audio frames per period ("blocksize").
	///
	/// The number of analog frames depends on relative sample rates of the
	/// two. By default, audio is twice the sample rate, so has twice the
	/// period size.
	int periodSize;
	/// Whether to use the analog input and output
	int useAnalog;
	/// Whether to use the 16 programmable GPIOs
	int useDigital;
	/// How many audio input channels [ignored]
	int numAudioInChannels;
	/// How many audio out channels [ignored]
	int numAudioOutChannels;
	/// How many analog input channels
	int numAnalogInChannels;
	/// How many analog output channels
	int numAnalogOutChannels;
	/// How many channels for the GPIOs
	int numDigitalChannels;

	/// Whether to begin with the speakers muted
	int beginMuted;
	/// Level for the audio DAC output. DEPRECATED: ues lineOutGains
	float dacLevel;
	/// Level for the audio ADC input. DEPRECATED: use audioInputGains
	float adcLevel;
	/// Gains for the PGA, left and right channels. DEPRECATED: use audioInputGains
	float pgaGain[2];
	/// Level for the headphone output. DEPRECATED: use headphoneGains
	float headphoneLevel;
	/// How many channels to use on the multiplexer capelet, if enabled
	int numMuxChannels;
	/// Which audio expander settings to use on the input
	unsigned int audioExpanderInputs;
	/// Which audio expander settings to use on the input
	unsigned int audioExpanderOutputs;

	/// Which PRU (0 or 1) the code should run on
	int pruNumber;
	/// The external .bin file to load. If empty will use PRU code from pru_rtaudio_bin.h
	char pruFilename[MAX_PRU_FILENAME_LENGTH];
	/// Whether to detect and log underruns
	int detectUnderruns;
	/// Whether to use verbose logging
	int verbose;
	/// Whether to use the blinking LED to indicate Bela is running
	int enableLED;
	/// What GPIO pin to monitor for stopping the program. Defaults to 115
	/// (button on P9.27/P2.34/GPIO3[19]). Pass -1 to disable monitoring.
	int stopButtonPin;
	/// Whether to use high-performance mode: gives more CPU to
	/// the Bela task. The Linux part of the board and the IDE may
	/// freeze while the program is running. Use the button on the
	/// Bela cape to forcefully stop the running program
	int highPerformanceMode;

	// These items are application-dependent but should probably be
	// determined by the programmer rather than the user

	/// Whether audio/analog data should be interleaved
	int interleave;
	/// \brief Whether analog outputs should persist to future frames.
	///
	/// n.b. digital pins always persist, audio never does
	int analogOutputsPersist;
	/// \brief Whether the analog channels should be resampled to
	/// audio sampling rate.
	int uniformSampleRate;
	//// \brief The requested stack size for the audio thread. Defaults
	// to 128KiB
	unsigned int audioThreadStackSize;
	//// \brief The requested stack size for each AuxilaryTask. Defaults
	// to 128KiB
	unsigned int auxiliaryTaskStackSize;

	// Pointers to the user-defined functions
	bool (*setup)(BelaContext*, void*);
	void (*render)(BelaContext*, void*);
	void (*cleanup)(BelaContext*, void*);
	// These items are hardware-dependent and should only be changed
	// to run on different hardware

	/// Pin where amplifier mute can be found
	int ampMutePin;

	/// Pointer to an optional function to be called when the audio thread is done.
	/// This function is called from the audio thread itself just before it returns.
	void (*audioThreadDone)(BelaContext*, void*);
	/// A codec-specific intialisation parameter
	char* codecMode;
	/// audio input gains
	struct BelaChannelGainArray audioInputGains;
	/// level for headphone outputs
	struct BelaChannelGainArray headphoneGains;
	/// Level for the audio ADC input DEPRECATED: use audioInputGains
	struct BelaChannelGainArray adcGains;
	/// Level for the audio line level output
	struct BelaChannelGainArray lineOutGains;
	/// A bitmask of disabled digital channels
	uint32_t disabledDigitalChannels;

	char unused[MAX_UNUSED_LENGTH];

	/// User selected board to work with (as opposed to detected hardware).
	BelaHw board;

	/// Name of running project. 
	char* projectName;

} BelaInitSettings;

/** \ingroup auxtask
 *
 * Auxiliary task variable. Auxiliary tasks are created using createAuxiliaryTask() and
 * automatically cleaned up after cleanup() finishes.
 */
typedef void* AuxiliaryTask;	// Opaque data type to keep track of aux tasks

/** \ingroup render
 *
 * Flag that indicates whether the audio thread shuold stop. Threads can poll
 * this variable to indicate when
 * they should stop. Additionally, a program can set this to \c true
 * to indicate that audio processing should terminate. Calling
 * Bela_requestStop() simply returns the value of `gShouldStop`, and calling
 * Bela_requestStop() simply sets `gShouldStop`. Bela_stopAudio() has the side
 * effect of setting `gShouldStop`, but it also does other steps to stop running
 * the program and should *not* be called from the audio thread.
 *
 * \note Normally the user wouldn't access this variable directly, but would
 * call Bela_stopRequested() or Bela_requestStop()
 *
 * \warning The use of this variable is deprecated and may be removed in a future version.
 */
extern int volatile gShouldStop;

// *** User-defined render functions ***

/**
 * \defgroup render User-defined render functions
 *
 * These three functions must be implemented by the developer in every Bela program.
 * Typically they appear in their own .cpp source file.
 *
 * @{
 */

/**
 * \brief User-defined initialisation function which runs before audio rendering begins.
 *
 * This function runs once at the beginning of the program, after most of the system
 * initialisation has begun but before audio rendering starts. Use it to prepare any
 * memory or resources that will be needed in render().
 *
 * \param context Data structure holding information on sample rates, numbers of channels,
 * frame sizes and other state. Note: the buffers for audio, analog and digital data will
 * \b not yet be available to use. Do not attempt to read or write audio or sensor data
 * in setup().
 * \param userData An opaque pointer to an optional user-defined data structure. Whatever
 * is passed as the second argument to Bela_initAudio() will appear here.
 *
 * \return true on success, or false if an error occurred. If no initialisation is
 * required, setup() should return true.
 */
bool setup(BelaContext *context, void *userData);

/**
 * \brief User-defined callback function to process audio and sensor data.
 *
 * This function is called regularly by the system every time there is a new block of
 * audio and/or sensor data to process. Your code should process the requested samples
 * of data, store the results within \c context, and return.
 *
 * \param context Data structure holding buffers for audio, analog and digital data. The
 * structure also holds information on numbers of channels, frame sizes and sample rates,
 * which are guaranteed to remain the same throughout the program and to match what was
 * passed to setup().
 * \param userData An opaque pointer to an optional user-defined data structure. Will
 * be the same as the \c userData parameter passed to setup().
 */
void render(BelaContext *context, void *userData);

/**
 * \brief User-defined cleanup function which runs when the program finishes.
 *
 * This function is called by the system once after audio rendering has finished, before the
 * program quits. Use it to release any memory allocated in setup() and to perform
 * any other required cleanup. If no initialisation is performed in setup(), then
 * this function will usually be empty.
 *
 * \param context Data structure holding information on sample rates, numbers of channels,
 * frame sizes and other state. Note: the buffers for audio, analog and digital data will
 * no longer be available to use. Do not attempt to read or write audio or sensor data
 * in cleanup().
 * \param userData An opaque pointer to an optional user-defined data structure. Will
 * be the same as the \c userData parameter passed to setup() and render().
 */
void cleanup(BelaContext *context, void *userData);

/** @} */

/**
 * \defgroup control Control and command line functions
 *
 * These functions are used to initialise the Bela settings, process arguments
 * from the command line, and start/stop the audio and sensor system.
 *
 * @{
 */

// *** Command-line settings ***


/**
 * \brief Allocate the data structure containing settings for Bela.
 *
 * This function should be used to allocate the structure that holds initialisation
 * data for Bela in order to preserve binary compatibility across versions of
 * the library.
 */
BelaInitSettings* Bela_InitSettings_alloc();

/**
 * \brief De-allocate the data structure containing settings for Bela.
 *
 * This function should be used to de-allocate the structure that holds initialisation
 * data for Bela.
 *
 * \param settings Pointer to structure to be de-allocated.
 */
void Bela_InitSettings_free(BelaInitSettings* settings);

/**
 * \brief Initialise the data structure containing settings for Bela.
 *
 * This function should be called in main() before parsing any command-line arguments. It
 * sets default values in the data structure which specifies the Bela settings, including
 * frame sizes, numbers of channels, volume levels and other parameters.
 *
 * \param settings Structure holding initialisation data for Bela.
 */
void Bela_defaultSettings(BelaInitSettings *settings);

#pragma weak Bela_userSettings
/**
 * \brief Initialise the data structure containing settings for Bela.
 *
 * This function fwill be called by Bela_defaultSettings() after the settings have been
 * initialied. It has weak linking so the user is free - but not forced to - define it.
 * It can be used to override some of the default settings if the user code does not have 
 * access to the call to Bela_defaultSettings() (e.g.: because it is handled by the backend
 * code).
 *
 * \param settings Structure holding initialisation data for Bela.
 */
void Bela_userSettings(BelaInitSettings *settings);

/**
 * \brief Get long options from command line argument list, including Bela standard options
 *
 * This function should be used in main() to process command line options, in place of the
 * standard library getopt_long(). Internally, it parses standard Bela command-line options,
 * storing the results in the settings data structure. Any options which are not part of the
 * Bela standard options will be returned, as they would normally be in getopt_long().
 *
 * \param argc Number of command line options, as passed to main().
 * \param argv Array of command line options, as passed to main().
 * \param customShortOptions List of short options to be parsed, analogous to getopt_long(). This
 * list should not include any characters already parsed as part of the Bela standard options.
 * \param customLongOptions List of long options to parsed, analogous to getopt_long(). This
 * list should not include any long options already parsed as part of the Bela standard options.
 * \param settings Data structure holding initialisation settings for Bela. Any standard options
 * parsed will automatically update this data structure.
 *
 * \return Value of the next option parsed which is not a Bela standard option, or -1 when the
 * argument list has been exhausted. Similar to the return value of getopt_long() except that Bela
 * standard options are handled internally and not returned.
 */
int Bela_getopt_long(int argc, char * const argv[], const char *customShortOptions,
				   const struct option *customLongOptions, BelaInitSettings *settings);

/**
 * \brief Print usage information for Bela standard options.
 *
 * This function should be called from your code wherever you wish to print usage information for the
 * user. It will print usage information on Bela standard options, after which you can print usage
 * information for your own custom options.
 */
void Bela_usage();

/**
 * \brief Get the version of Bela you are running.
 */
void Bela_getVersion(int* major, int* minor, int* bugfix);

/**
 * \brief Set level of verbose (debugging) printing.
 *
 * \param level Verbosity level of the internal Bela system. 0 by default; higher values will
 * print more information. Presently all positive numbers produce the same level of printing.
 */
void Bela_setVerboseLevel(int level);


/**
 * \brief Detect what hardware we are running on.
 *
 *
 * \param mode How to perform the detection. The behaviour is described in #BelaHwDetectMode.
 */
BelaHw Bela_detectHw(BelaHwDetectMode mode);

// *** Audio control functions ***

/**
 * \brief Initialise audio and sensor rendering environment.
 *
 * This function prepares audio rendering in Bela. It should be called from main() sometime
 * after command line option parsing has finished. It will initialise the rendering system, which
 * in the process will result in a call to the user-defined setup() function.
 *
 * \param settings Data structure holding system settings, including numbers of channels, frame sizes,
 * volume levels and other information.
 * \param userData An opaque pointer to a user-defined data structure which will be passed to
 * setup(), render() and cleanup(). You can use this to pass custom information
 * to the rendering functions, as an alternative to using global variables.
 *
 * \return 0 on success, or nonzero if an error occurred.
 */
int Bela_initAudio(BelaInitSettings *settings, void *userData);

/**
 * \brief Begin processing audio and sensor data.
 *
 * This function will start the Bela audio/sensor system. After this function is called, the
 * system will make periodic calls to render() until Bela_stopAudio() is called.
 *
 * \return 0 on success, or nonzero if an error occurred.
 */
int Bela_startAudio();

/**
 * \brief Begin processing audio and sensor data in the same thread as the caller.
 *
 * This function will start the Bela audio/sensor system. After this function is called, the
 * system will make periodic calls to render() until Bela_stopAudio() is called.
 *
 * \return 0 on success, or nonzero if an error occurred.
 */
int Bela_runInSameThread();

/**
 * \brief Stop processing audio and sensor data.
 *
 * This function will stop the Bela audio/sensor system. After this function returns, no further
 * calls to render() will be issued.
 */
void Bela_stopAudio();

/**
 * \brief Clean up resources from audio and sensor processing.
 *
 * This function should only be called after Bela_stopAudio(). It will release any
 * internal resources for audio and sensor processing. In the process, it will call the
 * user-defined cleanup() function.
 */
void Bela_cleanupAudio();

/**
 * \brief Set the `userData` variable, which is passed to setup(), render() and cleanup().
 *
 * This function can be used to override `userData` after it has been set by Bela_initAudio().
 *
 * \note This function is experimental and may be removed in a future version.
 */
void Bela_setUserData(void* newUserData);

/**
 * \brief Tell the Bela program to stop.
 *
 * This can be safely called anywhere in the code to tell the audio thread, and
 * all threads monitoring Bela_stopRequested() that they should stop at the
 * earliest occasion. The program will not stop immediately. If the render()
 * function is currently running, it will keep running until it concludes its
 * current execution, but will not be called again. The program's execution
 * will stop when all threads have completed their execution. For this reason,
 * all threads should check for Bela_stopRequested() to be notified when
 * Bela_requestStop() has been called.
 */
void Bela_requestStop();

/**
 * \brief Check whether the program should stop.
 *
 * If you have several threads of execution, each of them should be regularly
 * calling this function and complete execution as soon as possible if a
 * non-zero value is returned.
 *
 * @return a non-zero value if stop has been requested, 0 otherwise.
 */
int Bela_stopRequested();

/** @} */
#ifndef BELA_DISABLE_CPU_TIME
/**
 * \defgroup CPU Computing CPU time
 *
 * These functions allow to monitor CPU usage of the whole audio thread or of
 * arbitrary sections of the program while it is running.
 *
 * Manually calling Bela_cpuTic() and Bela_cpuToc() around specific sections of
 * the code, the CPU performance of these sections can be evaluated. Calling
 * these functions incurs an overhead.
 *
 * When setting the internal CPU monitoring via Bela_cpuMonitoringInit(), the
 * user can compute the CPU time of the entire audio thread. The core
 * code internally calls Bela_cpuTic() and Bela_cpuToc() and the user can get
 * the CPU usage details vai Bela_cpuMonitoringGet();
 *
 * @note These measurements are based on reading a monotonic clock and therefore they
 * include not only actual CPU cycles consumed by the current thread but also
 * any time the thread spends idle, either because it's blocked or because a
 * higher priority thread is running.
 *
 * @{
 */
#include <time.h>
typedef struct {
	int count; ///< Number of samples (tic/toc pairs) in a acquisition cycle. Use 0 to disable.
	unsigned int currentCount; ///< Number of tics in current acquisition cycle
	long long unsigned int busy; ///< Total CPU time spent being busy (between tic and toc) during the current acquisition cycle
	long long unsigned int total; ///< Total CPU time (between tic and previous tic) during the current acquisition cycle
	struct timespec tic; ///< Time of last tic
	struct timespec toc; ///< Time of last toc
	float percentage; ///< Average CPU usage during previous acquisition cycle
} BelaCpuData;
/**
 * Set internal CPU monitoring for the audio thread.
 * @param count Number of samples (tic/toc pairs) in a acquisition cycle. Use 0 to disable.
 * @return 0 on success, an error code otherwise.
 */
int Bela_cpuMonitoringInit(int count);
/**
 * Get stats about internal CPU monitoring.
 *
 * @return a pointer to a BelaCpuData structure which contains data about the
 * CPU usage of the audio thread.
 */
BelaCpuData* Bela_cpuMonitoringGet();
/**
 * Start measuring CPU time. When `data->currentCount` reaches `data->count`, a
 * acquisition cycle is completed. `data->percentage` gives the average CPU busy time
 * during the latest completed acquisition cycle.
 *
 * @param data The `count` field is an input and needs to be populated before calling. Other fields are used as I/O by the function.
 */
void Bela_cpuTic(BelaCpuData* data);
/**
 * Stop measuring CPU time.
 *
 * @param data The `count` field is an input and needs to be populated before calling. Other fields are used as I/O by the function.
 */
void Bela_cpuToc(BelaCpuData* data);

/** @} */
#endif // BELA_DISABLE_CPU_TIME

/**
 * \defgroup levels Audio level controls
 *
 * These functions control the input and output levels for the audio codec. If a Bela program
 * does not call these functions, sensible default levels will be used.
 *
 * @{
 */

// *** Volume and level controls ***

/**
 * \brief Set the level of the audio line out.
 *
 * \b Important: do not call this function from within render(), as it does not make
 * any guarantees on real-time performance.
 *
 * \param channel The channel to set. Use a negative value to set all channels.
 * \param decibels Level of the line output. Valid values will depend on the codec in use.
 *
 * \return 0 on success, or nonzero if an error occurred.
 */
int Bela_setLineOutLevel(int channel, float decibel);

/**
 * \brief Set the level of the audio DAC.
 *
 * DEPRECATED.
 *
 * Use `Bela_setLineOutLevel()` instead.
 */
int Bela_setDacLevel(int channel, float decibels);

/**
 * DEPRECATED.
 *
 * Equivalent to `Bela_setDacLevel(-1, decibels)`.
 */
int Bela_setDACLevel(float decibels);

/**
 * \brief Set the level of the audio ADC.
 *
 * This function sets the level of the audio input. It does not affect the level of the
 * (non-audio) analog inputs.
 *
 * \b Important: do not call this function from within render(), as it does not make
 * any guarantees on real-time performance.
 *
 * \param channel The channel to set. Use a negative value to set all channels.
 * \param decibels Level of the ADC input. Valid levels range from -12 (lowest) to
 * 0 (highest) in steps of 1.5dB. Levels between increments of 1.5 will be rounded down.
 *
 * \return 0 on success, or nonzero if an error occurred.
 */
int Bela_setAdcLevel(int channel, float decibels);

/**
 * DEPRECATED.
 *
 * Equivalent to `Bela_setAdcLevel(-1, decibels)`.
 */
int Bela_setADCLevel(float decibels);


/**
 * \brief Set the gain of the audio input preamplifier.
 *
 * This function sets the level of the Programmable Gain Amplifier(PGA), which
 * amplifies the signal before the ADC.
 *
 * \b Important: do not call this function from within render(), as it does not make
 * any guarantees on real-time performance.
 *
 * \param channel The channel to set. Use a negative value to set all channels.
 * \param decibels Level of the PGA Valid levels range from 0 (lowest) to
 * 59.5 (highest) in steps of 0.5dB. Levels between increments of 0.5 will be rounded.
 * channel 1 is right
 *
 * \return 0 on success, or nonzero if an error occurred.
 */
int Bela_setAudioInputGain(int channel, float decibels);

/**
 * DEPRECATED.
 *
 * Equivalent to `Bela_setAudioInputGain(channel, decibels)`.
 */
int Bela_setPgaGain(float decibels, int channel);

/**
 * \brief Set the level of the onboard headphone amplifier.
 *
 * This function sets the level of the headphone output only (3-pin connector on the Bela
 * cape or the output jack on the BeagleBone Audio Cape). It does not affect the level of the
 * speakers or the line out pads on the cape.
 *
 * \b Important: do not call this function from within render(), as it does not make
 * any guarantees on real-time performance.
 *
 * \param channel The channel to set. Use a negative value to set all channels.
 * \param decibels Level of the headphone output. Valid levels range from -63.5 (lowest) to
 * 0 (highest) in steps of 0.5dB. Levels between increments of 0.5 will be rounded down.
 *
 * \return 0 on success, or nonzero if an error occurred.
 */
int Bela_setHpLevel(int channel, float decibels);
/**
 * DEPRECATED
 * Equivalent to Bela_setHpLevel(-1, decibels);
 */
int Bela_setHeadphoneLevel(float decibels);

/**
 * \brief Mute or unmute the onboard speaker amplifiers.
 *
 * This function mutes or unmutes the amplifiers on the Bela cape. Whether the speakers begin
 * muted or unmuted depends on the BelaInitSettings structure passed to Bela_initAudio().
 *
 * \b Important: do not call this function from within render(), as it does not make
 * any guarantees on real-time performance.
 *
 * \param mute 0 to enable the speakers, nonzero to mute the speakers.
 *
 * \return 0 on success, or nonzero if an error occurred.
 */
int Bela_muteSpeakers(int mute);

/** @} */

/**
 * \defgroup auxtask Auxiliary task support
 *
 * These functions are used to create separate real-time tasks (threads) which run at lower
 * priority than the audio processing. They can be used, for example, for large time-consuming
 * calculations which would take more than one audio frame length to process, or they could be
 * used to communicate with external hardware when that communication might block or be delayed.
 *
 * All auxiliary tasks used by the program should be created in setup(). The tasks
 * can then be scheduled at will within the render() function.
 *
 * @{
 */

// *** Functions for creating auxiliary tasks ***

/**
 * \brief Create a new auxiliary task.
 *
 * This function creates a new auxiliary task which, when scheduled, runs the function specified
 * in the first argument. Note that the task does not run until scheduleAuxiliaryTask() is called.
 * Auxiliary tasks should be created in `setup()` and never in `render()` itself.
 *
 * The second argument specifies the real-time priority. Valid values are between 0
 * and 99, and usually should be lower than \ref BELA_AUDIO_PRIORITY. Tasks with higher priority always
 * preempt tasks with lower priority.
 *
 * \param callback Function which will be called each time the auxiliary task is scheduled, unless it is already running.
 * \param priority Xenomai priority level at which the task should run.
 * \param name Name for this task, which should be unique system-wide (no other running program should use this name).
 * \param arg The argument passed to the callback function.
 */
AuxiliaryTask Bela_createAuxiliaryTask(void (*callback)(void*), int priority, const char *name, void* arg
#ifdef __cplusplus
= NULL
#endif /* __cplusplus */
);

/**
 * \brief Run an auxiliary task which has previously been created.
 *
 * This function will schedule an auxiliary task to run.
 *
 * If the task is already running, calling this function has no effect.
 * If the task is not running (e.g.: a previous invocation has returned), the \b callback function defined
 * in Bela_createAuxiliaryTask() will be called and it will be passed the \b arg pointer as its only parameter.
 *
 * This function is typically called from render() to start a lower-priority task. The function
 * will not run immediately, but only once any active higher priority tasks have finished.
 *
 * \param task Task to schedule for running.
 * \return 0 if the task was successfully scheduled, a positive error number otherwise. The most frequent error will be EBUSY, if the task was still running as a consequence of a previous call.
 */
int Bela_scheduleAuxiliaryTask(AuxiliaryTask task);

/**
 * \brief Create and start an AuxiliaryTask.
 *
 * Effectively this is a shorthand for Bela_createAuxiliaryTask() followed by
 * Bela_scheduleAuxiliaryTask(), with fewer parameters to make it easier to use.
 *
 * @param callback the function to run in the thread.
 * @param priority the priority of the thread. Defaults to 0.
 * @param arg the argument to be passed to the callback. Defaults to `nullptr`.
 * @return the `AuxiliaryTask` on success, so that it can be scheduled again
 * later if needed, or `0` if an error occurred.
 */
#ifdef __cplusplus
AuxiliaryTask Bela_runAuxiliaryTask(void (*callback)(void*), int priority = 0, void* arg = nullptr);
#endif // __cplusplus
/**
 * \brief Initialize an auxiliary task so that it can be scheduled.
 *
 * User normally do not need to call this function.
 *
 * This function will start an auxiliary task but will NOT schedule it.
 * This means that the callback function associated with the task will NOT be executed.
 *
 * It will also set a flag in the associate InternalAuxiliaryTask to flag the
 * task as "started", so that successive calls to the same function for a given AuxiliaryTask
 * have no effect.
 * The user should never be required to call this function directly, as it is called
 * by Bela_scheduleAuxiliaryTask if needed (e.g.: if a task is scheduled in setup() )
 * or immediately after starting the audio thread.
 *
* \param task Task to start.
 */

int Bela_startAuxiliaryTask(AuxiliaryTask task);
int Bela_startAllAuxiliaryTasks();
void Bela_stopAllAuxiliaryTasks();
void Bela_deleteAllAuxiliaryTasks();

/** @} */

// You may want to define the macro below in case `Utilities.h` causes namespace conflicts
#ifndef BELA_DONT_INCLUDE_UTILITIES
#include <Utilities.h>
#endif // BELA_DONT_INCLUDE_UTILITIES

/**
 * \defgroup iofunctions I/O functions and constants
 *
 * These functions and macros are used for audio, analog and digital I/O. All the
 * I/O functions require the BelaContext data structure from render() to be passed
 * in. This means that these functions are, by design, \b only usable from within
 * the rendering thread.
 *
 * The naming conventions are loosely derived from the Arduino environment, and the
 * syntax is similar. Unlike Arduino, the I/O functions require the frame number at which
 * the read or write should take place, since all I/O happens synchronously with the
 * audio clock.
 *
 * @{
 */

enum {
	INPUT = 0,
	OUTPUT = 1,
};
/** @} */

/**
 * \cond BIT_FUNCTIONS
 *
 * @{
 */

/// Set the given bit in \c word to 1.
#define Bela_setBit(word,bit) 			((word) | (1 << (bit)))

/// Clear the given bit in \c word to 0.
#define Bela_clearBit(word,bit) 			((word) &~ (1 << (bit)))

/// Check if the given bit in \c word is 1 (returns nonzero) or 0 (returns zero).
#define Bela_getBit(word,bit) 			(((word) >> (bit)) & 1)

/// Set/clear the given bit in \c word to \c value.
#define Bela_changeBit(word,bit,value) 	((Bela_clearBit((word),(bit))) | ((value) << (bit)))

/** @}
 * \endcond
 * */

/**
 * \ingroup iofunctions
 *
 * @{
 */

// Note: pinMode(), analogWrite() and digitalWrite() should be able to be called from setup()
// Likewise, thread launch should be able to be called from setup()
// Also, make volume change functions callable from render() thread -- as an aux task?

/**
 * \brief Read an audio input, specifying the frame number (when to read) and the channel.
 *
 * This function returns the value of an audio input, at the time indicated by \c frame.
 * The returned value ranges from -1 to 1.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to read the audio input. Valid values range
 * from 0 to (context->audioFrames - 1).
 * \param channel Which audio input to read. Valid values are between 0 and
 * (context->audioChannels - 1), typically 0 to 1 by default.
 * \return Value of the analog input, range  to 1.
 */
static inline float audioRead(BelaContext *context, int frame, int channel);

/**
 * \brief Non-interleaved version of audioRead()
 *
 * To be used when `(context->flags | BELA_FLAG_INTERLEAVED) == false)`
 */
static inline float audioReadNI(BelaContext *context, int frame, int channel);

/**
 * \brief Write an audio output, specifying the frame number (when to write) and the channel.
 *
 * This function sets the value of an audio output, at the time indicated by \c frame. Valid
 * values are between -1 and 1.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to write the audio output. Valid values range
 * from 0 to (context->audioFrames - 1).
 * \param channel Which analog output to write. Valid values are between 0 and
 * (context->audioChannels - 1), typically 0 to 1 by default.
 * \param value Value to write to the output, range -1 to 1.
 */
static inline void audioWrite(BelaContext *context, int frame, int channel, float value);

/**
 * \brief Non-interleaved version of audioWrite()
 *
 * To be used when `(context->flags | BELA_FLAG_INTERLEAVED) == false)`
 */
static inline void audioWriteNI(BelaContext *context, int frame, int channel, float value);

/**
 * \brief Read an analog input, specifying the frame number (when to read) and the channel.
 *
 * This function returns the value of an analog input, at the time indicated by \c frame.
 * The returned value ranges from 0 to 1, corresponding to a voltage range of 0 to 4.096V.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to read the analog input. Valid values range
 * from 0 to (context->analogFrames - 1).
 * \param channel Which analog input to read. Valid values are between 0 and
 * (context->analogInChannels - 1), typically 0 to 7 by default.
 * \return Value of the analog input, range 0 to 1.
 */
static inline float analogRead(BelaContext *context, int frame, int channel);

/**
 * \brief Non-interleaved version of analogRead()
 *
 * To be used when `(context->flags | BELA_FLAG_INTERLEAVED) == false)`
 */
static inline float analogReadNI(BelaContext *context, int frame, int channel);

/**
 * \brief Write an analog output, specifying the frame number (when to write) and the channel.
 *
 * This function sets the value of an analog output, at the time indicated by \c frame. Valid
 * values are between 0 and 1, corresponding to the range 0 to 5V.
 *
 * The value written will persist for all future frames if BELA_FLAG_ANALOG_OUTPUTS_PERSIST
 * is set in context->flags. This is the default behaviour.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to write the analog output. Valid values range
 * from 0 to (context->analogFrames - 1).
 * \param channel Which analog output to write. Valid values are between 0 and
 * (context->analogOutChannels - 1), typically 0 to 7 by default.
 * \param value Value to write to the output, range 0 to 1.
 */
static inline void analogWrite(BelaContext *context, int frame, int channel, float value);

/**
 * \brief Non-interleaved version of analogWrite()
 *
 * To be used when `(context->flags | BELA_FLAG_INTERLEAVED) == false)`
 */
static inline void analogWriteNI(BelaContext *context, int frame, int channel, float value);

/**
 * \brief Write an analog output, specifying the frame number (when to write) and the channel.
 *
 * This function sets the value of an analog output, at the time indicated by \c frame. Valid
 * values are between 0 and 1, corresponding to the range 0 to 5V.
 *
 * Unlike analogWrite(), the value written will affect \b only the frame specified, with
 * future values unchanged. This is faster than analogWrite() so is better suited
 * to applications where every frame will be written to a different value. If
 * BELA_FLAG_ANALOG_OUTPUTS_PERSIST is not set within context->flags, then
 * analogWriteOnce() and analogWrite() are equivalent.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to write the analog output. Valid values range
 * from 0 to (context->analogFrames - 1).
 * \param channel Which analog output to write. Valid values are between 0 and
 * (context->analogOutChannels - 1), typically 0 to 7 by default.
 * \param value Value to write to the output, range 0 to 1.
 */
static inline void analogWriteOnce(BelaContext *context, int frame, int channel, float value);

/**
 * \brief Non-interleaved version of analogWriteNI()
 *
 * To be used when `(context->flags | BELA_FLAG_INTERLEAVED) == false)`
 */
static inline void analogWriteOnceNI(BelaContext *context, int frame, int channel, float value);

/**
 * \brief Read a digital input, specifying the frame number (when to read) and the pin.
 *
 * This function returns the value of a digital input, at the time indicated by \c frame.
 * The value is 0 if the pin is low, and nonzero if the pin is high (3.3V).
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to read the digital input. Valid values range
 * from 0 to (context->digitalFrames - 1).
 * \param channel Which digital input to read. 16 pins across the headers are
 * available. Check your board diagram to know where they are on the specific
 * board you have.
 * \return Value of the digital input.
 */
static inline int digitalRead(BelaContext *context, int frame, int channel);

/**
 * \brief Write a digital output, specifying the frame number (when to write) and the pin.
 *
 * This function sets the value of a digital output, at the time indicated by \c frame.
 * A value of 0 sets the pin low; any other value sets the pin high (3.3V).
 *
 * The value written will persist for all future frames.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to write the digital output. Valid values range
 * from 0 to (context->digitalFrames - 1).
 * \param channel Which digital output to write. 16 pins across the headers are
 * available. Check your board diagram to know where they are on the specific
 * board you have.
 * \param value Value to write to the output.
 */
static inline void digitalWrite(BelaContext *context, int frame, int channel, int value);

/**
 * \brief Write a digital output, specifying the frame number (when to write) and the pin.
 *
 * This function sets the value of a digital output, at the time indicated by \c frame.
 * A value of 0 sets the pin low; any other value sets the pin high (3.3V).
 *
 * Unlike digitalWrite(), the value written will affect \b only the frame specified, with
 * future values unchanged. This is faster than digitalWrite() so is better suited
 * to applications where every frame will be written to a different value.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to write the digital output. Valid values range
 * from 0 to (context->digitalFrames - 1).
 * \param channel Which digital output to write. 16 pins across the headers are
 * available. Check your board diagram to know where they are on the specific
 * board you have.
 * \param value Value to write to the output.
 */
static inline void digitalWriteOnce(BelaContext *context, int frame, int channel, int value);

/**
 * \brief Set the direction of a digital pin to input or output.
 *
 * This function sets the direction of a digital pin, at the time indicated by \c frame.
 * Valid values are \c INPUT and \c OUTPUT. All pins begin as inputs by default.
 *
 * The value written will persist for all future frames.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to set the pin direction. Valid values range
 * from 0 to (context->digitalFrames - 1).
 * \param channel Which digital channel to set. 16 pins across the headers are
 * available. Check your board diagram to know where they are on the specific
 * board you have.
 * \param mode Direction of the pin (\c INPUT or \c OUTPUT).
 */
static inline void pinMode(BelaContext *context, int frame, int channel, int mode);

/**
 * \brief Set the direction of a digital pin to input or output.
 *
 * This function sets the direction of a digital pin, at the time indicated by \c frame.
 * Valid values are \c INPUT and \c OUTPUT. All pins begin as inputs by default.
 *
 * The value written will affect only the specified frame.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to set the pin direction. Valid values range
 * from 0 to (context->digitalFrames - 1).
 * \param channel Which digital channel to set. 16 pins across the headers are
 * available. Check your board diagram to know where they are on the specific
 * board you have.
 * \param mode Direction of the pin (\c INPUT or \c OUTPUT).
 */
static inline void pinModeOnce(BelaContext *context, int frame, int channel, int mode);

/*
 * \brief Returns the value of the given multiplexer channel for the given analog input.
 *
 * This function reads an input from the Multiplexer Capelet hardware, which needs to be
 * attached and enabled by selecting 16, 32 or 64 analog input channels in the command line
 * arguments. With the Multiplexer Capelet, each analog input can be connected to one of 8
 * multiplexer channels. This function will return a particular multiplexer channel for a
 * particular input, with the returned valued being the most recent sample taken from that pin.
 *
 * Depending on the block size, it may take longer than a single block to scan all multiplexer
 * channels. For this reason, successive calls to multiplexerAnalogRead() may return the same
 * sample. If you want precise timing control on when a multiplexer input was sampled, use
 * multiplexerChannelForFrame() instead to determine which multiplexer channels were sampled
 * in a particular block.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param input The analog input to read, i.e. what would be passed as \c channel to analogRead().
 * Valid values are 0 to (context->analogInChannels - 1).
 * \param muxChannel Which multiplexer channel to read. Valid values are 0 to
 * (context->multiplexerChannels - 1).
 * \return Value of the analog input from the Multiplexer Capelet.
 */

static inline float multiplexerAnalogRead(BelaContext *context, int input, int muxChannel);

/*
 * \brief Returns which multiplexer channel the given analog frame was taken from.
 *
 * This function indicates what the multiplexer setting was for a given analog input frame.
 * This can be used to work out which pin on the Multiplexer Capelet a given analog input sample
 * was taken from. For this function to have any meaning, the Multiplexer Capelet hardware must
 * be attached and it should be enabled by selecting 16, 32 or 64 analog input channels in the
 * command line arguments.
 *
 * Depending on the block size, it may take longer than a single block to scan all multiplexer
 * channels. For this reason, each call to render() may contain only a subset of the available
 * multiplexer channels. This function allows you timing precision by knowing at what frame each
 * multiplexer reading was taken, but it does not guarantee that all channels can be read in
 * any given callback. If you need access to all the multiplexer inputs in every call to render(),
 * use multiplexerAnalogRead() instead.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame The analog frame (i.e. the time) whose multiplexer setting should be queried.
 * \return Multiplexer channel setting at the given frame.
 */

static inline unsigned int multiplexerChannelForFrame(BelaContext *context, int frame);

/** @} */

// audioRead()
//
// Returns the value of the given audio input at the given frame number.
static inline float audioRead(BelaContext *context, int frame, int channel) {
	return context->audioIn[frame * context->audioInChannels + channel];
}

static inline float audioReadNI(BelaContext *context, int frame, int channel) {
	return context->audioIn[channel * context->audioFrames + frame];
}

// audioWrite()
//
// Sets a given audio output channel to a value for the current frame
static inline void audioWrite(BelaContext *context, int frame, int channel, float value) {
	context->audioOut[frame * context->audioOutChannels + channel] = value;
}

static inline void audioWriteNI(BelaContext *context, int frame, int channel, float value) {
	context->audioOut[channel * context->audioFrames + frame] = value;
}

// analogRead()
//
// Returns the value of the given analog input at the given frame number.
static inline float analogRead(BelaContext *context, int frame, int channel) {
	return context->analogIn[frame * context->analogInChannels + channel];
}

static inline float analogReadNI(BelaContext *context, int frame, int channel) {
	return context->analogIn[channel * context->analogFrames + frame];
}

// analogWriteOnce()
//
// Sets a given channel to a value for only the current frame
static inline void analogWriteOnce(BelaContext *context, int frame, int channel, float value) {
	context->analogOut[frame * context->analogOutChannels + channel] = value;
}

static inline void analogWriteOnceNI(BelaContext *context, int frame, int channel, float value) {
	context->analogOut[channel * context->analogFrames + frame] = value;
}

// analogWrite()
//
// Sets a given analog output channel to a value for the current frame and, if persistent outputs are
// enabled, for all subsequent frames
static inline void analogWrite(BelaContext *context, int frame, int channel, float value) {
	unsigned int f;
	for(f = frame; f < context->analogFrames; f++)
		analogWriteOnce(context, f, channel, value);
}

static inline void analogWriteNI(BelaContext *context, int frame, int channel, float value) {
	unsigned int f;
	for(f = frame; f < context->analogFrames; f++)
		analogWriteOnceNI(context, f, channel, value);
}

// digitalRead()
//
// Returns the value of a given digital input at the given frame number
static inline int digitalRead(BelaContext *context, int frame, int channel) {
	return Bela_getBit(context->digital[frame], channel + 16);
}

// digitalWrite()
//
// Sets a given digital output channel to a value for the current frame and all subsequent frames
static inline void digitalWrite(BelaContext *context, int frame, int channel, int value) {
	unsigned int f;
	for(f = frame; f < context->digitalFrames; f++) {
		if(value)
			context->digital[f] |= 1 << (channel + 16);
		else
			context->digital[f] &= ~(1 << (channel + 16));
	}
}

// digitalWriteOnce()
//
// Sets a given digital output channel to a value for the current frame only
static inline void digitalWriteOnce(BelaContext *context, int frame, int channel, int value) {
	if(value)
		context->digital[frame] |= 1 << (channel + 16);
	else
		context->digital[frame] &= ~(1 << (channel + 16));
}

// pinMode()
//
// Sets the direction of a digital pin for the current frame and all subsequent frames
static inline void pinMode(BelaContext *context, int frame, int channel, int mode) {
	unsigned int f;
	for(f = frame; f < context->digitalFrames; f++) {
		if(mode == INPUT)
			context->digital[f] |= (1 << channel);
		else
			context->digital[f] &= ~(1 << channel);
	}
}

// pinModeOnce()
//
// Sets the direction of a digital pin for the current frame only
static inline void pinModeOnce(BelaContext *context, int frame, int channel, int mode) {
	if(mode == INPUT)
		context->digital[frame] |= (1 << channel);
	else
		context->digital[frame] &= ~(1 << channel);
}

// multiplexerAnalogRead()
//
// Returns the value of the given multiplexer channel for the given analog input.
static inline float multiplexerAnalogRead(BelaContext *context, int input, int muxChannel) {
	return context->multiplexerAnalogIn[muxChannel * context->analogInChannels + input];
}

// multiplexerChannelForFrame()
//
// Returns which multiplexer channel the given analog frame was taken from.
static inline unsigned int multiplexerChannelForFrame(BelaContext *context, int frame) {
	if(context->multiplexerChannels <= 1)
		return 1;
	return (context->multiplexerStartingChannel + frame) % context->multiplexerChannels;
}

#ifdef __cplusplus
}
#endif

#endif /* BELA_H_ */
