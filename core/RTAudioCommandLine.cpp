#include <iostream>
#include <cstdlib>
#include <cstring>
#include <vector>
#include <sstream>
#include <getopt.h>
#include "../include/Bela.h"
#include "../include/board_detect.h"
#include "../include/bela_hw_settings.h"
#include "../include/bela_sw_settings.h"
#include "../include/MiscUtilities.h"

enum {
	OPT_PRU_FILE = 1000,
	OPT_PGA_GAIN_LEFT,
	OPT_PGA_GAIN_RIGHT,
	OPT_PRU_NUMBER,
	OPT_DISABLE_LED,
	OPT_STOP_BUTTON_PIN,
	OPT_DETECT_UNDERRUNS,
	OPT_UNIFORM_SAMPLE_RATE,
	OPT_HIGH_PERFORMANCE_MODE,
	OPT_BOARD,
	OPT_CODEC_MODE,
	OPT_DISABLED_DIGITAL_CHANNELS,
};

extern const float BELA_INVALID_GAIN = 999999;

// whether it's the first time that Bela_getopt_long is run
static bool gFirstRun = 1;

static bool parseLineOutLevels(const char* arg, BelaInitSettings* settings);
static bool parseAudioInputGains(const char *arg, BelaInitSettings *settings);
static bool parseHeadphoneLevels(const char *arg, BelaInitSettings *settings);
static bool parseAudioExpanderChannels(const char *arg, bool inputChannel, BelaInitSettings *settings);

// Default command-line options for RTAudio
struct option gDefaultLongOptions[] =
{
	{"period", 1, NULL, 'p'},
	{"verbose", 0, NULL, 'v'},
	{"use-analog", 1, NULL, 'N'},
	{"use-digital", 1, NULL, 'G'},
	{"analog-channels", 1, NULL, 'C'},
	{"digital-channels", 1, NULL, 'B'},
	{"mute-speaker", 1, NULL, 'M'},
	{"line-out-level", 1, NULL, 'D'},
	{"adc-level", 1, NULL, 'A'},
	{"pga-gain-left", 1, NULL, OPT_PGA_GAIN_LEFT},
	{"pga-gain-right", 1, NULL, OPT_PGA_GAIN_RIGHT},
	{"audio-input-gain", 1, NULL, 'I'},
	{"hp-level", 1, NULL, 'H'},
	{"mux-channels", 1, NULL, 'X'},
	{"audio-expander-inputs", 1, NULL, 'Y'},
	{"audio-expander-outputs", 1, NULL, 'Z'},
	{"pru-file", 1, NULL, OPT_PRU_FILE},
	{"pru-number", 1, NULL, OPT_PRU_NUMBER},
	{"detect-underruns", 1, NULL, OPT_DETECT_UNDERRUNS},
	{"disable-led", 0, NULL, OPT_DISABLE_LED},
	{"stop-button-pin", 1, NULL, OPT_STOP_BUTTON_PIN},
	{"high-performance-mode", 0, NULL, OPT_HIGH_PERFORMANCE_MODE},
	{"uniform-sample-rate", 0, NULL, OPT_UNIFORM_SAMPLE_RATE},
	{"board", 1, NULL, OPT_BOARD},
	{"codec-mode", 1, NULL, OPT_CODEC_MODE},
	{"disabled-digital-channels", 1, NULL, OPT_DISABLED_DIGITAL_CHANNELS},
	{NULL, 0, NULL, 0}
};

const char gDefaultShortOptions[] = "p:vN:M:C:D:A:I:H:G:B:X:Y:Z:";

static void deprecatedWarning(const char* call, const char* newOne, bool ignored = false)
{
	std::cerr << "Warning: " << call << " is deprecated" << (ignored ? " and IGNORED" : "") << ". Use " << newOne << " instead\n";
}

BelaInitSettings* Bela_InitSettings_alloc()
{
	return (BelaInitSettings*) malloc(sizeof(BelaInitSettings));
}

void Bela_InitSettings_free(BelaInitSettings* settings)
{
	free(settings->codecMode);
	free(settings);
}

