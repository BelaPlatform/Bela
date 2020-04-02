/*
 * assignment2_drums
 * ECS7012 Music and Audio Programming
 *
 * Second assignment, to create a sequencer-based
 * drum machine which plays sampled drum sounds in loops.
 *
 * This code runs on the Bela embedded audio platform (bela.io).
 *
 * Andrew McPherson, Becky Stewart and Victor Zappi
 * 2015-2020
 */
#include <iostream>
#include <cstdlib>
#include <cstring>
#include <libgen.h>
#include <signal.h>
#include <getopt.h>
#include <libraries/sndfile/sndfile.h>
#include <libraries/Gui/Gui.h>
#include <Bela.h>
#include <cmath>
#include "drums.h"

using namespace std;




Gui myGui;

/* Variables which are given to you: */

/* Drum samples are pre-loaded in these buffers. Length of each
 * buffer is given in gDrumSampleBufferLengths.
 */
float *gDrumSampleBuffers[NUMBER_OF_DRUMS];
int gDrumSampleBufferLengths[NUMBER_OF_DRUMS];

			/* Whether we should play or not. Implement this in Step 4b. */


int pattern2[8]={};
int gCounter = 0;
int gBeats = 0;
int gReadPointers[16];
int playedDrums[16];
int gDrumBufferForReadPointer[16] = {0};

void updatePatterns();

int gButtonPressed = 1;
int gAccelState = 0;

/* Patterns indicate which drum(s) should play on which beat.
 * Each element of gPatterns is an array, whose length is given
 * by gPatternLengths.
 */
int *gPatterns[NUMBER_OF_PATTERNS];
int gPatternLengths[NUMBER_OF_PATTERNS];

/* These variables indicate which pattern we're playing, and
 * where within the pattern we currently are. Used in Step 4c.
 */
int gCurrentPattern = 0;
int gCurrentIndexInPattern = 0;

/* This variable holds the interval between events in **milliseconds**
 * To use it (Step 4a), you will need to work out how many samples
 * it corresponds to.
 */
int gEventIntervalMilliseconds = 150;

/* This variable indicates whether samples should be triggered or
 * not. It is used in Step 4b, and should be set in gpio.cpp.
 */
int gIsPlaying = 1;

/* This indicates whether we should play the samples backwards.
 */
int gPlaysBackwards = 0;

/* For bonus step only: these variables help implement a fill
 * (temporary pattern) which is triggered by tapping the board.
 */
int gShouldPlayFill = 0;
int gPreviousPattern = 0;

/* TODO: Declare any further global variables you need here */

// setup() is called once before the audio rendering starts.
// Use it to perform any initialisation and allocation which is dependent
// on the period size or sample rate.
//
// userData holds an opaque pointer to a data structure that was passed
// in from the call to initAudio().
//
// Return true on success; returning false halts the program.



/* Start playing a particular drum sound given by drumIndex.
 */
void startPlayingDrum(int drumIndex) {

for (int i=0; i < 16;i++){
	if (gDrumBufferForReadPointer[i] == -1) {
		gDrumBufferForReadPointer[i]=drumIndex;
		gReadPointers[i]=0;
		break;
	}
	
}	
	
	
}

/* Start playing the next event in the pattern */
void startNextEvent() {


// Retrieve contents of the buffer as floats


	
	for (int i = 0; i<16;i++){
		int doPlay = eventContainsDrum(pattern2[gCurrentIndexInPattern],i);
		if (doPlay){
			startPlayingDrum(i);
		    playedDrums[i]=1;	
		}
		else
			playedDrums[i]=0;
	}
	
	gCurrentIndexInPattern++;
	if (gCurrentIndexInPattern >= gPatternLengths[2])
		gCurrentIndexInPattern=0;


gBeats++;
if(gBeats > 7)
gBeats = 0;
myGui.sendBuffer(2, gBeats);

myGui.sendBuffer(1, playedDrums);

	
}

/* Returns whether the given event contains the given drum sound */
int eventContainsDrum(int event, int drum) {
	if(event & (1 << drum)){
		return 1;
	
	}
	return 0;
}


