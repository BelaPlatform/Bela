#pragma once
#include <string>

/**
 * 
 * A bi-directional pipe to exchange data between a RT and a non-RT thread.
 * 
 */
class Pipe
{
public:
	Pipe() {};
	Pipe(const std::string& pipeName, size_t size = 65536 * 128, bool newBlockingRt = false, bool newBlockingNonRt = false);
	~Pipe() {cleanup();}
	/**
	 * Initialise the Pipe.
	 * 
	 * @param the name of the Pipe. Pipes with the same name share data.
	 * @param the size of the Pipe. This is the amount of data that can be stored in the pipe. If the 
	 * pipe is full, writes will fail.
	 * @param whether reads at the RT side should be blocking (can be modified later)
	 * @param whether reads at the non-RT side should be blocking (can be modified later)
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
	 * Send data to the non-RT side.
	 */
	template<typename T> bool writeNonRt(const T& data);
	/**
	 * Send data to the non-RT side.
	 */
	template<typename T> bool writeNonRt(T* ptr, size_t count);
	/**
	 * Send data to the RT side.
	 */
	template<typename T> bool writeRt(const T& data);
	/**
	 * Send data to the RT side.
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
	ssize_t _readNonRt(void* ptr, size_t size);
	ssize_t _readRt(void* ptr, size_t size);
	static std::string defaultName;
	std::string name;
	std::string path;
	int pipeSocket;
	int fd;
	int pipeSize;
	double timeoutMsRt = 0;
	double timeoutMsNonRt = 0;
	bool blockingRt = false;
	bool blockingNonRt = false;
};

template<typename T> bool Pipe::writeNonRt(const T& data) 
{
	return writeNonRt(&data, 1);
}

template <typename T> bool Pipe::writeNonRt(T* data, size_t count)
{
	size_t size = count * sizeof(*data);
	return _writeNonRt((void*)data, size);
}

template<typename T> bool Pipe::writeRt(const T& data) 
{
	return writeRt(&data, 1);
}

template <typename T> bool Pipe::writeRt(T* ptr, size_t count)
{
	size_t size = count * sizeof(*ptr);
	return _writeRt((void*)ptr, size);
}

template<typename T> ssize_t Pipe::readRt(T & dest)
{
	return readRt(&dest, 1);
}

template<typename T> ssize_t Pipe::readRt(T* dest, size_t count)
{
	ssize_t ret = _readRt((void*)dest, count * sizeof(*dest));
	if(ret >= 0)
		return ret / sizeof(*dest);
	else
		return ret;
}

template<typename T> ssize_t Pipe::readNonRt(T & dest)
{
	return readNonRt(&dest, 1);
}

template<typename T> ssize_t Pipe::readNonRt(T* dest, size_t count)
{
	ssize_t ret = _readNonRt((void*)dest, count * sizeof(*dest));
	if(ret >= 0)
		return ret / sizeof(*dest);
	else
		return ret;
}
