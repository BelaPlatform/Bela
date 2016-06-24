/*
 * main.cpp
 *
 *  Created on: Oct 24, 2014
 *      Author: parallels
 */

#include <iostream>
#include <cstdlib>
#include <libgen.h>
#include <signal.h>
#include <getopt.h>
#include <Bela.h>

using namespace std;

int gNumOscillators = 32;
int gWavetableLength = 1024;

// Handle Ctrl-C by requesting that the audio rendering stop
void interrupt_handler(int var)
{
	gShouldStop = true;
}

// Print usage information
void usage(const char * processName)
{
	cerr << "Usage: " << processName << " [options]" << endl;

	Bela_usage();

	cerr << "   --num-oscillators [-n] oscs: Set the number of oscillators to use (default: 32)\n";
	cerr << "   --wavetable [-w] length:     Set the wavetable length in samples (default: 1024)\n";
	cerr << "   --help [-h]:                 Print this menu\n";
}

int main(int argc, char *argv[])
{
	BelaInitSettings settings;	// Standard audio settings

	struct option customOptions[] =
	{
		{"help", 0, NULL, 'h'},
		{"num-oscillators", 1, NULL, 'n'},
		{"wavetable", 1, NULL, 'w'},
		{NULL, 0, NULL, 0}
	};

	// Set default settings
	Bela_defaultSettings(&settings);

	// Parse command-line arguments
	while (1) {
		int c;
		if ((c = Bela_getopt_long(argc, argv, "hn:w:", customOptions, &settings)) < 0)
				break;
		switch (c) {
		case 'h':
				usage(basename(argv[0]));
				exit(0);
		case 'n':
				gNumOscillators = atoi(optarg);
				if(gNumOscillators <= 0) {
					usage(basename(argv[0]));
					exit(0);
				}
				break;
		case 'w':
				gWavetableLength = atoi(optarg);
				if(gWavetableLength < 4)
					gWavetableLength = 4;
				if(gWavetableLength > 16384)
					gWavetableLength = 16384;
				break;
		case '?':
		default:
				usage(basename(argv[0]));
				exit(1);
		}
	}

	// Initialise the PRU audio device
	if(Bela_initAudio(&settings, 0) != 0) {
		cout << "Error: unable to initialise audio" << endl;
		return -1;
	}

	if(settings.verbose) {
		cout << "--> Using " << gNumOscillators << " oscillators and wavetable of " << gWavetableLength << " samples\n";
	}

	// Start the audio device running
	if(Bela_startAudio()) {
		cout << "Error: unable to start real-time audio" << endl;
		return -1;
	}

	// Set up interrupt handler to catch Control-C and SIGTERM
	signal(SIGINT, interrupt_handler);
	signal(SIGTERM, interrupt_handler);

	// Run until told to stop
	while(!gShouldStop) {
		usleep(100000);
	}

	// Stop the audio device
	Bela_stopAudio();

	// Clean up any resources allocated for audio
	Bela_cleanupAudio();

	// All done!
	return 0;
}
