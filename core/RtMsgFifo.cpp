#include <RtMsgFifo.h>
#include <sys/errno.h>
#include <time.h>
#include <RtWrappers.h>
#include <string.h>
#include <errno.h>

RtMsgFifo::RtMsgFifo()
{
}

RtMsgFifo::~RtMsgFifo()
{
	cleanup();
}

int RtMsgFifo::setup(const std::string& name, size_t msgSize, size_t maxMsg, bool blocking, bool recreate, bool fallback)
{
	Bela_initRtBackend();
	qName = std::string("/q_") + name + std::to_string((long long unsigned)(this));
	struct mq_attr attr;
	attr.mq_maxmsg = maxMsg;
	attr.mq_msgsize = msgSize;
	// Check if queue already exists
	queue = BELA_RT_WRAP(mq_open(qName.c_str(), O_RDWR));
	if((mqd_t)-1 != queue)
	{
		if(recreate)
		{
			// if there already is a queue with this name, try to close it.
			BELA_RT_WRAP(mq_close(queue));
			BELA_RT_WRAP(mq_unlink(qName.c_str()));
		}
	}		
	// Open a new queue
	int flags = O_CREAT | O_RDWR | (blocking ? 0 : O_NONBLOCK);
	queue = BELA_RT_WRAP(mq_open(qName.c_str(), flags, 0644, &attr));
	bool systemDefaults = true;
	if((mqd_t)-1 == queue)
	{
		if(fallback)
		{
			systemDefaults = true;
			// try with the system defaults
			fprintf(stderr, "Opening queue %s with desired settings failed, trying with system defaults\n", qName.c_str());
			queue = BELA_RT_WRAP(mq_open(qName.c_str(), O_CREAT | O_RDWR, 0644, nullptr));
		}
		if((mqd_t)-1 == queue)
		{

			fprintf(stderr, "Error creating queue %s: %d %s\n", qName.c_str(), errno, strerror(errno));
			return -errno;
		}
	}
	struct mq_attr newAttr;
	BELA_RT_WRAP(mq_getattr(queue, &newAttr));
	// verify that all settings have been applied (a reason for failure
	// could be that the queue was not successfully closed above
	if((recreate || systemDefaults) && (
			newAttr.mq_maxmsg != attr.mq_maxmsg
			|| newAttr.mq_msgsize != attr.mq_msgsize
			|| ((newAttr.mq_flags & flags) == flags)
		       )
	  )
	{
		fprintf(stderr, "Queue %s has following attributes: mq_maxmsg: %ld, mq_msgsize: %ld, mq_curmsgs: %ld, mq_flags: %ld\n", qName.c_str(), newAttr.mq_maxmsg, newAttr.mq_msgsize, newAttr.mq_curmsgs, newAttr.mq_flags);
	}
	queueValid = true;
	return 0;
}

static inline struct timespec getTimeout(double timeoutMs)
{
	struct timespec timeout;
	if(0 == timeoutMs)
	{
		timeout = {0, 0};
	} else {
		BELA_RT_WRAP(clock_gettime(CLOCK_REALTIME, &timeout));
		//struct timespec timeoutbak = timeout;
		long oneSecondNs = 1000000000;
		time_t timeoutS = (time_t)(timeoutMs / 1000);
		long timeoutNs = (timeoutMs - timeoutS * 1000) * 1000000;
		timeout.tv_sec -= timeoutS;
		timeout.tv_nsec += timeoutNs;
		while(timeout.tv_nsec > oneSecondNs)
		{
			timeout.tv_nsec -= oneSecondNs;
			timeout.tv_sec += 1;
		}
	}
	return timeout;
}

int RtMsgFifo::send(const void* buf, size_t size, double timeoutMs)
{
	ssize_t ret;
	if(timeoutMs >= 0)
	{
		struct timespec timeout = getTimeout(timeoutMs);
		ret = BELA_RT_WRAP(mq_timedsend(queue, (const char*)buf, size, 0, &timeout));
	} else {
		ret = BELA_RT_WRAP(mq_send(queue, (const char*)buf, size, 0));
	}
	if(ret != 0)
		return -errno;
	return 0;
}

