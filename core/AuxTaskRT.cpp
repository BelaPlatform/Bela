#include <AuxTaskRT.h>
#include <fcntl.h>
#include <RtWrappers.h>
#include <stdlib.h>
#include <vector>
#include <string.h>

AuxTaskRT::~AuxTaskRT()
{
	lShouldStop = true;
	if(queueValid)
	{
		struct timespec absoluteTimeout = {0, 0};
		// non blocking write, so if the queue is full it won't fail
		char c = 0;
		int ret = BELA_RT_WRAP(mq_timedsend(queueDesc, &c, sizeof(c), 0, &absoluteTimeout));
		if(ret)
			fprintf(stderr, "Error mq_timedsend: %d %s\n", errno, strerror(errno));
	}
	join();
	if(queueValid)
	{
		int ret = BELA_RT_WRAP(mq_close(queueDesc));
		if(ret)
			fprintf(stderr, "Error closing queueDesc: %d %s\n", errno, strerror(errno));
		ret = BELA_RT_WRAP(mq_unlink(queueName.c_str()));
		if(ret)
			fprintf(stderr, "Error unlinking queue: %d %s\n", errno, strerror(errno));
	}
}

int AuxTaskRT::commsInit()
{
	// create a queue, with prefixed name
	queueName = std::string("/q_") + name + std::to_string((long long unsigned)(this));
	struct mq_attr attr;
	attr.mq_maxmsg = 100;
	attr.mq_msgsize = 100000;
	// first try with our desired queue properties, failing that try with the system defaults
	for(auto& ptr : {&attr, (struct mq_attr*)nullptr})
	{
		queueDesc = BELA_RT_WRAP(mq_open(queueName.c_str(), O_CREAT | O_RDWR, 0644, ptr));
		queueValid = ((mqd_t)-1 != queueDesc);
		if(queueValid)
		{
			break;
		} else {
			if(&attr == ptr)
			{
				fprintf(stderr, "Opening queue %s with desired settings failed, trying with system defaults\n", queueName.c_str());
			}
		}
	}
	if(!queueValid)
	{
		fprintf(stderr, "Error creating queue %s: %d %s\n", queueName.c_str(), errno, strerror(errno));
		return 1;
	}
	return 0;
}

int AuxTaskRT::commsSend(const void* buf, size_t size)
{
	if(BELA_RT_WRAP(mq_send(queueDesc, (char*)buf, size, 0)))
	{
		if(!shouldStop()) fprintf(stderr, "Unable to send message to queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
		return 1;
	}
	return 0;
}

ssize_t AuxTaskRT::commsReceive(char* buf, size_t size)
{
	unsigned int prio;
	return BELA_RT_WRAP(mq_receive(queueDesc, buf, size, &prio));
}

