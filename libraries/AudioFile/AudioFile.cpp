#include "AudioFile.h"
#include <unistd.h>
#include <string.h>

std::vector<float>& AudioFile::getRtBuffer()
{
	size_t idx;
	if(ramOnly)
		idx = 0;
	else
		idx = !ioBuffer;
	return internalBuffers[idx];
}

int AudioFile::setup(const std::string& path, size_t bufferSize, Mode mode, size_t arg0 /* = 0 */, unsigned int arg1 /* = 0 */)
{
	cleanup();
	int sf_mode;
	switch(mode){
	case kWrite: {
		unsigned int channels = arg0;
		unsigned int sampleRate = arg1;
		sf_mode = SFM_WRITE;
		sfinfo.samplerate = sampleRate;
		sfinfo.format = SF_FORMAT_WAV | SF_FORMAT_PCM_16;
		sfinfo.channels = channels;
	}
		break;
	case kRead:
		sfinfo.format = 0;
		sf_mode = SFM_READ;
		break;
	}
	sndfile = sf_open(path.c_str(), sf_mode, &sfinfo);
	if(!sndfile)
		return 1;
	rtIdx = 0;
	ramOnly = false;
	ioBuffer = 0;
	size_t numSamples = getLength() * getChannels();
	if(kRead == mode && bufferSize * kNumBufs >= numSamples)
	{
		ramOnly = true;
		// empty other buffers, we will only use the first one
		for(unsigned int n = 1; n < internalBuffers.size(); ++n)
			internalBuffers[n].clear();
		// the actual audio content
		internalBuffers[0].resize(numSamples);
	} else {
		for(auto& b : internalBuffers)
			b.resize(bufferSize * getChannels());
	}
	ioBufferOld = ioBuffer;
	if(kRead == mode)
	{
		size_t readFirstFrame = arg0;
		if(!ramOnly)
			sf_seek(sndfile, readFirstFrame, SEEK_SET);
		// fill up the first buffer
		io(internalBuffers[ioBuffer]);
		// signal threadLoop() to start filling in the next buffer
		scheduleIo();
	}
	if(!ramOnly)
	{
		stop = false;
		diskIo = std::thread(&AudioFile::threadLoop, this);
	}
	return 0;
}

void AudioFile::cleanup()
{
	stop = true;
	if(diskIo.joinable())
		diskIo.join();
	sf_close(sndfile);
}

void AudioFile::scheduleIo()
{
	// schedule thread
	// TODO: detect underrun
	ioBuffer = !ioBuffer;
}

void AudioFile::threadLoop()
{
	while(!stop)
	{
		if(ioBuffer != ioBufferOld)
			io(internalBuffers[ioBuffer]);
		ioBufferOld = ioBuffer;
		usleep(100000);
	}
}

AudioFile::~AudioFile()
{
	cleanup();
}

int AudioFileReader::setup(const std::string& path, size_t bufferSize, size_t firstFrame)
{
	loop = false;
	idx = firstFrame;
	return AudioFile::setup(path, bufferSize, kRead, firstFrame);
}

int AudioFileReader::setLoop(bool doLoop)
{
	return setLoop(0, getLength() * !!doLoop);
}

int AudioFileReader::setLoop(size_t start, size_t end)
{
	if(start == end)
	{
		this->loop = false;
		return 0;
	}
	if(start > getLength() || end > getLength() || end < start)
		return 1;
	this->loop = true;
	loopStart = start;
	loopStop = end;
	return 0;
}

void AudioFileReader::io(std::vector<float>& buffer)
{
	size_t count = buffer.size();
	size_t dstPtr = 0;
	int readcount = 0;
	while(count)
	{
		size_t toRead = count;
		if(loop)
		{
			size_t stop = loopStop * getChannels();
			if(stop > idx)
			{
				size_t toEndOfLoop = stop - idx;
				if(toRead > toEndOfLoop)
					toRead = toEndOfLoop;
			} else {
				// force to return 0 and trigger a loop rewind
				toRead = 0;
			}
		}
		int readcount = sf_read_float(sndfile, buffer.data() + dstPtr, toRead);
		idx += readcount;
		dstPtr += readcount;
		count -= readcount;
		if(count)
		{
			// end of file or of loop section:
			if(loop)
			{
				// rewind and try again
				sf_seek(sndfile, loopStart, SEEK_SET);
				idx = loopStart;
			}
			else
			{
				// fill the rest with zeros
				memset(buffer.data() + dstPtr, 0, count * sizeof(buffer[0]));
				count = 0;
			}
		}
	}
}

void AudioFileReader::getSamples(std::vector<float>& outBuf)
{
	return getSamples(outBuf.data(), outBuf.size());
}

void AudioFileReader::getSamples(float* dst, size_t samplesCount)
{
	size_t n = 0;
	while(n < samplesCount)
	{
		auto& inBuf = getRtBuffer();
		size_t inBufEnd = ramOnly ?
			(loop ? loopStop * getChannels() : inBuf.size())
			: inBuf.size();
		bool done = false;
		for(; n < samplesCount && rtIdx < inBufEnd; ++n)
		{
			done = true;
			dst[n] = inBuf[rtIdx++];
		}
		if(rtIdx == inBufEnd)
		{
			if(ramOnly)
			{
				if(loop)
					rtIdx = loopStart;
				else {
					memset(dst + n, 0, (samplesCount - n) * sizeof(dst[0]));
					n = samplesCount;
					done = true;
				}
			} else {
				rtIdx = 0;
				scheduleIo(); // this should give us a new inBuf
			}
		}
		if(!done){
			break;
		}
	}
}

int AudioFileWriter::setup(const std::string& path, size_t bufferSize, size_t channels, unsigned int sampleRate)
{
	return AudioFile::setup(path, bufferSize, kWrite, channels, sampleRate);
}

void AudioFileWriter::setSamples(std::vector<float>& buffer)
{
	return setSamples(buffer.data(), buffer.size());
}

void AudioFileWriter::setSamples(float const * src, size_t samplesCount)
{
	size_t n = 0;
	while(n < samplesCount)
	{
		auto& outBuf = getRtBuffer();
		bool done = false;
		for(; n < samplesCount && rtIdx < outBuf.size(); ++n)
		{
			done = true;
			outBuf[rtIdx++] = src[n];
		}
		if(rtIdx == outBuf.size())
		{
			rtIdx = 0;
			scheduleIo(); // this should give us a new outBuf
		}
		if(!done){
			break;
		}
	}
}

void AudioFileWriter::io(std::vector<float>& buffer)
{
	size_t count = buffer.size();
	sf_count_t ret = sf_write_float(sndfile, buffer.data(), buffer.size());
	if(ret != sf_count_t(buffer.size()))
		fprintf(stderr, "Error while writing to file: %lld\n", ret);
}
