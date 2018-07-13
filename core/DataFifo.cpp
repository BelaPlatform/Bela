#include <DataFifo.h>

DataFifo::DataFifo()
{
}

DataFifo::~DataFifo()
{
	cleanup();
}

int DataFifo::setup(const std::string& name, size_t queueSize, bool blocking)
{
	struct mq_attr attr;
	attr.mq_maxmsg = 100;
	attr.mq_msgsize = queueSize;
	// Check if queue already exists
	queue = __wrap_mq_open(name.c_str(), O_RDWR);
	if(queue != -1)
	{
		// queue with this name already exists
		return -1;
	}		
	// Open a new queue
	queue = __wrap_mq_open(name.c_str(), O_CREAT | O_RDWR | (blocking ? O_NONBLOCK : 0) , 0644, &attr);
	if(queue < 0)
		return -errno;
	qName = name.c_str();
	return 0;
}

int DataFifo::send(char* buf, size_t size)
{
	int ret = __wrap_mq_send(queue, (char*)buf, size, 0);
	if(ret != 0)
		return -errno;
	return 0;
}

int DataFifo::receive(char* buf, size_t size)
{
	unsigned int prio;
	ssize_t ret = __wrap_mq_receive(queue, buf, size, &prio); 
	if(ret < 0)
		return -errno;
	return ret;
}

int DataFifo::cleanup()
{
	int ret = __wrap_mq_close(queue);
	if(ret < 0)
		return -errno;
	ret = __wrap_mq_unlink(qName.c_str());
	if(ret <0)
		return -errno;
	return 0;
}