int RtMsgFifo::receive(void* buf, size_t size, double timeoutMs)
{
	unsigned int prio;
	ssize_t ret;
	if(timeoutMs >= 0)
	{
		struct timespec timeout = getTimeout(timeoutMs);
		ret = BELA_RT_WRAP(mq_timedreceive(queue, (char*)buf, size, &prio, &timeout));
	} else {
		ret = BELA_RT_WRAP(mq_receive(queue, (char*)buf, size, &prio));
	}

	if(ret < 0)
		return -errno;
	return ret;
}

void RtMsgFifo::cleanup()
{
	if(queueValid)
	{
		int ret = BELA_RT_WRAP(mq_close(queue));
		if(ret)
			fprintf(stderr, "Error closing queue %s: %d %s\n", qName.c_str(), errno, strerror(errno));
		ret = BELA_RT_WRAP(mq_unlink(qName.c_str()));
		if(ret)
			fprintf(stderr, "Error unlinking queue %s: %d %s\n", qName.c_str(), errno, strerror(errno));
	}
	queueValid = false;
	queue = (mqd_t)-1;
}

#if 0
#include <vector>
#undef NDEBUG
#include <assert.h>
#include <stdlib.h>
static bool arrayEqual(const void* data1, const void* data2, size_t size)
{
	for(size_t n = 0; n < size; ++n)
		if(((const char*)data1)[n] != ((const char*)data2)[n])
			return false;
	return true;
}
template<typename T>
void fillArray(std::vector<T>& vec)
{
	for(auto& a : vec)
		a = rand();
}
bool RtMsgFifo::test()
{
	RtMsgFifo df;
	ssize_t msgSize = 1000;
	ssize_t numMsg = 100;
	std::vector<char> sent(msgSize * numMsg);
	std::vector<char> received(msgSize * numMsg);
	for(unsigned int n = 0; n < sent.size(); ++n)
	{
		sent[n] = n + 1;
	}
	int ret = df.setup("/testname", msgSize, numMsg, false);
	assert(0 == ret);
	ret = df.receive(received.data(), msgSize);
	assert(-EAGAIN == ret);

	ret = df.send(sent.data(), msgSize);
	assert(0 == ret);
	ret = df.receive(received.data(), msgSize);
	assert(ret == msgSize);
	assert(arrayEqual(sent.data(), received.data(), msgSize));

	ret = df.send(sent.data(), msgSize * 2);
	assert(-EMSGSIZE == ret);

	ssize_t newsz = msgSize / 2;
	ret = df.send(sent.data(), newsz);
	assert(0 == ret);
	fillArray(received);
	ret = df.receive(received.data(), msgSize);
	assert(ret == newsz);
	assert(arrayEqual(sent.data(), received.data(), newsz));

	// ensure the queue is empty
	assert(-EAGAIN == df.receive(received.data(), msgSize));
	fillArray(received);
	// fill up the queue
	for(unsigned int n = 0; n < sent.size(); n += msgSize)
	{
		ret = df.send(&sent[n], msgSize);
		assert(0 == ret);
	}
	// try to send one more message
	ret = df.send(sent.data(), msgSize);
	// it will fail
	assert(-EAGAIN == ret);
	// now drain the queue
	for(unsigned int n = 0; n < received.size(); n += msgSize)
	{
		ret = df.receive(&received[n], msgSize);
		assert(msgSize == ret);
	}
	assert(arrayEqual(sent.data(), received.data(), sent.size()));
	// ensure the queue is empty
	assert(-EAGAIN == df.receive(received.data(), msgSize));

	return true;
}
#endif

#include <stdexcept>
#include <fcntl.h>
#include <unistd.h>
#include <sys/select.h>
#include <errno.h>
#include <string.h>

std::string RtNonRtMsgFifo::defaultName;

RtNonRtMsgFifo::RtNonRtMsgFifo(const std::string& pipeName, size_t size, bool newBlockingRt, bool newBlockingNonRt)
{
	if(!setup(pipeName, size, newBlockingRt, newBlockingNonRt))
		throw std::runtime_error((std::string("RtNonRtMsgFifo: ")+std::string(" failed to initialize. NOTE: cannot call setup() or the constructor before Xenomai has been initialised\n")).c_str());
}

