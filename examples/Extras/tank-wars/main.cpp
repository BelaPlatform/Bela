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
#include <libraries/sndfile/sndfile.h>
#include <Bela.h>

extern int gScreenFramesPerSecond;

float *gMusicBuffer = 0;
int gMusicBufferLength = 0;
float *gSoundBoomBuffer = 0;
int gSoundBoomBufferLength = 0;
float *gSoundHitBuffer = 0;
int gSoundHitBufferLength = 0;


using namespace std;

// Load a sound sample from file
int loadSoundFile(const string& path, float **buffer, int *bufferLength)
{
	SNDFILE *sndfile ;
	SF_INFO sfinfo ;
	sfinfo.format = 0;
	if (!(sndfile = sf_open (path.c_str(), SFM_READ, &sfinfo))) {
		cout << "Couldn't open file " << path.c_str() << ": " << sf_strerror(sndfile) << endl;
		return 1;
	}

	int numChan = sfinfo.channels;
	if(numChan != 1)
	{
		cout << "Error: " << path << " is not a mono file" << endl;
		return 1;
	}

	*bufferLength = sfinfo.frames * numChan;
	*buffer = new float[*bufferLength];
	if(*buffer == 0){
		cout << "Could not allocate buffer" << endl;
		return 1;
	}

	int readcount = sf_read_float(sndfile, *buffer, *bufferLength);

	// Pad with zeros in case we couldn't read whole file
	for(int k = readcount; k < *bufferLength; k++)
		(*buffer)[k] = 0;

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

	cerr << "   --fps [-f] value:           Set target frames per second\n";
	cerr << "   --help [-h]:                Print this menu\n";
}

int main(int argc, char *argv[])
{
	BelaInitSettings* settings = Bela_InitSettings_alloc();	// Standard audio settings
	string musicFileName = "music.wav";
	string soundBoomFileName = "boom.wav";
	string soundHitFileName = "hit.wav";
	
	struct option customOptions[] =
	{
		{"help", 0, NULL, 'h'},
		{"fps", 1, NULL, 'f'},
		{NULL, 0, NULL, 0}
	};

	// Set default settings
	Bela_defaultSettings(settings);
	settings->setup = setup;
	settings->render = render;
	settings->cleanup = cleanup;

	// Parse command-line arguments
	while (1) {
		int c = Bela_getopt_long(argc, argv, "hf:", customOptions, settings);
		if (c < 0)
			break;
		int ret = -1;
		switch (c) {
			case 'f':
				gScreenFramesPerSecond = atoi(optarg);
				if(gScreenFramesPerSecond < 1)
					gScreenFramesPerSecond = 1;
				if(gScreenFramesPerSecond > 100)
					gScreenFramesPerSecond = 100;
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

	// Load the sound files
	if(loadSoundFile(musicFileName, &gMusicBuffer, &gMusicBufferLength) != 0) {
		cout << "Warning: unable to load sound file " << musicFileName << endl;
	}
	if(loadSoundFile(soundBoomFileName, &gSoundBoomBuffer, &gSoundBoomBufferLength) != 0) {
		cout << "Warning: unable to load sound file " << soundBoomFileName << endl;
	}
	if(loadSoundFile(soundHitFileName, &gSoundHitBuffer, &gSoundHitBufferLength) != 0) {
		cout << "Warning: unable to load sound file " << soundHitFileName << endl;
	}
	
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

	// Release sound files
	if(gMusicBuffer != 0)
		free(gMusicBuffer);
	if(gSoundBoomBuffer != 0)
		free(gSoundBoomBuffer);
	if(gSoundHitBuffer != 0)
		free(gSoundHitBuffer);
	
	// All done!
	return 0;
}
