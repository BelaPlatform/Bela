/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Audio/convolution/render.cpp

Convolve a signal with an impulse response.
==========================================

This project performs a time-domain convolution of a signal with an impulse
response. Both the input signal and the inpulse response are loaded from audio
files located in the project folder.
By changing the global variable gProcessInput, you can decide to process through
the filter Bela's live audio input instead.
*/

#include <Bela.h>
#include <libraries/AudioFile/AudioFile.h>
#include <libraries/Convolver/Convolver.h>
#include <string>
#include <vector>

unsigned int gReadPtr; // Position of last read sample from file
std::vector<float> data;
Convolver convolver;

const std::string gIrFile = "impulse-response.wav";
const std::string gAudioFile = "longsample.wav";
const bool gProcessInput = true; // set to true to process the live input instead
const unsigned int gInputChannel = 0; // which channel to process in that case

// max length of the impulse response. Values above 8000 will make the Bela IDE
// responsive. The maximum value is around 12000, but it requires running the
// program with --high-performance-mode. When the IDE becomes unresponsive, use
// the button on the cape to stop the running program.
const unsigned int gMaxIrLength = 5000;

bool setup(BelaContext *context, void *userData)
{
	convolver.setup(gIrFile, context->audioFrames, gMaxIrLength);
	if(gProcessInput)
		return true;

	data = AudioFileUtilities::loadMono(gAudioFile);
	if(0 == data.size()) {
		fprintf(stderr, "Unable to load file\n");
		return false;
	}
	gReadPtr = 0;
	return true;
}

void render(BelaContext *context, void *userData)
{
	float inBuf[context->audioFrames]; // the buffer to be processed by the convolver
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		float in = 0;

		if(gProcessInput) {
			in = audioRead(context, n, gInputChannel);
		} else { // read the audio file from the buffer
			in += data[gReadPtr];	// ...read each sample...
			++gReadPtr;
			if(gReadPtr >= data.size())
				gReadPtr = 0;
		}

		inBuf[n] = in;
	}

	float outBuf[context->audioFrames];
	// ... convolve it ...
	convolver.process(outBuf, inBuf, context->audioFrames);

	for(unsigned int n = 0; n < context->audioFrames; n++) {
		for(unsigned int channel = 0; channel < context->audioOutChannels; ++channel)
			// ...and copy it to all the output channels
			audioWrite(context, n, channel, outBuf[n]);
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
