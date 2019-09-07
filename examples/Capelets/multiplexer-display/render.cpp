/*
 ____  _____ _		  _
| __ )| ____| |		 / \
|  _ \|  _| | |		/ _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/	\_\

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
#include <unistd.h>

bool gIsStdoutTty;
unsigned int gPrintCount = 0;

bool setup(BelaContext *context, void *userData)
{
	if(context->multiplexerChannels == 0 || context->analogFrames == 0) {
		rt_printf("Please enable the Multiplexer Capelet to run this example.\n");
		return false;
	}

	gIsStdoutTty = isatty(1); // Check if stdout is a terminal
	return true;
}

void render(BelaContext *context, void *userData)
{
	gPrintCount += context->analogFrames;

	if(gPrintCount >= (unsigned int)(context->analogSampleRate * 0.1)) {
		gPrintCount = 0;
		if(gIsStdoutTty)
			rt_printf("\e[1;1H\e[2J");	// Command to clear the screen (on a terminal)

		/* Go through each multiplexer setting of each analog input and display the value */
		for(unsigned int input = 0; input < context->analogInChannels; input++) {
			rt_printf("Input %d: ", input);
			for(unsigned int muxChannel = 0; muxChannel < context->multiplexerChannels; muxChannel++) {
				/* multiplexerAnalogRead() returns the most recent sample from the given
				 * input and mux channel. Unlike multiplexerChannelForFrame(), it does not
				 * give you precise control over the frame timing, so this is mainly useful
				 * for sensors where precise timing and sample rate is not as important.
				 */
				float sample = multiplexerAnalogRead(context, input, muxChannel);
				rt_printf("%f ", sample);
			}
			rt_printf("\n");
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{

}


/**
\example multiplexer-display/render.cpp

Display signals from the multiplexer capelet
--------------------------------------------

This sketch displays the values of up to 64 analog inputs connected by the
multiplexer capelet. The capelet is a separate piece of hardware that attaches
to the Bela cape.

To run the sketch, the multiplexer capelet needs to be enabled using the IDE
or with the -X command line option. The multiplexer capelet requires 8 analog
inputs to work, and depending on the settings can use either 2, 4 or 8 multiplexer
channels per analog input (for a total of 16, 32 or 64 inputs).
*/
