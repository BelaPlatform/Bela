/*
 * RTAudioCommandLine.cpp
 *
 *  Created on: Nov 8, 2014
 *      Author: parallels
 */

#include <iostream>
#include <cstdlib>
#include <cstring>
#include <vector>
#include <sstream>
#include <getopt.h>
#include "../include/Bela.h"
#include "../include/board_detect.h"

#define OPT_PRU_FILE 1000
#define OPT_PGA_GAIN_LEFT 1001
#define OPT_PGA_GAIN_RIGHT 1002
#define OPT_PRU_NUMBER 1003
#define OPT_DISABLE_LED 1004
#define OPT_DISABLE_CAPE_BUTTON 1005
#define OPT_DETECT_UNDERRUNS 1006
#define OPT_UNIFORM_SAMPLE_RATE 1007
#define OPT_HIGH_PERFORMANCE_MODE 1008
#define OPT_BOARD 1009


enum {
	kAmplifierMutePin = 61	// P8-26 controls amplifier mute
};

bool parseAudioExpanderChannels(const char *arg, bool inputChannel, BelaInitSettings *settings);

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
	{"dac-level", 1, NULL, 'D'},
	{"adc-level", 1, NULL, 'A'},
	{"pga-gain-left", 1, NULL, OPT_PGA_GAIN_LEFT},
	{"pga-gain-right", 1, NULL, OPT_PGA_GAIN_RIGHT},
	{"hp-level", 1, NULL, 'H'},
	{"mux-channels", 1, NULL, 'X'},
	{"audio-expander-inputs", 1, NULL, 'Y'},
	{"audio-expander-outputs", 1, NULL, 'Z'},
	{"pru-file", 1, NULL, OPT_PRU_FILE},
	{"pru-number", 1, NULL, OPT_PRU_NUMBER},
	{"detect-underruns", 1, NULL, OPT_DETECT_UNDERRUNS},
	{"disable-led", 0, NULL, OPT_DISABLE_LED},
	{"disable-cape-button-monitoring", 0, NULL, OPT_DISABLE_CAPE_BUTTON},
	{"high-performance-mode", 0, NULL, OPT_HIGH_PERFORMANCE_MODE},
	{"uniform-sample-rate", 0, NULL, OPT_UNIFORM_SAMPLE_RATE},
	{"board", 1, NULL, OPT_BOARD},
	{NULL, 0, NULL, 0}
};

const char gDefaultShortOptions[] = "p:vN:M:C:D:A:H:G:B:X:Y:Z:";


BelaInitSettings* Bela_InitSettings_alloc()
{
	return (BelaInitSettings*) malloc(sizeof(BelaInitSettings));
}

void Bela_InitSettings_free(BelaInitSettings* settings)
{
	free(settings);
}

// This function sets the default settings for the BelaInitSettings structure
void Bela_defaultSettings(BelaInitSettings *settings)
{
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
	settings->dacLevel = DEFAULT_DAC_LEVEL;
	settings->adcLevel = DEFAULT_ADC_LEVEL;
	for(int n = 0; n < 2; n++)
		settings->pgaGain[n] = DEFAULT_PGA_GAIN;
	settings->headphoneLevel = DEFAULT_HP_LEVEL;
	settings->numMuxChannels = 0;
	settings->audioExpanderInputs = 0;
	settings->audioExpanderOutputs = 0;
	
	settings->verbose = 0;
	settings->pruNumber = 1;
	settings->pruFilename[0] = '\0';
	settings->detectUnderruns = 1;
	settings->enableLED = 1;
	settings->enableCapeButtonMonitoring = 1;
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
	if(Bela_userSettings != NULL)
	{
		Bela_userSettings(settings);
	}
}

// This function drops in place of getopt() in the main() function
// and handles the initialisation of the RTAudio settings using
// standard command-line arguments. System default arguments will
// be stored in settings, otherwise arguments will be returned
// as getopt() normally does.

int Bela_getopt_long(int argc, char *argv[], const char *customShortOptions, const struct option *customLongOptions, BelaInitSettings *settings)
{
	static int firstRun = 1;
	static char totalShortOptions[256];
	static struct option totalLongOptions[256];

	int c;

	// Prep total option string the first time this is
	// run. As a getopt() substitute, it will be called repeatedly working its
	// way through argc and argv.
	if(firstRun) {
		firstRun = 0;

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
			settings->dacLevel = atof(optarg);
			break;
		case 'A':
			settings->adcLevel = atof(optarg);
			break;
		case 'H':
			settings->headphoneLevel = atof(optarg);
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
			settings->pgaGain[0] = atof(optarg);
			break;
		case OPT_PGA_GAIN_RIGHT:
			settings->pgaGain[1] = atof(optarg);
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
		case OPT_DISABLE_CAPE_BUTTON:
			settings->enableCapeButtonMonitoring = 0;
			break;
		case OPT_HIGH_PERFORMANCE_MODE:
			settings->highPerformanceMode = 1;
			break;
		case OPT_UNIFORM_SAMPLE_RATE:
			settings->uniformSampleRate = 1;
			printf("Uniform sample rate\n");
			break;
		case OPT_BOARD:
			settings->board = getBelaHw(std::string(optarg));
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
	std::cerr << "   --dac-level [-D] dBs:               Set the DAC output level (0dB max; -63.5dB min)\n";
	std::cerr << "   --adc-level [-A] dBs:               Set the ADC input level (0dB max; -12dB min)\n";
	std::cerr << "   --pga-gain-left dBs:                Set the Programmable Gain Amplifier for the left audio channel (0dBmin; 59.5dB max; default: 16dB)\n";
	std::cerr << "   --pga-gain-right dBs:               Set the Programmable Gain Amplifier for the right audio channel (0dBmin; 59.5dB max; default: 16dB)\n";
	std::cerr << "   --hp-level [-H] dBs:                Set the headphone output level (0dB max; -63.5dB min)\n";
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
	std::cerr << "   --pru-number val:                   Set the PRU to use for I/O (options: 0 or 1, default: 0)\n";
	std::cerr << "   --detect-underruns val:             Set whether to warn the user in case of underruns (options: 0 or 1, default: 1)\n";
	std::cerr << "   --disable-led                       Disable the blinking LED indicator\n";
	std::cerr << "   --disable-cape-button-monitoring    Disable the monitoring of the Bela cape button (which otherwise stops the running program)\n";
	std::cerr << "   --high-performance-mode             Gives more CPU to the Bela process. The system may become unresponsive and you will have to use the button on the Bela cape when you want to stop it.\n";
	std::cerr << "   --uniform-sample-rate               Internally resample the analog channels so that they match the audio sample rate\n";
	std::cerr << "   --board val:                        Select a different board to work with\n";
	std::cerr << "   --verbose [-v]:                     Enable verbose logging information\n";
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


