/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Audio/file-player/render.cpp

Playback of several large wav files
---------------------------

This example shows how to play audio files from a playlist sequentially.
It uses the AudioFileReader class, which loads data from the audio file into
memory in the background, while the user can request data safely from the
RT-thread via the AudioFileReader::getSamples() method.

We want to start playing back the next file as soon as the current one
finishes, so we need to start preloading the next one ahead of time. This is
done by using two AudioFileReader objects, where at any time one, whose index
is `gCurrReader`, will be playing back the current file while the other one
starts preloading the next file.
*/

#include <Bela.h>
#include <libraries/AudioFile/AudioFile.h>
#include <vector>
#include <string>

std::vector<AudioFileReader> gReaders(2);
std::vector<std::string> gFilenames = {
	"number0.wav",
	"number1.wav",
	"number2.wav",
	"number3.wav",
	"number4.wav",
	"number5.wav",
	"number6.wav",
	"number7.wav",
};
size_t gLoadingFile;
size_t gCurrReader;

std::vector<float> gSamples;
size_t gFrameCount = 0;
AuxiliaryTask gStartLoadingFileTask;

void loadNextFile(void*)
{
	// start preloading the next file
	gLoadingFile = (gLoadingFile + 1) % gFilenames.size();
	size_t nextReader = (gCurrReader + 1) % gReaders.size();
	gReaders[nextReader].setup(gFilenames[gLoadingFile], 16384);
	rt_printf("Opening file [%zu] %s in reader %zu\n", gLoadingFile, gFilenames[gLoadingFile].c_str(), nextReader);
}

bool setup(BelaContext *context, void *userData)
{
	// create a task to load files
	gStartLoadingFileTask = Bela_createAuxiliaryTask(loadNextFile, 1, "loadNextFile");
	if(!gStartLoadingFileTask) {
		fprintf(stderr, "Error creating file loading task\n");
		return false;
	}
	gLoadingFile = -1;
	gCurrReader = -1;
	// open the first file
	loadNextFile(NULL);
	gCurrReader = 0;
	// open the second file
	loadNextFile(NULL);
	gSamples.reserve(context->audioFrames * gReaders[gCurrReader].getChannels());
	return true;
}

void render(BelaContext *context, void *userData) {
	AudioFileReader& reader = gReaders[gCurrReader];
	// this call may allocate memory if getChannels() is larger than for
	// all previous files
	gSamples.resize(context->audioFrames * reader.getChannels());
	reader.getSamples(gSamples);
	for(unsigned int n = 0; n < context->audioFrames; ++n)
	{
		float out = 0;
		for(unsigned int c = 0; c < context->audioOutChannels; ++c)
		{
			// write each channel from the audio file to the
			// output channels. If there are more output channels
			// than channels in the file, copy the file's last
			// channel to all remaining outputs
			if(c < reader.getChannels())
				out = gSamples[n * reader.getChannels() + c];
			audioWrite(context, n, c, out);
		}
		// count samples played back for the existing file
		gFrameCount++;
		if(gFrameCount >= reader.getLength())
		{
			// reached end of file
			gFrameCount = 0;
			// start playing the file we preloaded
			gCurrReader = (gCurrReader + 1) % gReaders.size();
			reader.getSamples(gSamples);
			rt_printf("Playing from reader: %zu\n", gCurrReader);
			// start loading next file in a real-time safe way
			Bela_scheduleAuxiliaryTask(gStartLoadingFileTask);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
