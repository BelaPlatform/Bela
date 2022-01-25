/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Audio/record-audio/render.cpp

Recording the audio input and output to file
--------------------------------------------

This example records the inputs and outputs of Bela to an audio file of a fixed length on disk.

When the program begins it will attempt to allocate enough memory to store `gDurationSec`
seconds of audio data for each of the input and output channels. If you request an excessive
amount of RAM then the program may fail when starting or while running.

The program processes the input audio and it stores the input samples into the array
`gInputs[]`. In order to generate something to send to the outputs we apply a filter
to the input audio and store this as the output samples into the array `gOutputs`.

Åfter running for `gDurationSec` this program will automatically stop and write
a two `.wav` files to disk. If you have more audio input or output channels then
these `.wav` files will be multichannel.

These `.wav` files will be created in the Resources section of the Project explorer
amongst your other project files.
*/

#include <Bela.h>
#include <libraries/AudioFile/AudioFile.h>
#include <libraries/Biquad/Biquad.h>
#include <vector>
#include <string>
#include <algorithm>

std::vector<std::vector<float>> gInputs;
std::vector<std::vector<float>> gOutputs;
std::string gFilenameOutputs = "outputs.wav";
std::string gFilenameInputs = "inputs.wav";
const double gDurationSec = 20; // how many seconds to record.
unsigned int gWrittenFrames = 0; // how many frame have actually been written to gInputs and gOutputs
std::vector<Biquad> gBiquads; // filters to process the inputs

bool setup(BelaContext *context, void *userData)
{
	// pre-allocate all the memory needed to store the audio data
	unsigned int numFrames = context->audioSampleRate * gDurationSec;
	gInputs.resize(context->audioInChannels);
	gOutputs.resize(context->audioOutChannels);
	// If we have too many channels or too many frames to store, we may run out of RAM and
	// the program will fail to start.
	try {
		for(auto& c : gInputs)
			c.resize(numFrames);
		for(auto& c : gOutputs)
			c.resize(numFrames);
	} catch (std::exception& e) {
		fprintf(stderr, "Error while allocating memory. Maybe you are asking to record too many frames and/or too many channels\n");
		return false;
	}
	Biquad::Settings settings {
		.fs = context->audioSampleRate,
		.type = Biquad::lowpass,
		.cutoff = 200,
		.q = 0.707,
		.peakGainDb = 0,
	};
	// create some filters to process the input
	gBiquads.resize(std::min(context->audioInChannels, context->audioOutChannels), Biquad(settings));
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; ++n)
	{

		// store audio inputs
		for(unsigned int c = 0; c < context->audioInChannels; ++c)
			gInputs[c][gWrittenFrames] = audioRead(context, n, c);

		unsigned int c;
		// process audio inputs through the filter, write to the audio outputs and store the audio outputs
		for(c = 0; c < gBiquads.size(); ++c) {
			float in = audioRead(context, n, c);
			float out = gBiquads[c].process(in);
			gOutputs[c][gWrittenFrames] = out;
			audioWrite(context, n, c, out);
		}

		++gWrittenFrames;
		if(gWrittenFrames >= gOutputs[0].size()) {
			// if we have processed enough samples an we have filled the pre-allocated buffer,
			// stop the program
			Bela_requestStop();
			return;
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{
	// ensure we don't write any more frames than those that have actually been processed
	// this way if the program is stopped by the user before its natural end we don't end up
	// with a lot of empty samples at the end of each file.
	for(auto& i : gInputs)
		i.resize(gWrittenFrames);
	for(auto& o : gOutputs)
		o.resize(gWrittenFrames);
	AudioFileUtilities::write(gFilenameInputs, gInputs, context->audioSampleRate);
	AudioFileUtilities::write(gFilenameOutputs, gOutputs, context->audioSampleRate);
}
