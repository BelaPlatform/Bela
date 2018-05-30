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


#include <Bela.h>
#include <sys/types.h>
#include "SampleData.h"

SampleData gSampleData;	// User defined structure to get complex data from main
int gReadPtr;			// Position of last read sample from file

bool initialise_trigger();
void trigger_samples(void*);
AuxiliaryTask gTriggerSamplesTask;

bool setup(BelaContext *context, void *userData)
{
	// Retrieve a parameter passed in from the initAudio() call
	gSampleData = *(SampleData *)userData;

	gReadPtr = -1;
	if(initialise_trigger() == false)
		return false;

	// Start the lower-priority task. It will run forever in a loop
	Bela_scheduleAuxiliaryTask(gTriggerSamplesTask);
	
	return true;
}

void render(BelaContext *context, void *userData)
{

	for(unsigned int n = 0; n < context->audioFrames; n++) {

		float out = 0;
		// If triggered...
		if(gReadPtr != -1)
			out += gSampleData.samples[gReadPtr++];	// ...read each sample...

		if(gReadPtr >= gSampleData.sampleLen)
			gReadPtr = -1;

		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++)
			// ...and copy it to all the output channels
			audioWrite(context, n, channel, out);
	}
}

// Initialise the auxiliary task
// and print info

bool initialise_trigger()
{
	if((gTriggerSamplesTask = Bela_createAuxiliaryTask(&trigger_samples, 50, "bela-trigger-samples")) == 0)
		return false;

	rt_printf("Press 'a' <enter> to trigger sample,\n"
			  "      's' <enter> to stop the current playing sample\n"
			  "      'q' <enter> or ctrl-C to quit\n");

	return true;
}

// This is a lower-priority call to periodically read keyboard input
// and trigger samples. By placing it at a lower priority,
// it has minimal effect on the audio performance but it will take longer to
// complete if the system is under heavy audio load.

void trigger_samples(void*)
{
	// This is not a real-time task because
	// select() and scanf() are system calls, not handled by Xenomai.
	// This task will be automatically down graded to "secondary mode"
	// the first time it is executed.

	char keyStroke = '.';

	fd_set readfds;
    struct timeval tv;
    int    fd_stdin;
	fd_stdin = fileno(stdin);
	while (!gShouldStop){
		FD_ZERO(&readfds);
		FD_SET(fileno(stdin), &readfds);
		tv.tv_sec = 0;
		tv.tv_usec = 1000;
		fflush(stdout);
		// Check if there are any characters ready to be read
		int num_readable = select(fd_stdin + 1, &readfds, NULL, NULL, &tv);
		// if there are, then read them
		if(num_readable > 0){
			scanf("%c", &keyStroke);
			if(keyStroke != '\n'){ // filter out the "\n" (newline) character
				switch (keyStroke)
				{
					case 'a':
						gReadPtr = 0;
						break;
					case 's':
						gReadPtr = -1;
						break;
					case 'q':
						gShouldStop = true;
						break;
					default:
						break;
				}

			}
		}
		usleep(1000);
	}
}


void cleanup(BelaContext *context, void *userData)
{
	delete[] gSampleData.samples;
}


/**
\example samples/render.cpp

Keypress to WAV file playback
--------------------------------

This scripts needs to be run in a terminal because it requires you to interact
with Bela using your computer's keyboard.
Note that it CAN NOT be run from within the IDE or the IDE's console.

See <a href="https://github.com/BelaPlatform/Bela/wiki/Interact-with-Bela-using-the-Bela-scripts" target="_blank">here</a> how to use Bela with a terminal.

This sketch shows how to playback audio samples from a buffer using
key strokes.

An audio file is loaded into a buffer `SampleData` as `gSampleData`. This is 
accessed with a read pointer that is incremented at audio rate within the render 
function: `out += gSampleData.samples[gReadPtr++]`.

Note that the read pointer is stopped from incrementing past the length of the 
`gSampleData`. This is achieved by comparing the read pointer value against the 
sample length which we can access as follows: `gSampleData.sampleLen`.

You can trigger the sample with keyboard input:

'a' \<enter\> to start playing the sample

's' \<enter\> to stop

'q' \<enter\> or ctrl-C to quit

Monitoring of the keyboard input is done in a low priority task to avoid
interfering with the audio processing.
*/
