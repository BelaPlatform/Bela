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

int AudioFile::setup(const std::string& path, size_t bufferSize, Mode mode)
{
	cleanup();
	int sf_mode;
	switch(mode){
	case kWrite:
		sf_mode = SFM_WRITE;
		break;
	case kRead:
		sf_mode = SFM_READ;
		break;
	}
	sfinfo.format = 0;
	sndfile = sf_open(path.c_str(), sf_mode, &sfinfo);
	if(!sndfile)
		return 1;
	readIdx = 0;
	writeIdx = 0;
	ramOnly = false;
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
	// fill up the first buffer
	ioBuffer = 0;
	io(internalBuffers[ioBuffer]);
	ioBufferOld = ioBuffer;
	// signal threadLoop() to start filling in the next buffer
	if(!ramOnly)
	{
		scheduleIo();
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

int AudioFileReader::setup(const std::string& path, size_t bufferSize)
{
	loop = false;
	return AudioFile::setup(path, bufferSize, kRead);
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
				memset(buffer.data() + dstPtr + readcount, 0, (count - readcount) * sizeof(buffer[0]));
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
		for(; n < samplesCount && readIdx < inBufEnd; ++n)
		{
			done = true;
			dst[n] = inBuf[readIdx++];
		}
		if(readIdx == inBufEnd)
		{
			if(ramOnly)
			{
				if(loop)
					readIdx = loopStart;
				else {
					memset(dst + n, 0, (samplesCount - n) * sizeof(dst[0]));
					n = samplesCount;
					done = true;
				}
			} else {
				readIdx = 0;
				scheduleIo(); // this should give us a new inBuf
			}
		}
		if(!done){
			break;
		}
	}
}
