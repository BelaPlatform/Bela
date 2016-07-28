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
#include <cstdio>
#include <libgen.h>
#include <signal.h>
#include <getopt.h>
#include <unistd.h>
#include <sys/time.h>
#include <sndfile.h>				// to load audio files
#include "SampleData.h"
#include <Bela.h>

using namespace std;

// Global variables used by getCurrentTime()
unsigned long long gFirstSeconds, gFirstMicroseconds;

// Load samples from file
int initFile(string file, SampleData *smp)//float *& smp)
{
	SNDFILE *sndfile;
	SF_INFO sfinfo;
    sfinfo.format = 0;
	if (!(sndfile = sf_open (file.c_str(), SFM_READ, &sfinfo))) {
		cout << "Couldn't open file " << file << ": " << sf_strerror(sndfile) << endl;
		return 1;
	}

	int numChan = sfinfo.channels;
	if(numChan != 1)
	{
		cout << "Error: " << file << " is not a mono file" << endl;
		return 1;
	}

	smp->sampleLen = sfinfo.frames * numChan;
	smp->samples = new float[smp->sampleLen];
	if(smp == NULL){
		cout << "Could not allocate buffer" << endl;
		return 1;
	}

	int subformat = sfinfo.format & SF_FORMAT_SUBMASK;
	int readcount = sf_read_float(sndfile, smp->samples, smp->sampleLen);

	// Pad with zeros in case we couldn't read whole file
	for(int k = readcount; k <smp->sampleLen; k++)
		smp->samples[k] = 0;

	if (subformat == SF_FORMAT_FLOAT || subformat == SF_FORMAT_DOUBLE) {
		double	scale ;
		int 	m ;

		sf_command (sndfile, SFC_CALC_SIGNAL_MAX, &scale, sizeof (scale)) ;
		if (scale < 1e-10)
			scale = 1.0 ;
		else
			scale = 32700.0 / scale ;
		cout << "File samples scale = " << scale << endl;

		for (m = 0; m < smp->sampleLen; m++)
			smp->samples[m] *= scale;
	}

	sf_close(sndfile);

	return 0;
}


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

/* Function which returns the time since start of the program
 * in (fractional) seconds.
 */
double getCurrentTime(void) {
	unsigned long long result;
	struct timeval tv;

	gettimeofday(&tv, NULL);
	result = (tv.tv_sec - gFirstSeconds) * 1000000ULL + (tv.tv_usec - gFirstMicroseconds);
	return (double)result / 1000000.0;
}
extern SampleData gSampleData;
int main(int argc, char *argv[])
{
	BelaInitSettings settings;	// Standard audio settings
	struct timeval tv;
	string fileName;			// Name of the sample to load

	struct option customOptions[] =
	{
		{"help", 0, NULL, 'h'},
		{"file", 1, NULL, 'f'},
		{NULL, 0, NULL, 0}
	};

	gSampleData.samples = 0;
	gSampleData.sampleLen = -1;

	// Set default settings
	Bela_defaultSettings(&settings);

	settings.periodSize = 32; // Larger period size by default, for testing

	// Parse command-line arguments
	while (1) {
		int c;
		if ((c = Bela_getopt_long(argc, argv, "hf:", customOptions, &settings)) < 0)
				break;
		switch (c) {
		case 'h':
				usage(basename(argv[0]));
				exit(0);
		case 'f':
				fileName = string((char *)optarg);
				break;
		case '?':
		default:
				usage(basename(argv[0]));
				exit(1);
		}
	}

	if(fileName.empty()){
		fileName = "longsample.wav";
	}


	// Load file
	if(initFile(fileName, &gSampleData) != 0)
	{
		cout << "Error: unable to load samples " << endl;
		return -1;
	}

	if(settings.verbose)
		cout << "File contains " << gSampleData.sampleLen << " samples" << endl;


	// Initialise the PRU audio device
	if(Bela_initAudio(&settings, &gSampleData) != 0) {
		cout << "Error: unable to initialise audio" << endl;
		return -1;
	}

	// Initialise time
	gettimeofday(&tv, NULL);
	gFirstSeconds = tv.tv_sec;
	gFirstMicroseconds = tv.tv_usec;

	// Start the audio device running
	if(Bela_startAudio()) {
		cout << "Error: unable to start real-time audio" << endl;
		return -1;
	}

	// Set up interrupt handler to catch Control-C
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
