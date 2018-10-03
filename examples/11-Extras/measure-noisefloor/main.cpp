/*
 ____  _____ _        _    
| __ )| ____| |      / \   
|  _ \|  _| | |     / _ \  
| |_) | |___| |___ / ___ \ 
|____/|_____|_____/_/   \_\

The platform for ultra-low latency audio and sensor processing

http://bela.io

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
#include <getopt.h>
#include <Bela.h>

extern int gBufferSize;

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

	cerr << "   --buffer-size [-b] size  Set the analysis buffer size\n";
	cerr << "   --help [-h]:             Print this menu\n";
}

int main(int argc, char *argv[])
{
	BelaInitSettings* settings = Bela_InitSettings_alloc();	// Standard audio settings

	struct option customOptions[] =
	{
		{"help", 0, NULL, 'h'},
		{"buffer-size", 1, NULL, 'b'},
		{NULL, 0, NULL, 0}
	};

	// Set default settings
	Bela_defaultSettings(settings);
	settings->setup = setup;
	settings->render = render;
	settings->cleanup = cleanup;

	// By default use a longer period size because latency is not an issue
	settings->periodSize = 32;

	// Parse command-line arguments
	while (1) {
		int c = Bela_getopt_long(argc, argv, "hb:", customOptions, settings);
		if (c < 0)
			break;
		int ret = -1;
		switch (c) {
			case 'b':
				gBufferSize = atoi(optarg);
				break;
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
	
	if(gBufferSize < settings->periodSize)
		gBufferSize = settings->periodSize;

	// Initialise the PRU audio device
	if(Bela_initAudio(settings, 0) != 0) {
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
