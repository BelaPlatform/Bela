/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Gui/sequencer/render.cpp

Make your own drum patterns with Bela
=====================================

This project uses Bela GUI library to build a drum sample sequencer, and it is a good example of sending data back and forth
between Bela (render.cpp) and the GUI (sketch.js). The GUI displays an 8x8 matrix of rectangles, in which each column
is a beat and each row corresponds to a speceific WAV sound file that is loaded to the project and stored in a buffer.
The user can activate and deactivate the rectangles by clicking on them. For each beat, Bela will receive from
the GUI the sound files for that column which are active and it will play them. At the same time, Bela will send
a message back to the GUI on each beat to update what is shown.

How to read several samples simultaneously
=========================================

Note that for each beat we can have up to eight different sounds playing simultaneously (more if a sound is still playing
from the previous beat!) so we need multiple read pointers reading from multiple buffers at the same time.
An easy way to achieve this is to generate a series of read pointers (i.e., an array of ints where each int will indicate
the position of the file sound where we should read).

When a sound starts playing we will assign a new read pointer to the specific buffer. This will tell in the position where
we are reading. For example let's say sample number 5 (i.e. gDrumSampleBuffers[4]) starts playing when no other sound
is playing. Then, we will assign the first available read pointer to that buffer. As no other sound is playing,
then gReadPointers[0] will keep track of where in the buffer we are reading. Additionally we need an array to store the fact
that gReadPointers[0] corresponds to gDrumSampleBuffers[4]. Thus, the array gDrumBufferForReadPointer[] will indicate this.
This means that gDrumBufferForReadPointer[0]=4;
*/

#include <iostream>
#include <libraries/sndfile/sndfile.h>
#include <libraries/Gui/Gui.h>
#include <Bela.h>
#include <cmath>
#include "drums.h"

using namespace std;



//Create a new GUI object
Gui myGui;

//sound buffers
float *gDrumSampleBuffers[NUMBER_OF_DRUMS];
//array for storing the length of each buffer
int gDrumSampleBufferLengths[NUMBER_OF_DRUMS];

//this array tells us which readpointer points to which buffer.
int gDrumBufferForReadPointer[NUMBER_OF_READPOINTERS];
//the actual read pointers
int gReadPointers[NUMBER_OF_READPOINTERS];
//array to store the pattern to be played (i.e, which drums to be played on each beat)
//For example, gPattern = {1,0,1,0,0,0,0,0} means that in that beat, sounds 0 and 2 will be played simoultaneously
int gPattern[NUMBER_OF_DRUMS][PATTERN_LENGTH];
int gPatternLength = PATTERN_LENGTH;

//time interval between each beat, in millliseconds. As the user move the (speed) slider in the GUI, then it will send
//a new value to be stored in this variable.
int gEventIntervalMilliseconds = 150;

//gCounter will count how many frames have ellapsed since the beginning of the current beat, and it will be reset
//when moving to the next beat.
//Then, it will reset every audioSampleRate * gEventIntervalMilliseconds /1000
int gCounter = 0;

//variable that keeps track of the beats of the bar (8 beats from 0 to 7)
int gCurrentBeat = 0;

//if user presses the PLAY/STOP button, this event will be sent from the GUI and change the value of gIsPlaying (0 or 1)
int gIsPlaying = 0;




bool setup(BelaContext *context, void *userData)
{
	//First we call the function that loads the drum sounds (WAV files)
	if(initDrums()) {
		//if unable, we stop.
		printf("Unable to load drum sounds. Check that you have all the WAV files!\n");
		return -1;
	}

	//initialize gPattern with all sounds off.
	for (int i = 0; i<NUMBER_OF_DRUMS; i++){
		for (int j = 0; j<PATTERN_LENGTH; j++){
			gPattern[i][j]= 0;
		}
	}


	//setup the GUI
	myGui.setup(context->projectName);

	// Setup a buffer of floats (holding a maximum of 10 values) to be received from the GUI
	myGui.setBuffer('f', 11); // Index = 0
	return true;
}



void render(BelaContext *context, void *userData)
{

	for (unsigned int n = 0; n < context->audioFrames; n++) {

		//increase the counter for each audio frame
		gCounter++;

		//if the counter has got to the threshold, it means we got to the next beat, so we:
		//  1) Reset counter
		//  2) calculate the new pattern to be played in the next beat (which specific drum/sounds to activate)
		//  3) If play button is on, trigger next event (i.e, activate the corresponding buffers)
		if (gCounter * 1000 / context->audioSampleRate >= gEventIntervalMilliseconds ){
			gCounter=0;
			updatePattern();
			if ((int) gIsPlaying == 1) {
				startNextBeat();
			}
		}
		//Now, we move forward the active read pointers, and turn off the ones that have reached the end of the buffer
		//REMEMBER, although we have 8 sound samples (buffers), we have 16 readpointers, as the same sound could be played
		//twice at the same time (e.g. is a sound sample is longer than the beat duration)
		for (int i=0;i<16;i++) {
			//read pointers that are active have a value between 0 and the buffer length to which is pointing to
			if (gDrumBufferForReadPointer[i]>=0){
				//active read pointers will move to the next frame
				if (gReadPointers[i] < gDrumSampleBufferLengths[gDrumBufferForReadPointer[i]]) {
					gReadPointers[i]++;
				}
				//if the read pointer got to the limit of the buffer, then we deactivate it, setting its value to -1
				else {
					//reset the read pointer
					gReadPointers[i]=0;
					//free the read pointer to be used by other buffer
					gDrumBufferForReadPointer[i]=-1;
				}
			}
		}

		//initially output in silence
		float out = 0;

		//write buffer values of active read pointers to the output
		for (int i=0;i<16;i++){
			if (gDrumBufferForReadPointer[i]>=0)
				out += gDrumSampleBuffers[gDrumBufferForReadPointer[i]][gReadPointers[i]];
		}
		//reduce amplitude to avoid clipping
		out /= 2;

		//write to both channels
		audioWrite(context,n,0,out/2);
		audioWrite(context,n,1,out/2);

	}

}

