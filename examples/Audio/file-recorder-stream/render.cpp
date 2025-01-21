/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
https://bela.io
*/
/**
\example Audio/file-recorder-stream/render.cpp

Recording the audio input and output to file
--------------------------------------------

This example records the inputs and outputs of Bela to audio files.
Optionally, read from a file instead of audio inputs.

The program processes the input audio and it stores the input samples into the vector
`gInputs`. The input audio is processed to a filter and then writtne into the
vector `gOutputs`. These vectors take the form of interleaved audio buffers.
Once per block, we call the AudioFileWriter::setSamples() method to pass the
data to the thread that handles writing it to disk. AudioFileWriter's internal
thread writes the data to disk as it receives it, minimising the use of RAM and
allowing for arbitrary recording lengths, limited only by the space available
on disk.

If `INPUT_FROM_FILE` is defined, then the input is taken from an existing audio
file instead of the live audio input. In this case the `gFilenameInputs` file
will be a sample-accurate looped copy of the content of the `gInputFromName` file.

*/

#include <Bela.h>
#include <libraries/AudioFile/AudioFile.h>
#include <libraries/Biquad/Biquad.h>
#include <vector>
#include <string>
#include <algorithm>

std::vector<float> gInputs;
std::vector<float> gOutputs;
std::string gFilenameOutputs = "outputs.wav";
std::string gFilenameInputs = "inputs.wav";
std::vector<Biquad> gBiquads; // filters to process the inputs

//#define INPUT_FROM_FILE
#ifdef INPUT_FROM_FILE
AudioFileReader reader;
std::string gInputFromName = "greek-rumba.wav";
#endif // INPUT_FROM_FILE
AudioFileWriter inputWriter;
AudioFileWriter outputWriter;

bool setup(BelaContext *context, void *userData)
{
	int ret = 0;
#ifdef INPUT_FROM_FILE
	ret = reader.setup(gInputFromName, 8192);
	if(ret)
	{
		fprintf(stderr, "Unable to load file %s\n", gInputFromName.c_str());
		return false;
	}
	if(reader.getChannels() != context->audioInChannels)
	{
		fprintf(stderr, "Channel count mismatch\n");
		return false;
	}
	reader.setLoop(true);
#endif // INPUT_FROM_FILE
	ret |= inputWriter.setup(gFilenameInputs, 16384, context->audioInChannels, context->audioSampleRate);
	ret |= outputWriter.setup(gFilenameOutputs, 16384, context->audioOutChannels, context->audioSampleRate);
	if(ret)
	{
		fprintf(stderr, "Error opening I/O files\n");
		return false;
	}
	// pre-allocate one buffer worth of memory needed to store the audio data
	gInputs.resize(context->audioInChannels * context->audioFrames);
	gOutputs.resize(context->audioOutChannels * context->audioFrames);
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
#ifdef INPUT_FROM_FILE
	reader.getSamples(gInputs);
#else // INPUT_FROM_FILE
	for(unsigned int n = 0; n < context->audioFrames; ++n)
	{
		// store audio inputs in interleaved buffers
		for(unsigned int c = 0; c < context->audioInChannels; ++c)
			gInputs[n * context->audioInChannels + c] = audioRead(context, n, c);
	}
#endif // INPUT_FROM_FILE
	for(unsigned int n = 0; n < context->audioFrames; ++n)
	{
		// process audio inputs through the filter, write to the audio
		// outputs and store the audio outputs
		for(unsigned int c = 0; c < gBiquads.size(); ++c) {
			//float in = audioRead(context, n, c);
			float in = gInputs[context->audioInChannels * n + c];
			float out = gBiquads[c].process(in);
			gOutputs[n * context->audioOutChannels + c] = out;
			audioWrite(context, n, c, out);
		}
	}
	inputWriter.setSamples(gInputs);
	outputWriter.setSamples(gOutputs);
}

void cleanup(BelaContext *context, void *userData)
{
}

