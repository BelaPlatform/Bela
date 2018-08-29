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


#include <Bela.h>	// to schedule lower prio parallel process
#include <cmath>
#include <algorithm>
#include <stdio.h>
#include <sys/types.h>
#include "SampleData.h"

SampleData gSampleData;	// User defined structure to get complex data from main
int gReadPtr;			// Position of last read sample from file

// filter vars
float gLastX[2];
float gLastY[2];
double lb0, lb1, lb2, la1, la2 = 0.0;

// communication vars between the 2 auxiliary tasks
int gChangeCoeff = 0;
int gFreqDelta = 0;

void initialise_filter(float freq);

void calculate_coeff(float cutFreq);

bool initialise_aux_tasks();

// Task for handling input from the keyboard
AuxiliaryTask gChangeCoeffTask;

void check_coeff(void*);

// Task for handling the update of the frequencies using the analog inputs
AuxiliaryTask gInputTask;

void read_input(void*);


extern float gCutFreq;


bool setup(BelaContext *context, void *userData)
{
	// Retrieve a parameter passed in from the initAudio() call
	gSampleData = *(SampleData *)userData;

	gReadPtr = -1;

	initialise_filter(200);

	// Initialise auxiliary tasks
	if(!initialise_aux_tasks())
		return false;

	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		float sample = 0;
		float out = 0;

		// If triggered...
		if(gReadPtr != -1)
			sample += gSampleData.samples[gReadPtr++];	// ...read each sample...

		if(gReadPtr >= gSampleData.sampleLen)
			gReadPtr = -1;

		out = lb0*sample+lb1*gLastX[0]+lb2*gLastX[1]-la1*gLastY[0]-la2*gLastY[1];

		gLastX[1] = gLastX[0];
		gLastX[0] = out;
		gLastY[1] = gLastY[0];
		gLastY[0] = out;

		for(unsigned int channel = 0; channel < context->audioOutChannels; ++channel)
			// ...and copy it to all the output channels
			audioWrite(context, n, channel, out);

	}

	// Request that the lower-priority tasks run at next opportunity
	Bela_scheduleAuxiliaryTask(gChangeCoeffTask);
	Bela_scheduleAuxiliaryTask(gInputTask);
}

// First calculation of coefficients

void initialise_filter(float freq)
{
	calculate_coeff(freq);
}


// Calculate the filter coefficients
// second order low pass butterworth filter

void calculate_coeff(float cutFreq)
{
	// Initialise any previous state (clearing buffers etc.)
	// to prepare for calls to render()
	float sampleRate = 44100;
	double f = 2*M_PI*cutFreq/sampleRate;
	double denom = 4+2*sqrt(2)*f+f*f;
	lb0 = f*f/denom;
	lb1 = 2*lb0;
	lb2 = lb0;
	la1 = (2*f*f-8)/denom;
	la2 = (f*f+4-2*sqrt(2)*f)/denom;
	gLastX[0] = gLastX [1] = 0;
	gLastY[0] = gLastY[1] = 0;

}


// Initialise the auxiliary tasks
// and print info

bool initialise_aux_tasks()
{
	if((gChangeCoeffTask = Bela_createAuxiliaryTask(&check_coeff, 90, "bela-check-coeff")) == 0)
		return false;

	if((gInputTask = Bela_createAuxiliaryTask(&read_input, 50, "bela-read-input")) == 0)
		return false;

	rt_printf("Cut-off frequency: %f\n", gCutFreq);
	rt_printf("Press 'a' <enter> to start playing the sample, 's' to stop\n");
	rt_printf("      'z' <enter> to low down cut-off freq by 100 Hz, 'x' to raise it\n");
	rt_printf("Press 'q' <enter> or ctrl-C to quit\n");

	return true;
}

// Check if cut-off freq has been changed
// and new coefficients are needed

void check_coeff(void*)
{
	if(gChangeCoeff == 1)
	{
		gCutFreq += gFreqDelta;
		gCutFreq = gCutFreq < 0 ? 0 : gCutFreq;
		gCutFreq = gCutFreq > 22050 ? 22050 : gCutFreq;

		rt_printf("Cut-off frequency: %f\n", gCutFreq);

		calculate_coeff(gCutFreq);
		gChangeCoeff = 0;
	}
}

// This is a lower-priority call to periodically read keyboard input
// and trigger samples. By placing it at a lower priority,
// it has minimal effect on the audio performance but it will take longer to
// complete if the system is under heavy audio load.

void read_input(void*)
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
					case 'z':
						gChangeCoeff = 1;
						gFreqDelta = -100;
						break;
					case 'x':
						gChangeCoeff = 1;
						gFreqDelta = 100;
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
\example filter-IIR/render.cpp

Infinite Impulse Response Filter
------------------------------

This scripts needs to be run in a terminal because it requires you to interact
with Bela using your computer's keyboard.
Note that it CAN NOT be run from within the IDE or the IDE's console.

See <a href="https://github.com/BelaPlatform/Bela/wiki/Interact-with-Bela-using-the-Bela-scripts" target="_blank">here</a> how to use Bela with a terminal.

In this project an audio recording processesd through an IIR filter.

To control the playback of the audio sample, use your computer keyboard, by pressing:

'z' \<enter\> to low down cut-off freq 100 Hz

'x' \<enter\> to raise it by 100Hz

'a' \<enter\> to start playing the sample

's' \<enter\> to stop

'q' \<enter\> or ctrl-C to quit

*/
