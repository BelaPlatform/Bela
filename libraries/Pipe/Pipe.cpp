#include "Pipe.h"
#include <xenomai_wraps.h>
#include <stdexcept>
#include <sys/select.h>
std::string Pipe::defaultName;

Pipe::Pipe(const std::string& pipeName, size_t size, bool newBlockingRt, bool newBlockingNonRt)
{
	if(!setup(pipeName, size, newBlockingRt, newBlockingNonRt))
		throw std::runtime_error((std::string("Pipe: ")+std::string(" failed to initialize. NOTE: cannot call setup() or the constructor before Xenomai has been initialised\n")).c_str());
}

bool Pipe::setup(const std::string& pipeName, size_t size, bool newBlockingRt, bool newBlockingNonRt)
{
	if(fd)
		cleanup();
	fd = 0;
	pipeSize = size;

	name = "p_" + pipeName;
	int ret = createBelaRtPipe(name.c_str(), pipeSize);
	if(ret < 0)
	{
		fprintf(stderr, "Unable to create pipe %s with %u bytes: (%i) %s\n", name.c_str(), pipeSize, ret, strerror(ret));
		return false;
	}
	pipeSocket = ret;
	path = "/proc/xenomai/registry/rtipc/xddp/" + name;
	// no idea why, but a usleep(0) is needed here. Give it a bit more time,
	// just in case
	usleep(10000);
	unsigned int blockingFlag = blockingNonRt ? 0 : O_NONBLOCK;
	fd = open(path.c_str(), O_RDWR | blockingFlag);
	if(fd < 0)
	{
		fprintf(stderr, "Unable to open pipe %s: (%i) %s\n", path.c_str(), errno, strerror(errno));
		//TODO: close the pipe
		return false;
	
	}
	setBlockingRt(newBlockingRt);
	setBlockingNonRt(newBlockingNonRt);
	return true;
}

void Pipe::setBlockingRt(bool blocking)
{
	blockingRt = blocking;
	int flags = BELA_RT_WRAP(fcntl(pipeSocket, F_GETFL));
	if(blocking)
	{
		flags ^= O_NONBLOCK;
	} else {
		flags |= O_NONBLOCK;
	}
	if(int ret = BELA_RT_WRAP(fcntl(pipeSocket, F_SETFL, flags)))
	{
		fprintf(stderr, "Unable to set socket non blocking\n");
	}
}

void Pipe::setBlockingNonRt(bool blocking)
{
	blockingNonRt = blocking;
	int flags = fcntl(fd, F_GETFL);
	if(blocking)
	{
		flags ^= O_NONBLOCK;
	} else {
		flags |= O_NONBLOCK;
	}
	if(int ret = fcntl(fd, F_SETFL, flags))
	{
		fprintf(stderr, "Unable to set socket non blocking\n");
	}
}

void Pipe::setTimeoutMsRt(double timeoutMs)
{
	timeoutMsRt = timeoutMs;
}

void Pipe::setTimeoutMsNonRt(double timeoutMs)
{
	timeoutMsNonRt = timeoutMs;
}

void Pipe::cleanup()
{
	close(fd);
	BELA_RT_WRAP(close(pipeSocket));
}

bool Pipe::_writeNonRt(void* ptr, size_t size)
{
	ssize_t ret = write(fd, (void*)ptr, size);
	if(ret < 0 || ret != size)
	{
		return false;
	}
	return true;
}

bool Pipe::_writeRt(void* ptr, size_t size)
{
	ssize_t ret = BELA_RT_WRAP(send(pipeSocket, (void*)ptr, size, 0));
	if(ret < 0 || ret != size)
	{
		return false;
	}
	return true;
}

ssize_t Pipe::_readRt(void* ptr, size_t size)
{
	return _readRtNonRt(ptr, size, true);
}

ssize_t Pipe::_readNonRt(void* ptr, size_t size)
{
	return _readRtNonRt(ptr, size, false);
}

ssize_t Pipe::_readRtNonRt(void* ptr, size_t size, bool rt)
{
	bool blocking = rt ? blockingRt : blockingNonRt;
	double timeoutMs = rt ? timeoutMsRt : timeoutMsNonRt;
	int (*_select)(int, fd_set*, fd_set*, fd_set*, struct timeval*) = rt ? BELA_RT_WRAP(select : select);
	int file = rt ? pipeSocket : fd;
	bool doIt = false;
	int ret = 0;
	if(blocking)
	{
		struct timeval tv;
		tv.tv_sec = ((unsigned int)timeoutMs) / 1000;
		tv.tv_usec = (timeoutMs - tv.tv_sec * 1000.f) * 1000.f;
		fd_set fdSet;
		FD_ZERO(&fdSet);
		FD_SET(file, &fdSet);
		ret = _select(file + 1, &fdSet, NULL, NULL, &tv);
		if(1 == ret && FD_ISSET(file, &fdSet))
			doIt = true;
	}
	if(!blocking || doIt){
		if(rt)
			ret = BELA_RT_WRAP(recv(file, ptr, size, 0));
		else
			ret = read(file, ptr, size);
	}
	return ret;
}

#if 0
// tests
#include <stdlib.h>
#include <array>
#undef NDEBUG
#include <assert.h>

template <typename T1, typename T2>
static bool areEqual(const T1& vec1, const T2& vec2)
{
	if(vec1.size() != vec2.size())
		return false;	
	for(unsigned int n = 0; n < vec1.size(); ++n)
	{
		if(vec1[n] != vec2[n])
		{
			return false;
		}
	}
	return true;
}

template <typename T>
static void scramble(T& vec)
{
	for(unsigned int n = 0; n < vec.size(); ++n)
	{
		vec[n] = rand();
	}
}

int testPipe()
{
	printf("testPipe\n");
	Pipe pipe("assaaa", 8192, true, false);
	std::array<float, 1000> payload;
	{
		//Rt to NonRt
		scramble(payload);
		bool success = pipe.writeRt(payload);
		assert(success);
		std::array<float, payload.size()> rec;
		int ret = pipe.readNonRt(rec.data(), rec.size());
		assert(ret == rec.size());
		assert(areEqual(payload, rec));
		ret = pipe.readNonRt(rec.data(), rec.size());
		assert(areEqual(payload, rec));
		assert(ret != rec.size());
		assert(ret < 0);
	}
	printf("second\n");
	{
		//NonRt to Rt
		scramble(payload);
		bool success = pipe.writeNonRt(payload);
		assert(success);
		std::array<float, payload.size()> rec;
		int ret = pipe.readRt(rec.data(), rec.size());
		assert(ret == rec.size());
		assert(areEqual(payload, rec));
		ret = pipe.readRt(rec.data(), rec.size());
		assert(areEqual(payload, rec));
		assert(0 == ret);
	}

	printf("Test for Pipe successful\n");
	exit (0);
}
#endif

