#include <libraries/sndfile/sndfile.h> // to load audio files
#include "AudioFile.h"
#include <unistd.h> //for sync
#include <cstdlib>
#include <iostream>

namespace AudioFileUtilities {

int getSamples(std::string file, float *buf, int channel, int startFrame, int endFrame)
{
	SNDFILE *sndfile ;
	SF_INFO sfinfo ;
	sfinfo.format = 0;
	if (!(sndfile = sf_open (file.c_str(), SFM_READ, &sfinfo))) {
		std::cerr << "Couldn't open file " << file << ": " << sf_strerror(sndfile) << std::endl;
		sf_close(sndfile);
		return 1;
	}

	int numChannelsInFile = sfinfo.channels;
	if(numChannelsInFile < channel+1)
	{
		std::cerr << "Error: " << file << " doesn't contain requested channel" << std::endl;
		sf_close(sndfile);
		return 1;
	}

	int frameLen = endFrame-startFrame;

	if(frameLen <= 0 || startFrame < 0 || endFrame <= 0 || endFrame > sfinfo.frames)
	{
		std::cerr << "Error: " << file << " invalid frame range requested" << std::endl;
		sf_close(sndfile);
		return 1;
	}

	sf_seek(sndfile,startFrame,SEEK_SET);

	float* tempBuf = new float[frameLen*numChannelsInFile];
	int readcount = sf_read_float(sndfile, tempBuf, frameLen*numChannelsInFile); //FIXME
	// Pad with zeros in case we couldn't read whole file
	for(int k = readcount; k <frameLen*numChannelsInFile; k++)
		tempBuf[k] = 0;

	for(int n=0;n<frameLen;n++)
		buf[n] = tempBuf[n*numChannelsInFile+channel];
	delete[] tempBuf;

	sf_close(sndfile);

	return 0;
}

int getNumChannels(std::string file) {
	SNDFILE *sndfile ;
	SF_INFO sfinfo ;
	sfinfo.format = 0;
	if (!(sndfile = sf_open (file.c_str(), SFM_READ, &sfinfo))) {
		std::cerr << "Couldn't open file " << file << ": " << sf_strerror(sndfile) << std::endl;
		return -1;
	}
	sf_close(sndfile);

	return sfinfo.channels;
}

int getNumFrames(std::string file) {
	SNDFILE *sndfile ;
	SF_INFO sfinfo ;
	sfinfo.format = 0;
	if (!(sndfile = sf_open (file.c_str(), SFM_READ, &sfinfo))) {
		std::cerr << "Couldn't open file " << file << ": " << sf_strerror(sndfile) << std::endl;
		return -1;
	}
	sf_close(sndfile);

	return sfinfo.frames;
}

int write(std::string file, float *buf, unsigned int channels, unsigned int frames, unsigned int samplerate)
{
	SNDFILE *sndfile;
	SF_INFO sfinfo;
	sfinfo.samplerate = samplerate;
	sfinfo.format = SF_FORMAT_WAV | SF_FORMAT_FLOAT;
	sfinfo.channels = channels;
	sndfile = sf_open(file.c_str(), SFM_WRITE, &sfinfo);
	if(!sndfile)
	{
		sf_close(sndfile);
		std::cerr << "writeSamples() Error on sf_open(): " << file << " " << sf_strerror(sndfile) << "\n";
		return 0;
	}
	int ret = sf_writef_float(sndfile, buf, frames);
	if(ret != frames)
	{
		sf_close(sndfile);
		std::cerr << "writeSamples() Error on sf_writef_float(): " << file << " " << sf_strerror(sndfile) << ". Written " << ret << " frames out of " << frames << "\n";
		return 0;
	}
	ret = sf_close(sndfile);
	if(ret)
	{
		std::cerr << "writeSamples() Error on close(): " << file << " " << sf_strerror(sndfile) << "\n";
		return 0;
	}
	sync();
	return frames;
}

int write(std::string file, std::vector<std::vector<float> > dataIn, unsigned int sampleRate)
{
	unsigned int channels = dataIn.size();
	if(channels < 1)
		return -1;
	unsigned int frames = dataIn[0].size();
	std::vector<float> dataOut(frames * channels);
	for(unsigned int n = 0; n < frames; ++n)
	{
		for(unsigned int c = 0; c < channels; ++c)
			dataOut[n * channels + c] = dataIn[c][n];
	}
	return AudioFileUtilities::write(file, dataOut.data(), channels, frames, sampleRate);
}

std::vector<std::vector<float> > load(const std::string& file, int maxCount, unsigned int start)
{
	std::vector<std::vector<float> > out;
	int numChannels = getNumChannels(file);
	if(numChannels <= 0)
		return out;
	out.resize(numChannels);
	unsigned int numFrames = getNumFrames(file);
	if(start > numFrames)
		return out;
	numFrames -= start;
	if(maxCount >= 0)
		numFrames = maxCount < numFrames ? maxCount : numFrames;
	for(unsigned int n = 0; n < out.size(); ++n)
	{
		auto& ch = out[n];
		ch.resize(numFrames);
		getSamples(file, ch.data(), n, start, start + numFrames);
	}
	return out;
}

std::vector<float> loadMono(const std::string& file)
{
	auto v = load(file);
	v.resize(1);
	return v[0];
}
}; // namespace AudioFileUtilities
