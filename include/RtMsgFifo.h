#pragma once
#include <mqueue.h>
#include <string>
/**
* Uni-directional RT-safe-queue.
* A light wrapper around mq_...
*/
class RtMsgFifo
{
public:
	RtMsgFifo();
	~RtMsgFifo();
	/**
	* Set queue
	*
	* @param name name of queue (should start with `/` and contain no other `/`)
	* @param msgSize maximum size of each message in the queue (bytes)
	* @param maxMsg maximum number of messages in the queue
	* @param blocking set to 1 if queue should block when reading and not
	* data is available, 0 for non-blocking
	* @param recreate if a queue with the same name already exists, destroy
	* it and create a new one (this is the only way the msgSize and maxMsg
	* parameters can be enforced).
	* @param fallabck if it fails to create with our desired settings,
	* attempt to create with system defaults.
	*
	* @return 0 on success, `-errno` otherwise
	*/
	int setup(const std::string& name, size_t msgSize = 100000, size_t maxMsg = 100, bool blocking = true, bool recreate = false, bool fallback = false);

	/**
	* Send buffer to queue
	*
	* @param buf buffer containing data to send
	* @param size size of the buffer. This must be no larger than
	* getMsgSize()
	* @param timeoutMs a timeout in milliseconds in case the fifo is full.
	* A negative value means block indefinitely.
	*
	* @return 0 on success, `-errno` otherwise
	*/
	int send(const void* buf, size_t size, double timeoutMs = -1);

	/**
	* Receive buffer from queue
	*
	* @param buf buffer to write the received data into.
	* @param size the size of the buffer. This must be at least as large as
	* getMsgSize().
	* @param timeoutMs a timeout in milliseconds in case the fifo is full.
	* A negative value means block indefinitely.
	*
	* @return size of message on success, `-errno` otherwise
	*/
	int receive(void* buf, size_t size, double timeoutMs = -1);

	/**
	* Cleanup queue
	*/
	void cleanup();
	static bool test();

private:
	mqd_t queue;
	std::string qName;
	bool queueValid = false;
};

/**
* Bi-directional queue with an RT endpoint and a non-RT endpoint.
* If available, it's a light wrapper around Xenomai XDDP sockets,
* otherwise it's a wrapper for UNIX sockets.
* Message boundaries are preserved.
*/
class RtNonRtMsgFifo
{
public:
	RtNonRtMsgFifo() {};
	RtNonRtMsgFifo(const std::string& pipeName, size_t size = 65536 * 128, bool newBlockingRt = false, bool newBlockingNonRt = false);
	~RtNonRtMsgFifo() {cleanup();}
	RtNonRtMsgFifo(RtNonRtMsgFifo&&) = delete;
	/**
	 * Initialise the RtNonRtMsgFifo.
	 *
	 * @param the name of the RtNonRtMsgFifo. Pipes with the same name share data.
	 * @param the size of the RtNonRtMsgFifo. This is the amount of data that can be stored in the pipe. If the
	 * pipe is full, writes will fail.
	 * @param whether reads at the RT side should be blocking (can be modified later)
	 * @param whether reads at the non-RT side should be blocking (can be modified later)
	 * @return true on success, false otherwise
	 */
	bool setup(const std::string& pipeName = defaultName, size_t size = 65536 * 128, bool newBlockingRt = false, bool newBlockingNonRt = false);
	void cleanup();
	/**
	 * Set whether reads at the RT side should be blocking
	 */
	void setBlockingRt(bool blocking);
	/**
	 * Set whether reads at the non-RT side should be blocking
	 */
	void setBlockingNonRt(bool blocking);
	/**
	 * Set timeout for blocking reads at the RT side.
	 */
	void setTimeoutMsRt(double timeoutMs);
	/**
	 * Set timeout for blocking reads at the non-RT side.
	 */
	void setTimeoutMsNonRt(double timeoutMs);
	/**
	 * Send data from the non-RT side.
	 */
	template<typename T> bool writeNonRt(const T& data);
	/**
	 * Send data from the non-RT side.
	 */
	template<typename T> bool writeNonRt(T* ptr, size_t count);
	/**
	 * Send data from the RT side.
	 */
	template<typename T> bool writeRt(const T& data);
	/**
	 * Send data from the RT side.
	 */
	template<typename T> bool writeRt(T* ptr, size_t count);
	/**
	 * Read data from the non-RT side.
	 */
	template<typename T> ssize_t readNonRt(T & dest);
	/**
	 * Read data from the non-RT side.
	 */
	template<typename T> ssize_t readNonRt(T* dest, size_t count);
	/**
	 * Read data from the RT side.
	 */
	template<typename T> ssize_t readRt(T & dest);
	/**
	 * Read data from the RT side.
	 */
	template<typename T> ssize_t readRt(T* dest, size_t count);
private:
	bool _writeNonRt(void* ptr, size_t size);
	bool _writeRt(void* ptr, size_t size);
	ssize_t _readRtNonRt(void* ptr, size_t size, bool rt);
	ssize_t _readNonRt(void* ptr, size_t size);
	ssize_t _readRt(void* ptr, size_t size);
	static std::string defaultName;
	std::string name;
	int pipeSocket;
	int fd = 0;
	size_t pipeSize;
	double timeoutMsRt = -1;
	double timeoutMsNonRt = -1;
	bool blockingRt = false;
	bool blockingNonRt = false;
};

template<typename T> bool RtNonRtMsgFifo::writeNonRt(const T& data)
{
	return writeNonRt(&data, 1);
}

template <typename T> bool RtNonRtMsgFifo::writeNonRt(T* data, size_t count)
{
	size_t size = count * sizeof(*data);
	return _writeNonRt((void*)data, size);
}

template<typename T> bool RtNonRtMsgFifo::writeRt(const T& data)
{
	return writeRt(&data, 1);
}

template <typename T> bool RtNonRtMsgFifo::writeRt(T* ptr, size_t count)
{
	size_t size = count * sizeof(*ptr);
	return _writeRt((void*)ptr, size);
}

template<typename T> ssize_t RtNonRtMsgFifo::readRt(T & dest)
{
	return readRt(&dest, 1);
}

template<typename T> ssize_t RtNonRtMsgFifo::readRt(T* dest, size_t count)
{
	ssize_t ret = _readRt((void*)dest, count * sizeof(*dest));
	if(ret >= 0)
		return ret / sizeof(*dest);
	else
		return ret;
}

template<typename T> ssize_t RtNonRtMsgFifo::readNonRt(T & dest)
{
	return readNonRt(&dest, 1);
}

template<typename T> ssize_t RtNonRtMsgFifo::readNonRt(T* dest, size_t count)
{
	ssize_t ret = _readNonRt((void*)dest, count * sizeof(*dest));
	if(ret >= 0)
		return ret / sizeof(*dest);
	else
		return ret;
}