int initDrums() {
	/* Load drums from WAV files */
	SNDFILE *sndfile ;
	SF_INFO sfinfo ;
	char filename[64];

	for(int i = 0; i < NUMBER_OF_DRUMS; i++) {
		snprintf(filename, 64, "./drum%d.wav", i);

		if (!(sndfile = sf_open (filename, SFM_READ, &sfinfo))) {
			printf("Couldn't open file %s\n", filename);

			/* Free already loaded sounds */
			for(int j = 0; j < i; j++)
				free(gDrumSampleBuffers[j]);
			return 1;
		}

		if (sfinfo.channels != 1) {
			printf("Error: %s is not a mono file\n", filename);

			/* Free already loaded sounds */
			for(int j = 0; j < i; j++)
				free(gDrumSampleBuffers[j]);
			return 1;
		}

		gDrumSampleBufferLengths[i] = sfinfo.frames;
		gDrumSampleBuffers[i] = (float *)malloc(gDrumSampleBufferLengths[i] * sizeof(float));
		if(gDrumSampleBuffers[i] == NULL) {
			printf("Error: couldn't allocate buffer for %s\n", filename);

			/* Free already loaded sounds */
			for(int j = 0; j < i; j++)
				free(gDrumSampleBuffers[j]);
			return 1;
		}

		int subformat = sfinfo.format & SF_FORMAT_SUBMASK;
		int readcount = sf_read_float(sndfile, gDrumSampleBuffers[i], gDrumSampleBufferLengths[i]);

		/* Pad with zeros in case we couldn't read whole file */
		for(int k = readcount; k < gDrumSampleBufferLengths[i]; k++)
			gDrumSampleBuffers[i][k] = 0;

		if (subformat == SF_FORMAT_FLOAT || subformat == SF_FORMAT_DOUBLE) {
			double	scale ;
			int 	m ;

			sf_command (sndfile, SFC_CALC_SIGNAL_MAX, &scale, sizeof (scale)) ;
			if (scale < 1e-10)
				scale = 1.0 ;
			else
				scale = 32700.0 / scale ;
			printf("Scale = %f\n", scale);

			for (m = 0; m < gDrumSampleBufferLengths[i]; m++)
				gDrumSampleBuffers[i][m] *= scale;
		}

		sf_close(sndfile);
	}

	return 0;
}

void cleanupDrums() {
	for(int i = 0; i < NUMBER_OF_DRUMS; i++)
		free(gDrumSampleBuffers[i]);
}

void initPatterns() {
	int pattern0[16] = {0x01, 0x40, 0, 0, 0x02, 0, 0, 0, 0x20, 0, 0x01, 0, 0x02, 0, 0x04, 0x04};
	int pattern1[32] = {0x09, 0, 0x04, 0, 0x06, 0, 0x04, 0,
		 0x05, 0, 0x04, 0, 0x06, 0, 0x04, 0x02,
		 0x09, 0, 0x20, 0, 0x06, 0, 0x20, 0,
		 0x05, 0, 0x20, 0, 0x06, 0, 0x20, 0};
	//int pattern2[16] = {0x11, 0, 0x10, 0x01, 0x12, 0x40, 0x04, 0x40, 0x11, 0x42, 0x50, 0x01, 0x12, 0x21, 0x30, 0x20};
	pattern2[0] = 17;
	pattern2[1] = 0;
	pattern2[2] = 0x10;
	pattern2[3] = 0x01;
	pattern2[4] = 0x12;
	pattern2[5] = 0x40;
	pattern2[6] = 0x04;
	pattern2[7] = 0x40;
	
	int pattern3[32] = {0x81, 0x80, 0x80, 0x80, 0x01, 0x80, 0x80, 0x80, 0x81, 0, 0, 0, 0x41, 0x80, 0x80, 0x80,
		0x81, 0x80, 0x80, 0, 0x41, 0, 0x80, 0x80, 0x81, 0x80, 0x80, 0x80, 0xC1, 0, 0, 0};
	int pattern4[16] = {0x81, 0x02, 0, 0x81, 0x0A, 0, 0xA1, 0x10, 0xA2, 0x11, 0x46, 0x41, 0xC5, 0x81, 0x81, 0x89};

	gPatternLengths[0] = 16;
	gPatterns[0] = (int *)malloc(gPatternLengths[0] * sizeof(int));
	memcpy(gPatterns[0], pattern0, gPatternLengths[0] * sizeof(int));

	gPatternLengths[1] = 32;
	gPatterns[1] = (int *)malloc(gPatternLengths[1] * sizeof(int));
	memcpy(gPatterns[1], pattern1, gPatternLengths[1] * sizeof(int));

	gPatternLengths[2] = 8;
	gPatterns[2] = (int *)malloc(gPatternLengths[2] * sizeof(int));
	memcpy(gPatterns[2], pattern2, gPatternLengths[2] * sizeof(int));

	gPatternLengths[3] = 32;
	gPatterns[3] = (int *)malloc(gPatternLengths[3] * sizeof(int));
	memcpy(gPatterns[3], pattern3, gPatternLengths[3] * sizeof(int));

	gPatternLengths[4] = 16;
	gPatterns[4] = (int *)malloc(gPatternLengths[4] * sizeof(int));
	memcpy(gPatterns[4], pattern4, gPatternLengths[4] * sizeof(int));

	gPatternLengths[5] = 16;
	gPatterns[5] = (int *)malloc(gPatternLengths[5] * sizeof(int));
	memcpy(gPatterns[5], pattern4, gPatternLengths[5] * sizeof(int));
}

