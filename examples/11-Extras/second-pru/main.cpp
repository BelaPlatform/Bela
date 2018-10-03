/*
 * default_main.cpp
 *
 *  Created on: Oct 24, 2014
 *      Author: parallels
 */
#include <unistd.h>
#include <iostream>
#include <cstdlib>
#include <libgen.h>
#include <signal.h>
#include <getopt.h>
#include "../include/Bela.h"

using namespace std;

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

	cerr << "   --help [-h]:                Print this menu\n";
}

int main(int argc, char *argv[])
{
	BelaInitSettings* settings = Bela_InitSettings_alloc();	// Standard audio settings
	int userPRUNumber = 0;

	struct option customOptions[] =
	{
		{"help", 0, NULL, 'h'},
		{NULL, 0, NULL, 0}
	};

	// Set default settings
	Bela_defaultSettings(settings);
	settings->setup = setup;
	settings->render = render;
	settings->cleanup = cleanup;

	// Parse command-line arguments
	while (1) {
		int c = Bela_getopt_long(argc, argv, "h", customOptions, settings);
		if (c < 0)
			break;
		int ret = -1;
		switch (c) {
			case 'h':
				usage(basename(argv[0]));
				ret = 0;
				break;
			default:
				usage(basename(argv[0]));
				ret = 1;
				break;
		}
		if(ret >= 0)
		{
			Bela_InitSettings_free(settings);
			return ret;
		}
	}
	
	// Set user PRU to the opposite number as the default Bela PRU
	if(settings->pruNumber == 0)
		userPRUNumber = 1;
	else
		userPRUNumber = 0;

	// Initialise the PRU audio device
	if(Bela_initAudio(settings, &userPRUNumber) != 0) {
		Bela_InitSettings_free(settings);	
		cout << "Error: unable to initialise audio" << endl;
		return 1;
	}
	Bela_InitSettings_free(settings);

	// Start the audio device running
	if(Bela_startAudio()) {
		cout << "Error: unable to start real-time audio" << endl;
		return 1;
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