//function called when we move to the next beat. It reads the active drums in the GUI and stores them in gPattern
void updatePattern() {

	// Get buffer 0	sent from the GUI
	DataBuffer buffer = myGui.getDataBuffer(0);
	// Retrieve contents of the buffer as floats
	float* data = buffer.getAsFloat();

	//If the GUI tab is inactive, the sketch.js file will stop looping, so we will read always the same value.
	//We check that the GUI sketch is active by checking if the beat sent from the GUI is the current beat.
	if ((int)data[10]==gCurrentBeat){

		//copy values to gPattern. Values are 1 if drum "i" is active for the current beat, and 0 if not
		for (unsigned int i = 0; i < 8; i++){
			gPattern[i][gCurrentBeat] = (int)data[i];
		}

		//read slider value sent from the GUI, and map it to proper values of event intervals
		gEventIntervalMilliseconds=400-(int)data[8];
		//read status of PLAY/STOP button from GUI
		gIsPlaying = (int)data[9];
	}
}

//Start playing the next beat
//This function is called in render when we move to the next beat. It checks which drums are contained in the next beat
//and it calls startPlayingDrum() to start playing each one of the drums contained in that beat.
void startNextBeat() {

	//we loop through gPattern. If gPattern[i]==1, that means drum "i" should be played
	for (int i = 0; i < NUMBER_OF_DRUMS; i++){
		if (gPattern[i][gCurrentBeat]){
			startPlayingDrum(i);
		}
	}

	//update the beat index (between 0 and 7), and send it to the GUI
	gCurrentBeat++;
	if(gCurrentBeat > 7)
	gCurrentBeat = 0;
	myGui.sendBuffer(1, gCurrentBeat);




}



//Start playing a particular drum sound given by drumIndex (function called by startNextBeat() )

void startPlayingDrum(int drumIndex) {

	//we loop through gDrumBufferForReadPointer array, looking for a free readpointer (i.e. with value = -1)
	for (int i=0; i < 16;i++){
		//if readpointer "i" is not in use, that means that gDrumBufferForReadPointer[i]==-1
		if (gDrumBufferForReadPointer[i] == -1) {
			//we assign drum (buffer) with index "drumIndex" to readpointer "i"
			gDrumBufferForReadPointer[i]=drumIndex;
			//we reset the value of readpointer "i", so it reads the buffer from the beginning
			gReadPointers[i]=0;
			//exit for loop
			break;
		}

	}


}

//Function that stores each sound file in gDrumSampleBuffers.
//gDrumSampleBuffers[0] will contain the first sound file, gDrumSampleBuffers[1] the second one, and so on...
int initDrums() {
	//Load drums from WAV files
	SNDFILE *sndfile ;
	SF_INFO sfinfo ;
	char filename[64];

	for(int i = 0; i < NUMBER_OF_DRUMS; i++) {
		snprintf(filename, 64, "./drum%d.wav", i);

		if (!(sndfile = sf_open (filename, SFM_READ, &sfinfo))) {
			printf("Couldn't open file %s\n", filename);

			//Free already loaded sounds
			for(int j = 0; j < i; j++)
				free(gDrumSampleBuffers[j]);
			return 1;
		}

		if (sfinfo.channels != 1) {
			printf("Error: %s is not a mono file\n", filename);

			//Free already loaded sounds
			for(int j = 0; j < i; j++)
				free(gDrumSampleBuffers[j]);
			return 1;
		}

		gDrumSampleBufferLengths[i] = sfinfo.frames;
		gDrumSampleBuffers[i] = (float *)malloc(gDrumSampleBufferLengths[i] * sizeof(float));
		if(gDrumSampleBuffers[i] == NULL) {
			printf("Error: couldn't allocate buffer for %s\n", filename);

			//Free already loaded sounds
			for(int j = 0; j < i; j++)
				free(gDrumSampleBuffers[j]);
			return 1;
		}

		int subformat = sfinfo.format & SF_FORMAT_SUBMASK;
		int readcount = sf_read_float(sndfile, gDrumSampleBuffers[i], gDrumSampleBufferLengths[i]);

		//Pad with zeros in case we couldn't read whole file
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



// Release any resources that were allocated
void cleanup(BelaContext *context, void *userData)
{
	cleanupDrums();
}

void cleanupDrums() {
	for(int i = 0; i < NUMBER_OF_DRUMS; i++)
		free(gDrumSampleBuffers[i]);
}
