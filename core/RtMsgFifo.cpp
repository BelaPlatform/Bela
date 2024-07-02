#include <RtMsgFifo.h>
#include <sys/errno.h>
#include <time.h>
#include "RtWrappers.h"
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
