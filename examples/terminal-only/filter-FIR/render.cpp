/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example terminal-only/filter-FIR/render.cpp

Finite Impulse Response Filter
------------------------------

This scripts needs to be run in a terminal because it requires you to interact with Bela using your computer's keyboard.
Note that it cannot be run from within the IDE or the IDE's console.

See <a href="https://github.com/BelaPlatform/Bela/wiki/Interact-with-Bela-using-the-Bela-scripts" target="_blank">here</a> how to use Bela with a terminal.

In this project an audio recording processesd through an FIR filter.

To control the playback of the audio sample, use your computer keyboard, by pressing:

'a' \<enter\> to start playing the sample

's' \<enter\> to stop

'q' \<enter\> or ctrl-C to quit
*/

#include <Bela.h>
#include <cmath>
#include <libraries/Convolver/Convolver.h>
#include <libraries/AudioFile/AudioFile.h>
#include <string>
#include <vector>
#include "FIRfilter.h"

std::string fileName;		// Name of the file to load
int gReadPtr;			// Position of last read sample from file
std::vector<float> data;

void initialise_filter(BelaContext *context);

Convolver convolver;
// Task for handling input from the keyboard
AuxiliaryTask gTriggerSamplesTask;

bool initialise_trigger();
void trigger_samples(void*);

bool setup(BelaContext *context, void *userData)
{
	// Retrieve the argument of the --file parameter (passed in from main())
	fileName = (const char *)userData;
	data = AudioFileUtilities::loadMono(fileName);
	if(0 == data.size()) {
		fprintf(stderr, "Unable to load file\n");
		return false;
	}

	gReadPtr = -1;

	convolver.setup(filterTaps, context->audioFrames);

	// Initialise auxiliary tasks
	if(!initialise_trigger())
		return false;

	return true;
}

void render(BelaContext *context, void *userData)
{
	float ins[context->audioFrames];
	float outs[context->audioFrames];
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		float in = 0;

		// If triggered...
		if(gReadPtr != -1)
			in += data[gReadPtr++];	// ...read each sample...

		if(gReadPtr >= int(data.size()))
			gReadPtr = -1;

		ins[n] = in;
	}

	convolver.process(outs, ins, context->audioFrames);
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		for(unsigned int channel = 0; channel < context->audioOutChannels; ++channel)
			// ...and copy it to all the output channels
			audioWrite(context, n, channel, outs[n]);
	}

	// Request that the lower-priority task run at next opportunity
	Bela_scheduleAuxiliaryTask(gTriggerSamplesTask);
}

// Initialise the auxiliary task
// and print info

bool initialise_trigger()
{
	if((gTriggerSamplesTask = Bela_createAuxiliaryTask(&trigger_samples, 50, "bela-trigger-samples")) == 0)
		return false;

	rt_printf("Press 'a' <enter> to start playing the sample\n"
			  "      's' <enter> to stop\n");
	rt_printf("      'q' <enter> or ctrl-C to quit\n");

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
	while (!Bela_stopRequested()){
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
						Bela_requestStop();
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
}
