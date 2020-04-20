#pragma once

#include <stddef.h>

class Serial {
public:
	Serial();
	~Serial();
	/**
	 * Initialize the device
	 *
	 * @param device path to the device file (e.g.: `/dev/ttyS4` for UART4)
	 * @param speed the speed of the communication, for instance `9600` or
	 * `115200`. Only values in `/usr/include/arm-linux-gnueabihf/` are
	 * valid.
	 * @return 0 on success, an error code otherwise.
	 */
	int setup(const char* device, unsigned int speed);
	/**
	 * Read bytes from the serial port with specified timeout.
	 *
	 * @param buf the destination for the data being read.
	 * @param len the maximum amount of bytes to be read.
	 * @param timeoutMs the timeout (in ms) after which the function call
	 * will return. A negative value means infinite timeout (default).
	 *
	 * @return The number of bytes read, or 0 if the timeout has expired,
	 * or a negative error code if an error occurred.
	 */
	int read(char* buf, size_t len, int timeoutMs = -1);
	/**
	 * Write bytes to the serial port.
	 *
	 * @param buf a buffer containing the data to be written.
	 * @param len the number of bytes to write. If omitted, `buf` will be
	 * the length of the string pointed at by `buf`.
	 *
	 * @return the number of bytes written, or a negative error cade if an
	 * error occurred.
	 */
	int write(const char* buf, size_t len = -1);
	/**
	 * Close the device.
	 */
	void cleanup();
private:
	static unsigned int speedToBaudRate(unsigned int speed);
	void setMinCount(int mcount);
	int setInterfaceAttribs(unsigned int speed);
	int fd;
};