// This function sets the default settings for the BelaInitSettings structure
void Bela_defaultSettings(BelaInitSettings *settings)
{
	memset(settings, 0, sizeof(*settings));

	// Set default values for settings
	settings->periodSize = 16;
	settings->useAnalog = 1;
	settings->useDigital = 1;
	settings->numAudioInChannels = 2; // ignored
	settings->numAudioOutChannels = 2; // ignored

	settings->numAnalogInChannels = 8;
	settings->numAnalogOutChannels = 8;
	settings->numDigitalChannels = 16;

	settings->beginMuted = 0;
	settings->dacLevel = BELA_INVALID_GAIN;
	settings->adcLevel = BELA_INVALID_GAIN;
	for(int n = 0; n < 2; n++)
		settings->pgaGain[n] = BELA_INVALID_GAIN;
	settings->headphoneLevel = BELA_INVALID_GAIN;
	parseAudioInputGains("", settings);
	parseHeadphoneLevels("", settings);
	parseLineOutLevels("", settings);
	settings->numMuxChannels = 0;
	settings->audioExpanderInputs = 0;
	settings->audioExpanderOutputs = 0;
	
	settings->verbose = 0;
	settings->pruNumber = 1;
	settings->pruFilename[0] = '\0';
	settings->detectUnderruns = 1;
	settings->enableLED = 1;
	settings->stopButtonPin = kBelaCapeButtonPin;
	settings->highPerformanceMode = 0;
	settings->board = BelaHw_NoHw;
	settings->projectName = NULL;

	// These deliberately have no command-line flags by default,
	// as it is unlikely the user would want to switch them
	// at runtime
	settings->interleave = 1;
	settings->analogOutputsPersist = 1;
	settings->uniformSampleRate = 0;
	settings->audioThreadStackSize = 1 << 20;
	settings->auxiliaryTaskStackSize = 1 << 20;

	// initialize the user-defined functions.
	// render is the only one that needs to be defined by the user in order
	// for the audio to start.
	settings->setup = NULL;
	settings->render = NULL;
	settings->cleanup = NULL;

	settings->ampMutePin = kAmplifierMutePin;
	settings->audioThreadDone = NULL;

	// read user default command line options CL= from userBelaConfig and
	// pass them on to Bela_getopt_long to override default settings.
	std::string belaConfig = IoUtils::readTextFile(userBelaConfig);
	std::string cl = ConfigFileUtils::readValueFromString(belaConfig, "CL");
	std::vector<std::string> args = StringUtils::split(cl, ' ', true);
	std::vector<char*> argv = StringUtils::makeArgv(args);

	optind = 1;
	gFirstRun = true;
	while (1) {
		// requested:: char *const *
		// argv.data() is const char **
		int c = Bela_getopt_long(argv.size(), argv.data(), "", NULL, settings);
		if (c != 0)
			break;
	}
	// reset globals for when the user code calls Bela_getopt_long again
	// with a different set of arguments.
	optind = 1;
	gFirstRun = true;
	if(Bela_userSettings != NULL)
	{
		Bela_userSettings(settings);
	}
}

// This function drops in place of getopt() in the main() function
// and handles the initialisation of the Bela settings using
// standard command-line arguments. System default arguments will
// be stored in settings, otherwise arguments will be returned
// as getopt() normally does.