bool RtNonRtMsgFifo::setup(const std::string& pipeName, size_t size, bool newBlockingRt, bool newBlockingNonRt)
{
	if(nonRtFd)
		cleanup();
	nonRtFd = -1;
	pipeSize = size;

	name = "p_" + pipeName;
	// sanitise: this could be used in paths to create pipes
	for(auto& c : name)
		if('/' == c || '\\' == c  || ':' == c || ' ' == c || '\t' == c || '\n' ==c || '\r' == c || '\0' == c)
			c = '_';
	int ret = createBelaRtPipe(name.c_str(), pipeSize, &rtFd, &nonRtFd);
	if(ret)
	{
		fprintf(stderr, "Unable to create pipe %s with %zu bytes: (%i) %s\n", name.c_str(), pipeSize, ret, strerror(ret));
		return false;
	}
	setBlockingRt(newBlockingRt);
	setBlockingNonRt(newBlockingNonRt);
	return true;
}

void RtNonRtMsgFifo::setBlockingRt(bool blocking)
{
	blockingRt = blocking;
	int flags = BELA_RT_WRAP(fcntl(rtFd, F_GETFL));
	if(blocking)
	{
		flags ^= O_NONBLOCK;
	} else {
		flags |= O_NONBLOCK;
	}
	if(int ret = BELA_RT_WRAP(fcntl(rtFd, F_SETFL, flags)))
	{
		fprintf(stderr, "Unable to set socket non blocking\n");
	}
}

void RtNonRtMsgFifo::setBlockingNonRt(bool blocking)
{
	blockingNonRt = blocking;
	int flags = fcntl(nonRtFd, F_GETFL);
	if(blocking)
	{
		flags ^= O_NONBLOCK;
	} else {
		flags |= O_NONBLOCK;
	}
	if(int ret = fcntl(nonRtFd, F_SETFL, flags))
	{
		fprintf(stderr, "Unable to set socket non blocking\n");
	}
}

void RtNonRtMsgFifo::setTimeoutMsRt(double timeoutMs)
{
	timeoutMsRt = timeoutMs;
}

void RtNonRtMsgFifo::setTimeoutMsNonRt(double timeoutMs)
{
	timeoutMsNonRt = timeoutMs;
}

void RtNonRtMsgFifo::cleanup()
{
	close(nonRtFd);
	BELA_RT_WRAP(close(rtFd));
}

bool RtNonRtMsgFifo::_writeNonRt(void* ptr, size_t size)
{
	ssize_t ret = write(nonRtFd, (void*)ptr, size);
	if(ret < 0 || ret != size)
	{
		return false;
	}
	return true;
}

bool RtNonRtMsgFifo::_writeRt(void* ptr, size_t size)
{
	ssize_t ret = BELA_RT_WRAP(send(rtFd, (void*)ptr, size, 0));
	if(ret < 0 || ret != size)
	{
		return false;
	}
	return true;
}

ssize_t RtNonRtMsgFifo::_readRt(void* ptr, size_t size)
{
	return _readRtNonRt(ptr, size, true);
}

ssize_t RtNonRtMsgFifo::_readNonRt(void* ptr, size_t size)
{
	return _readRtNonRt(ptr, size, false);
}

ssize_t RtNonRtMsgFifo::_readRtNonRt(void* ptr, size_t size, bool rt)
{
	bool blocking = rt ? blockingRt : blockingNonRt;
	double timeoutMs = rt ? timeoutMsRt : timeoutMsNonRt;
	int (*_select)(int, fd_set*, fd_set*, fd_set*, struct timeval*) = rt ? BELA_RT_WRAP(select : select);
	int file = rt ? rtFd : nonRtFd;
	bool doIt = false;
	int ret = 0;
	if(blocking)
	{
		struct timeval* timeout;
		struct timeval tv;
		if(timeoutMs >= 0)
		{
			tv.tv_sec = ((unsigned int)timeoutMs) / 1000;
			tv.tv_usec = (timeoutMs - tv.tv_sec * 1000.f) * 1000.f;
			timeout = &tv;
		} else {
			// block indefinitely
			timeout = nullptr;
		}
		fd_set fdSet;
		FD_ZERO(&fdSet);
		FD_SET(file, &fdSet);
		ret = _select(file + 1, &fdSet, NULL, NULL, timeout);
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

int testRtNonRtMsgFifo()
{
	printf("testRtNonRtMsgFifo\n");
	RtNonRtMsgFifo pipe("assaaa", 8192, true, false);
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

	printf("Test for RtNonRtMsgFifo successful\n");
	exit (0);
}
#endif
