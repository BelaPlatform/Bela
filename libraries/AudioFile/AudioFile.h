#pragma once
#include <string>
#include <vector>

namespace AudioFileUtilities {
	int getSamples(std::string file, float *buf, int channel, int startFrame, int endFrame);
	int getNumChannels(std::string file);
	int getNumFrames(std::string file);
	/**
	 * Store samples from memory into an audio file on disk.
	 *
	 * @param filename the file to write to
	 * @param buf a vector containing \p channels * \p frames of interlaved data
	 * @param channels the channels in the data and output file
	 * @param frames the frames in the data and output file
	 * @param sampleRate the sampling rate of the data
	 */
	int write(std::string filename, float *buf, unsigned int channels, unsigned int frames, unsigned int samplerate);
	/**
	 * Write non-interlaved samples from memory into an audio file on disk.
	 *
	 * @param filename the file to write to
	 * @param dataIn a vector containing one vector of data per channel
	 * @param sampleRate the sampling rate of the data
	 *
	 */
	int write(std::string filename, std::vector<std::vector<float> > dataIn, unsigned int sampleRate);
	/**
	 * Load audio samples from a file into memory.
	 *
	 * Loads at most \p count samples from each channel of \p filename,
	 * starting from frame \p start.
	 *
	 * @param filename the file to load
	 * @param maxCount the maximum number of samples to load from each
	 * channel. Pass a negative value for no limit.
	 * @param start the first sample to load.
	 *
	 * @return a vector containing one vector of data per channel.
	 */
	std::vector<std::vector<float> > load(const std::string& filename, int maxCount = -1, unsigned int start = 0);
	/**
	 * Load audio samples from a file into memory.
	 *
	 * Simplified version of write(), which only loads the first channel of
	 * the file.
	 */
	std::vector<float> loadMono(const std::string& file);
};