void updatePatterns() {
	
// Get buffer 0		
		DataBuffer buffer = myGui.getDataBuffer(0);
		// Retrieve contents of the buffer as floats
		float* data = buffer.getAsFloat();
		int y=0;
	    for (int i=0;i<8;i++){
	        y+=pow(2,i)*(int)data[i];
	        //rt_printf("%i",(int)data[i]);
	    }
	    //rt_printf(" \n");
			//pattern2[i]=(int)data[i];
			pattern2[gBeats]=y;
		
gEventIntervalMilliseconds=400-(int)data[8];
gIsPlaying = (int)data[9];

}


void cleanupPatterns() {
	for(int i = 0; i < NUMBER_OF_PATTERNS; i++)
		free(gPatterns[i]);
}




bool setup(BelaContext *context, void *userData)
{
	/* Step 2: initialise GPIO pins */
	if(initDrums()) {
    	printf("Unable to load drum sounds. Check that you have all the WAV files!\n");
    	return -1;
    }
    initPatterns();
	
	myGui.setup(context->projectName);
	
	// Setup buffer of floats (holding a maximum of 2 values)
	myGui.setBuffer('f', 10); // Index = 0
	
	
	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available). If only audio is available, numMatrixFrames
// will be 0.

void render(BelaContext *context, void *userData)
{


//rt_printf("combined: %i", value);
//gIsPlaying = 1;


//int speed = map(value,0,3.3/4.096,50,1000);

	
	
	for (int n = 0; n < context->audioFrames; n++) {
	
		
		
		
		
	   //gEventIntervalMilliseconds = 500;
		
		gCounter++;
		
		
		if (gCounter * 1000 / context->audioSampleRate >= gEventIntervalMilliseconds ){
		    gCounter=0;
		    updatePatterns();
		    if ((int) gIsPlaying == 0) {
		    startNextEvent();
		    }
		    
		    
		}
		
		
		
		
    
  
        for (int i=0;i<16;i++) {
    	if (gDrumBufferForReadPointer[i]>=0){
    		if (gReadPointers[i] < gDrumSampleBufferLengths[gDrumBufferForReadPointer[i]]) {
    			gReadPointers[i]++;
    	
    				
    		}
    		else {
    			gReadPointers[i]=0;
    			gDrumBufferForReadPointer[i]=-1;
    		}
    		
    		
    	}
    	
    }
    
    //initially output in silence
    float out = 0;
    
    //if gReadPointer hasn't got until the end of the buffer, write the sample to out and increase gReadPointer by one 
    // when gReadPointer == gDrumSampleBufferLengths[] then it stay on that value until the button is pressed again
    for (int i=0;i<16;i++){
    if (gDrumBufferForReadPointer[i]>=0) {
    	out += gDrumSampleBuffers[gDrumBufferForReadPointer[i]][gReadPointers[i]];
	
    }
    }
    
    out /= 2;
    
	//write to both channels
	audioWrite(context,n,0,out/2);
	audioWrite(context,n,1,out/2);


	

	
	
	}
	
	
	}


// cleanup_render() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in initialise_render().

void cleanup(BelaContext *context, void *userData)
{
cleanupPatterns();
cleanupDrums();
}