int Bela_getopt_long(int argc, char * const argv[], const char *customShortOptions, const struct option *customLongOptions, BelaInitSettings *settings)
{
	static char totalShortOptions[256];
	static struct option totalLongOptions[256];

	int c;

	// Prep total option string the first time this is
	// run. As a getopt() substitute, it will be called repeatedly working its
	// way through argc and argv.
	if(gFirstRun) {
		gFirstRun = 0;

		// Copy short options into one string
		strcpy(totalShortOptions, gDefaultShortOptions);
		strncat(totalShortOptions, customShortOptions, 256 - strlen(gDefaultShortOptions) - 1);

		// Copy long options into one array
		int n = 0;
		while(1) {
			if(gDefaultLongOptions[n].name == NULL)
				break;
			totalLongOptions[n].name = gDefaultLongOptions[n].name;
			totalLongOptions[n].has_arg = gDefaultLongOptions[n].has_arg;
			totalLongOptions[n].flag = gDefaultLongOptions[n].flag;
			totalLongOptions[n].val = gDefaultLongOptions[n].val;
			n++;
		}

		// Copy custom options into the array, if present
		if(customLongOptions == 0) {
			// Terminate the array
			totalLongOptions[n].name = NULL;
			totalLongOptions[n].has_arg = 0;
			totalLongOptions[n].flag = NULL;
			totalLongOptions[n].val = 0;
		}
		else {
			int customIndex = 0;
			while(n < 256) {
				if(customLongOptions[customIndex].name == NULL)
					break;
				totalLongOptions[n].name = customLongOptions[customIndex].name;
				totalLongOptions[n].has_arg = customLongOptions[customIndex].has_arg;
				totalLongOptions[n].flag = customLongOptions[customIndex].flag;
				totalLongOptions[n].val = customLongOptions[customIndex].val;
				n++;
				customIndex++;
			}

			// Terminate the array
			totalLongOptions[n].name = NULL;
			totalLongOptions[n].has_arg = 0;
			totalLongOptions[n].flag = NULL;
			totalLongOptions[n].val = 0;
		}
	}

	while(1) {
		if ((c = getopt_long(argc, argv, totalShortOptions, totalLongOptions, NULL)) < 0)
			return c;

		switch (c) {
		case 'p':
			settings->periodSize = atoi(optarg);
			if(settings->periodSize < 1)
				settings->periodSize = 1;
			break;
		case 'v':
			settings->verbose = 1;
			break;
		case 'N':
			settings->useAnalog = atoi(optarg);
			break;
		case 'G':
			settings->useDigital = atoi(optarg);
			if(settings->useDigital == 0){
				settings->numDigitalChannels = 0;
			}
			break;
		case 'C': {
			// TODO: a different number of channels for inputs and outputs is not yet supported
			unsigned int numAnalogChannels = atoi(optarg);
			settings->numAnalogInChannels = numAnalogChannels;
			settings->numAnalogOutChannels = numAnalogChannels;
			if(numAnalogChannels >= 8) {
				// TODO: a different number of channels for inputs and outputs is not yet supported
				settings->numAnalogInChannels = 8;
				settings->numAnalogOutChannels = 8;
			}
			else if(numAnalogChannels >= 4){
				// TODO: a different number of channels for inputs and outputs is not yet supported
				settings->numAnalogInChannels = 4;
				settings->numAnalogOutChannels = 4;
			}
			else{
				// TODO: a different number of channels for inputs and outputs is not yet supported
				settings->numAnalogInChannels = 2;
				settings->numAnalogOutChannels = 2;
			}
			break;
		}
		case 'B':
			settings->numDigitalChannels = atoi(optarg);
			if(settings->numDigitalChannels >= 16)
				settings->numDigitalChannels = 16;
			else if (settings->numDigitalChannels < 1){
				settings->numDigitalChannels = 0;
				settings->useDigital = 0; //TODO: this actually works only if -G 0 is specified after -g 1.
											 //No worries, though: disabling numDigital will only prevent the pins from being exported.
			}
			break;
		case 'M':
			settings->beginMuted = atoi(optarg);
			break;
		case 'D':
			parseLineOutLevels(optarg, settings);
			break;
		case 'A':
			deprecatedWarning("-A/--adc-level", "--audio-input-gain", true);
			break;
		case 'H':
			if(!parseHeadphoneLevels(optarg, settings))
				std::cerr << "Warning: invalid headphone level settings '" << optarg << "'-- ignoring\n";
			break;
		case 'I':
			if(!parseAudioInputGains(optarg, settings))
				std::cerr << "Warning: invalid audio input gain settings '" << optarg << "'-- ignoring\n";
			break;
		case 'X':
			settings->numMuxChannels = atoi(optarg);
			break;
		case 'Y':
			if(!parseAudioExpanderChannels(optarg, true, settings))
				std::cerr << "Warning: invalid audio expander input channels '" << optarg << "'-- ignoring\n";
			break;
		case 'Z':
			if(!parseAudioExpanderChannels(optarg, false, settings))
				std::cerr << "Warning: invalid audio expander output channels '" << optarg << "'-- ignoring\n";
			break;			
		case OPT_PRU_FILE:
			if(strlen(optarg) < MAX_PRU_FILENAME_LENGTH)
				strcpy(settings->pruFilename, optarg);
			else
				std::cerr << "Warning: filename for the PRU code is too long (>" << MAX_PRU_FILENAME_LENGTH << " characters). Using embedded PRU code instead\n";
			break;
		case OPT_PGA_GAIN_LEFT:
			deprecatedWarning("--pga-gain-left", "--audio-input-gain");
			parseAudioInputGains((std::string("0,") + optarg).c_str(), settings);
			break;
		case OPT_PGA_GAIN_RIGHT:
			deprecatedWarning("--pga-gain-right", "--audio-input-gain");
			parseAudioInputGains((std::string("1,") + optarg).c_str(), settings);
			break;
		case OPT_PRU_NUMBER:
			settings->pruNumber = atoi(optarg);
			break;
		case OPT_DETECT_UNDERRUNS:
			settings->detectUnderruns = atoi(optarg);
			break;
		case OPT_DISABLE_LED:
			settings->enableLED = 0;
			break;
		case OPT_STOP_BUTTON_PIN:
			settings->stopButtonPin = atoi(optarg);
			break;
		case OPT_HIGH_PERFORMANCE_MODE:
			settings->highPerformanceMode = 1;
			break;
		case OPT_UNIFORM_SAMPLE_RATE:
			settings->uniformSampleRate = 1;
			break;
		case OPT_BOARD:
			settings->board = getBelaHw(std::string(optarg));
			break;
		case OPT_CODEC_MODE:
			settings->codecMode = strdup(optarg);
			break;
		case OPT_DISABLED_DIGITAL_CHANNELS:
		{
			uint32_t val = strtol(optarg, NULL, 10);
			if(val == 0) // try again, this time in hex
				val = strtol(optarg, NULL, 16);
			if(0 == val)
				fprintf(stderr, "--disabled-digital-channels was passed 0 as an argument (or the argument was not parsed properly)\n");
			settings->disabledDigitalChannels = val;
		}
			break;
		case '?':
		default:
			return c;
		}
	}
}

