#pragma once
#include <string>
#include <vector>

/**
 *@brief A collection of functions for loading and storing audio files.
 *
 * A collection of functions for loading and storing audio files.
 */

namespace AudioFileUtilities {
	/**
	 * @addtogroup AudioFileUtilities
	 */
	/**
	 * Load audio frames between @p startFrame and @p endFrame from @p
	 * channel of the specified @p file into the preallocated memory
	 * location @p buf.
	 *
	 * @return 0 on success, or an error code upon failure.
	 */
	int getSamples(const std::string& file, float *buf, unsigned int channel, unsigned int startFrame, unsigned int endFrame);
	/**
	 * Get the number of audio channels in @p file.
	 *
	 * @return the number of audio channels on success, or a negative error
	 * code upon failure.
	 */
	int getNumChannels(const std::string& file);
	/**
	 * Get the number of audio frames in @p file.
	 *
	 * @return the number of frames on success, or a negative error code
	 * upon failure.
	 */
	int getNumFrames(const std::string& file);
	/**
	 * Store samples from memory into an audio file on disk.
	 *
	 * @param filename the file to write to
	 * @param buf a vector containing \p channels * \p frames of interlaved data
	 * @param channels the channels in the data and output file
	 * @param frames the frames in the data and output file
	 * @param sampleRate the sampling rate of the data
	 */
	int write(const std::string& filename, float *buf, unsigned int channels, unsigned int frames, unsigned int samplerate);
	/**
	 * Write non-interlaved samples from memory into an audio file on disk.
	 *
	 * @param filename the file to write to
	 * @param dataIn a vector containing one vector of data per channel
	 * @param sampleRate the sampling rate of the data
	 *
	 */
	int write(const std::string& filename, const std::vector<std::vector<float> >& dataIn, unsigned int sampleRate);
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
	 * Simplified version of load(), which only loads the first channel of
	 * the file.
	 */
	std::vector<float> loadMono(const std::string& file);
};

#include <libraries/sndfile/sndfile.h>
#include <thread>
#include <array>

class AudioFile
{
protected:
	typedef enum {
		kRead,
		kWrite,
	} Mode;
	enum { kNumBufs = 2};
protected:
	int setup(const std::string& path, size_t bufferSize, Mode mode, size_t channels = 0, unsigned int sampleRate = 0);
public:
	size_t getLength() const { return sfinfo.frames; };
	size_t getChannels() const { return sfinfo.channels; };
	int getSampleRate() const { return sfinfo.samplerate; };
	virtual ~AudioFile();
private:
	void cleanup();
protected:
	volatile size_t ioBuffer;
	size_t ioBufferOld;
protected:
	void scheduleIo();
	std::vector<float>& getRtBuffer();
	std::array<std::vector<float>,kNumBufs> internalBuffers;
	void threadLoop();
	virtual void io(std::vector<float>& buffer) = 0;
	std::thread diskIo;
	size_t size;
	volatile bool stop;
	bool ramOnly;
	size_t rtIdx;
	SNDFILE* sndfile = NULL;
	SF_INFO sfinfo = { 0 };
};

class AudioFileReader : public AudioFile
{
public:
	/**
	 * Open a file and prepare to stream it from disk.
	 *
	 * @param path Path to the file
	 * @param bufferSize the size of the internal buffer. If this is larger
	 * than the file itself, the whole file will be loaded in memory, otherwise
	 * the file will be read from disk from a separate thread.
	 */
	int setup(const std::string& path, size_t bufferSize);
	/**
	 * Write interleaved samples from the file to the destination.
	 *
	 * @param buffer the destination buffer. Its size() must be a multiple
	 * of getChannels().
	 */void getSamples(std::vector<float>& buffer);
	/**
	 * Write interleaved samples from the file to the destination.
	 *
	 * @param dst the destination buffer
	 * @param samplesCount The number of samples to write.
	 * This has to be a multiple of getChannels().
	 */
	void getSamples(float* dst, size_t samplesCount);
	int setLoop(bool loop);
	int setLoop(size_t start, size_t end);
	size_t getIdx();
private:
	void io(std::vector<float>& buffer) override;
	bool loop;
	size_t loopStart;
	size_t loopStop;
	size_t idx;
};

class AudioFileWriter : public AudioFile
{
public:
	/**
	 * Open a file and prepare to write to it.
	 *
	 * @param path Path to the file
	 * @param bufferSize the size of the internal buffer.
	 * @param channels the number of channels
	 */
	int setup(const std::string& path, size_t bufferSize, size_t channels, unsigned int sampleRate);
	/**
	 * Push interleaved samples to the file for writing
	 *
	 * @param buffer the source buffer. Its size() must be a multiple
	 * of getChannels().
	 */
	void setSamples(std::vector<float>& buffer);
	void setSamples(float const * src, size_t samplesCount);
private:
	void io(std::vector<float>& buffer) override;
};
