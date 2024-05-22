#include <AuxTaskRT.h>
#include <fcntl.h>
#include <RtWrappers.h>
#include <stdlib.h>
#include <vector>
#include <string.h>
AuxTaskRT::~AuxTaskRT()
{
	lShouldStop = true;
	struct timespec absoluteTimeout = {0, 0};
	// non blocking write, so if the queue is full it won't fail
	char c = 0;
	int ret = BELA_RT_WRAP(mq_timedsend(queueDesc, &c, sizeof(c), 0, &absoluteTimeout));
	if(ret)
		fprintf(stderr, "Error mq_timedsend: %d %s\n", errno, strerror(errno));
	join();
	ret = BELA_RT_WRAP(mq_close(queueDesc));
	if(ret)
		fprintf(stderr, "Error closing queueDesc: %d %s\n", errno, strerror(errno));
	ret = BELA_RT_WRAP(mq_unlink(queueName.c_str()));
	if(ret)
		fprintf(stderr, "Error unlinking queue: %d %s\n", errno, strerror(errno));
}

int AuxTaskRT::commsInit()
{
	// create a queue, with prefixed name
	queueName = std::string("/q_") + name;
	struct mq_attr attr;
	attr.mq_maxmsg = 100;
	attr.mq_msgsize = 100000;
	queueDesc = BELA_RT_WRAP(mq_open(queueName.c_str(), O_CREAT | O_RDWR, 0644, &attr));
	if(queueDesc < 0)
		return 1;
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

