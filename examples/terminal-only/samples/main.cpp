/*
 ____  _____ _        _    
| __ )| ____| |      / \   
|  _ \|  _| | |     / _ \  
| |_) | |___| |___ / ___ \ 
|____/|_____|_____/_/   \_\

The platform for ultra-low latency audio and sensor processing

https://bela.io

A project of the Augmented Instruments Laboratory within the
Centre for Digital Music at Queen Mary University of London.
http://www.eecs.qmul.ac.uk/~andrewm

(c) 2016 Augmented Instruments Laboratory: Andrew McPherson,
	Astrid Bin, Liam Donovan, Christian Heinrichs, Robert Jack,
	Giulio Moro, Laurel Pardue, Victor Zappi. All rights reserved.

The Bela software is distributed under the GNU Lesser General Public License
(LGPL 3.0), available here: https://www.gnu.org/licenses/lgpl-3.0.txt
*/

#include <iostream>
#include <cstdlib>
#include <libgen.h>
#include <signal.h>
#include <string>
#include <getopt.h>
#include <string.h>
#include "../include/Bela.h"

using namespace std;
static string fileName = "sample.wav"; // possibly overridden below

// Handle Ctrl-C by requesting that the audio rendering stop
void interrupt_handler(int var)
{
	Bela_requestStop();
}

// Print usage information
void usage(const char * processName)
{
	cerr << "Usage: " << processName << " [options]" << endl;

	Bela_usage();

	cerr << "   --file [-f] filename:               Name of the file to load (default is " << fileName << "\n";
	cerr << "   --help [-h]:                        Print this menu\n";
}

int main(int argc, char *argv[])
{
	BelaInitSettings* settings = Bela_InitSettings_alloc();	// Standard audio settings

	struct option customOptions[] =
	{
		{"help", 0, NULL, 'h'},
		{"file", 1, NULL, 'f'},
		{NULL, 0, NULL, 0}
	};

	// Set default settings
	Bela_defaultSettings(settings);
	settings->setup = setup;
	settings->render = render;
	settings->cleanup = cleanup;
	if(argc > 0 && argv[0])
	{
		char* nameWithSlash = strrchr(argv[0], '/');
		settings->projectName = nameWithSlash ? nameWithSlash + 1 : argv[0];
	}

	while (1) {
		int c = Bela_getopt_long(argc, argv, "hf:", customOptions, settings);
		if (c < 0)
		{
			break;
		}
		int ret = -1;
		switch (c) {
			case 'h':
				usage(basename(argv[0]));
				ret = 0;
				break;
			case 'f':
				fileName = (char *)optarg;
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

	// Initialise the PRU audio device
	if(Bela_initAudio(settings, (void*)fileName.c_str()) != 0) {
		Bela_InitSettings_free(settings);
		fprintf(stderr,"Error: unable to initialise audio\n");
		return 1;
	}
	Bela_InitSettings_free(settings);

	// Set up interrupt handler to catch Control-C and SIGTERM
	signal(SIGINT, interrupt_handler);
	signal(SIGTERM, interrupt_handler);

	// Start the audio device running
	if(Bela_startAudio()) {
		fprintf(stderr,"Error: unable to start real-time audio\n");
		// Stop the audio device
		Bela_stopAudio();
		// Clean up any resources allocated for audio
		Bela_cleanupAudio();
		return 1;
	}

	// Run until told to stop
	while(!Bela_stopRequested()) {
		usleep(100000);
	}

	// Stop the audio device
	Bela_stopAudio();

	// Clean up any resources allocated for audio
	Bela_cleanupAudio();

	// All done!
	return 0;
}
