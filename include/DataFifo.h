#pragma once
#include <mqueue.h>
#include <string>
/**
* Uni-directional RT-safe-queue.
* A light wrapper around mq_...
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
	* @param msgSize maximum size of each message in the queue (bytes)
	* @param maxMsg maximum number of messages in the queue
	* @param blocking set to 1 if queue should block when reading and not
	* data is available, 0 for non-blocking
	* @param recreate if a queue with the same name already exists, destroy
	* it and create a new one (this is the only way the msgSize  and maxMsg
	* parameters can be enforced).
	*
	* @return 0 on success, `-errno` otherwise
	*/
	int setup(const std::string& name, size_t msgSize, size_t maxMsg, bool blocking, bool recreate = true);

	/**
	* Send buffer to queue
	*
	* @param buf buffer containing data to send
	* @param size maximum size of each message
	*
	* @return 0 on success, `-errno` otherwise
	*/
	int send(const char* buf, size_t size);

	/**
	* Receive buffer from queue
	*
	* @param buf buffer to write the received data into.
	* This must have space for at least size bytes, as passed to setup()
	*
	* @return size of message on success, `-errno` otherwise
	*/
	int receive(char* buf, double timeoutMs = 0);

	/**
	* Cleanup queue
	*
	* @return 0 on success, `-errno` otherwise
	*/
	int cleanup();
	static bool test();

private:
	mqd_t queue;
	size_t msgSize;
	std::string qName;
};