// This function prints standard usage information for default arguments
// Call from within your own usage function
void Bela_usage()
{
	std::cerr << "   --period [-p] period:               Set the hardware period (buffer) size in audio samples\n";
	std::cerr << "   --line-out-level [-D] dBs: changains Set the line output level\n";
	std::cerr << "   --adc-level [-A] dBs: changains     Set the ADC input level (0dB max; -12dB min). DEPRECATED: use --audio-input-gain instead\n";
	std::cerr << "   --pga-gain-left dBs:                Set the Programmable Gain Amplifier for the left audio channel (0dBmin; 59.5dB max; default: " << DEFAULT_PGA_GAIN << " dB). DEPRECATED: use --audio-input-gain instead\n";
	std::cerr << "   --pga-gain-right dBs:               Set the Programmable Gain Amplifier for the right audio channel (0dBmin; 59.5dB max; default:" << DEFAULT_PGA_GAIN << " dB). DEPRECATED: Use --audio-input-gain instead\n";
	std::cerr << "   --audio-input-gain [-I] changains:  Set the gain for the specified audio input channels (gain: 0dB min; 59.5dB max); default: " << DEFAULT_PGA_GAIN << " dB)\n";
	std::cerr << "   --hp-level [-H] changains:          Set the headphone output level (gain: 0dB max; -63.5dB min)\n";
	std::cerr << "   --mute-speaker [-M] val:            Set whether to mute the speaker initially (default: no)\n";
	std::cerr << "   --use-analog [-N] val:              Set whether to use ADC/DAC analog (default: yes)\n";
	std::cerr << "   --use-digital [-G] val:             Set whether to use digital GPIO channels (default: yes)\n";
	std::cerr << "   --analog-channels [-C] val:         Set the number of ADC/DAC channels (default: 8)\n";
	std::cerr << "   --digital-channels [-B] val:        Set the number of GPIO channels (default: 16)\n";
	std::cerr << "   --receive-port [-R] val:            Set the receive port (default: 9998)\n";
	std::cerr << "   --transmit-port [-T] val:           Set the transmit port (default: 9999)\n";
	std::cerr << "   --server-name [-S] val:             Set the destination server name (default: '127.0.0.1')\n";
	std::cerr << "   --mux-channels [-X] val:            Set the number of channels to use on the multiplexer capelet (default: not used)\n";
	std::cerr << "   --audio-expander-inputs [-Y] vals:  Set the analog inputs to use with audio expander (comma-separated list)\n";
	std::cerr << "   --audio-expander-outputs [-Z] vals: Set the analog outputs to use with audio expander (comma-separated list)\n";
	std::cerr << "   --pru-file val:                     Set an optional external file to use for the PRU binary code\n";
	std::cerr << "   --pru-number val:                   Set the PRU to use for I/O (options: 0 or 1, default: 1)\n";
	std::cerr << "   --detect-underruns val:             Set whether to warn the user in case of underruns (options: 0 or 1, default: 1)\n";
	std::cerr << "   --disable-led                       Disable the blinking LED indicator\n";
	std::cerr << "   --stop-button-pin                   What pin to monitor for stopping the program. Pass -1 to disable button monitoring\n";
	std::cerr << "   --high-performance-mode             Gives more CPU to the Bela process. The system may become unresponsive and you will have to use the button on the Bela cape when you want to stop it.\n";
	std::cerr << "   --uniform-sample-rate               Internally resample the analog channels so that they match the audio sample rate\n";
	std::cerr << "   --board val:                        Select a different board to work with\n";
	std::cerr << "   --codec-mode val:                   A codec-specific string representing an intialisation parameter\n";
	std::cerr << "   --disabled-digital-channels val:    A bitmask to disable specific digital channels\n";
	std::cerr << "   --verbose [-v]:                     Enable verbose logging information\n";
	std::cerr << " `changains` must be one or more `channel,gain` pairs. A negative channel number means all channels. A single value is interpreted as gain, with channel=-1\n";
}

