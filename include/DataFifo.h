#pragma once
#include <mqueue.h>
#include <string>
/**
* Uni-directional RT-safe-queue.
* A light wrapper around __wrap_mq_...
*/
class DataFifo
{
public:
	DataFifo();
	~DataFifo();
	/**
	* Set queue
	*
	* @param name name of queue (should start with `/` and contain no other `/`)
	* @param queueSize size of queue (bytes)
	* @param blocking set to 1 if queue should block when reading and not data is available, 0 for non-blocking
	*
	* @return 0 on success, `-errno` otherwise
	*/
	int setup(const std::string& name, size_t queueSize, bool blocking);

	/**
	* Send buffer to queue
	*
	* @param buf buffer containing data to send
	* @param size size of buffer
	*
	* @return 0 on success, `-errno` otherwise
	*/
	int send(char* buf, size_t size);

	/**
	* Receive buffer from queue
	*
	* @param buf buffer to pass the data to
	* @param size size of buffer
	*
	* @return size of message on success, `-errno` otherwise
	*/
	int receive(char* buf, size_t maxSize);

	/**
	* Cleanup queue
	*
	* @return 0 on success, `-errno` otherwise
	*/
	int cleanup();

private:
	mqd_t queue;
	std::string qName;
};
