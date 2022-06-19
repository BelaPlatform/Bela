#include <DataFifo.h>

DataFifo::DataFifo()
{
}

DataFifo::~DataFifo()
{
	cleanup();
}

int DataFifo::setup(const std::string& name, size_t msgSize, size_t maxMsg, bool blocking, bool recreate)
{
	this->msgSize = msgSize;
	struct mq_attr attr;
	attr.mq_maxmsg = maxMsg;
	attr.mq_msgsize = msgSize;
	// Check if queue already exists
	queue = BELA_RT_WRAP(mq_open(name.c_str(), O_RDWR));
	if(queue != -1)
	{
		if(recreate)
		{
			// if there already is a queue with this name, try to close it.
			BELA_RT_WRAP(mq_close(queue));
			BELA_RT_WRAP(mq_unlink(name.c_str()));
		}
	}		
	// Open a new queue
	int flags = O_CREAT | O_RDWR | (blocking ? 0 : O_NONBLOCK);
	queue = BELA_RT_WRAP(mq_open(name.c_str(), flags, 0644, &attr));
	if(queue < 0)
		return -errno;
	struct mq_attr newAttr;
	BELA_RT_WRAP(mq_getattr(queue, &newAttr));
	// verify that all settings have been applied (a reason for failure
	// could be that the queue was not successfully closed above
	if(recreate && (
			newAttr.mq_maxmsg != attr.mq_maxmsg
			|| newAttr.mq_msgsize != attr.mq_msgsize
			|| ((newAttr.mq_flags & flags) == flags)
		       )
	  )
		return -1;
	qName = name;
	return 0;
}

int DataFifo::send(const char* buf, size_t size)
{
	int ret = BELA_RT_WRAP(mq_send(queue, (const char*)buf, size, 0));
	if(ret != 0)
		return -errno;
	return 0;
}

int DataFifo::receive(char* buf, double timeoutMs)
{
	unsigned int prio;
	ssize_t ret;
	if(timeoutMs)
	{
		struct timespec timeout;
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
#if 0
		time_t actualS = timeoutbak.tv_sec - timeout.tv_sec;
		long actualNs = timeoutbak.tv_nsec - timeout.tv_nsec;
		double actual = actualS * 1000 + actualNs / 1000000.0;
		if(actual - timeoutMs > 0.001)
			printf("Unexpected timeout: ms: %f, bak: %lus %luns , actual: %lus %luns \n",
					timeoutMs, timeoutbak.tv_sec, timeoutbak.tv_nsec,
					timeout.tv_sec, timeout.tv_nsec
					);
#endif
		ret = BELA_RT_WRAP(mq_timedreceive(queue, buf, msgSize, &prio, &timeout));
	} else {
		ret = BELA_RT_WRAP(mq_receive(queue, buf, msgSize, &prio));
	}

	if(ret < 0)
		return -errno;
	return ret;
}

int DataFifo::cleanup()
{
	int ret = BELA_RT_WRAP(mq_close(queue));
	if(ret < 0)
		return -errno;
	ret = BELA_RT_WRAP(mq_unlink(qName.c_str()));
	if(ret <0)
		return -errno;
	return 0;
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
bool DataFifo::test()
{
	DataFifo df;
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
	ret = df.receive(received.data());
	assert(-EAGAIN == ret);

	ret = df.send(sent.data(), msgSize);
	assert(0 == ret);
	ret = df.receive(received.data());
	assert(ret == msgSize);
	assert(arrayEqual(sent.data(), received.data(), msgSize));

	ret = df.send(sent.data(), msgSize * 2);
	assert(-EMSGSIZE == ret);

	ssize_t newsz = msgSize / 2;
	ret = df.send(sent.data(), newsz);
	assert(0 == ret);
	fillArray(received);
	ret = df.receive(received.data());
	assert(ret == newsz);
	assert(arrayEqual(sent.data(), received.data(), newsz));

	// ensure the queue is empty
	assert(-EAGAIN == df.receive(received.data()));
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
		ret = df.receive(&received[n]);
		assert(msgSize == ret);
	}
	assert(arrayEqual(sent.data(), received.data(), sent.size()));
	// ensure the queue is empty
	assert(-EAGAIN == df.receive(received.data()));

	return true;
}