// ---- internal functions ----

// Turn a string into a list of individual ints
bool parseCommaSeparatedList(const char *in, std::vector<int>& tokens) {
	std::string inputString(in);
    std::stringstream ss(inputString);
    std::string item;
	char *p;
	
    while (std::getline(ss, item, ',')) {
		// ignore empty tokens
		if(!item.empty()) {
			int value = strtol(item.c_str(), &p, 10);
			if(!(*p))	// string is a valid number
        		tokens.push_back(value);
			else
				return false;	// invalid token
		}
    }
    
	return true;
}

// append values to vec, or updates gains for existing channels. In case of error, vec is unmodified.
// Sets cga based on the final content of vec
static bool parseChannelGainPairs(BelaChannelGainArray& cga, std::vector<BelaChannelGain>& vec, const char* arg)
{
	std::vector<std::string> strs = StringUtils::split(arg, ',');
	// channel,gain pairs
	if(strs.size() % 2) {
		if(1 == strs.size()) {
			// single value x is equivalent to `-1,x`
			strs = {"-1", strs[0]};
		} else {
			// odd, non-1 count: bad format
			return false;
		}
	}
	std::vector<BelaChannelGain> newCg = vec;
	for(unsigned int n = 0; n < strs.size() / 2; ++n)
	{
		int channel = atoi(strs[n * 2].c_str());
		float gain = atof(strs[n * 2 + 1].c_str());
		// remove any old value(s) for the channel
		// before appending the new value
		for(auto m = newCg.begin(); m < newCg.end();)
		{
			if(m->channel == channel)
			{
				newCg.erase(m);
			}
			else
				++m;
		}
		newCg.push_back({
			.channel = channel,
			.gain = gain,
		});
	}
	vec = newCg;
	cga.length = vec.size();
	cga.data = vec.data();
	return true;
}

static bool parseLineOutLevels(const char* arg, BelaInitSettings* settings)
{
	static std::vector<BelaChannelGain> cg = {{ .channel = -1, .gain = DEFAULT_LINE_OUT_LEVEL, }};
	return parseChannelGainPairs(settings->lineOutGains, cg, arg);
}

static bool parseHeadphoneLevels(const char* arg, BelaInitSettings* settings)
{
	static std::vector<BelaChannelGain> cg = {{ .channel = -1, .gain = DEFAULT_HP_LEVEL, }};
	return parseChannelGainPairs(settings->headphoneGains, cg, arg);
}

static bool parseAudioInputGains(const char* arg, BelaInitSettings* settings)
{
	static std::vector<BelaChannelGain> cg = {{ .channel = -1, .gain = DEFAULT_PGA_GAIN, }};
	return parseChannelGainPairs(settings->audioInputGains, cg, arg);
}

// Parse the argument for the audio expander channels to enable
bool parseAudioExpanderChannels(const char *arg, bool inputChannel, BelaInitSettings *settings) {
	std::vector<int> channels;
	
	if(!parseCommaSeparatedList(arg, channels))
		return false;
	
	// Make sure that all channels are within range
	// Regardless of how many analog channels we're actually using,
	// the audio expander facility has slots for up to 16
	for(unsigned int i = 0; i < channels.size(); i++)
		if(channels[i] < 0 || channels[i] >= 16)
			return false;

	// Now update the audio expander data sructure 
	if(inputChannel) {
		// Update the audio expander inputs
		for(unsigned int i = 0; i < channels.size(); i++)
			settings->audioExpanderInputs |= (1 << channels[i]);
	}
	else {
		// Update the audio expander outputs
		for(unsigned int i = 0; i < channels.size(); i++)
			settings->audioExpanderOutputs |= (1 << channels[i]);
	}
	
	return true;
}


