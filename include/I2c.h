#pragma once

#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <linux/i2c-dev.h>
#include <string.h>
// heuristic to guess what version of i2c-dev.h we have:
// one would conflict with linux/i2c.h, while the other ("stock")
// one requires linux/i2c.h
#ifndef I2C_SMBUS_BLOCK_MAX
// If this is not defined, we have the "stock" i2c-dev.h
// so we include linux/i2c.h
#include <linux/i2c.h>
typedef unsigned char i2c_char_t;
#else
typedef char i2c_char_t;
#endif
#include <sys/ioctl.h>

#define MAX_BUF_NAME 64

class I2c
{

protected:
	int i2C_bus;
	int i2C_address;
	int i2C_file = 0;

public:
	ssize_t readBytes(void* buf, size_t count);
	ssize_t writeBytes(const void* buf, size_t count);
	I2c(){};
	I2c(I2c&&) = delete;
	int initI2C_RW(int bus, int defaultAddress, int ignored = 0);
	int closeI2C();
	int read(i2c_char_t *inbuf, unsigned int size);
	int write(i2c_char_t *outbuf, unsigned int size);
	int writeRead(i2c_char_t* outbuf, unsigned int writeSize, i2c_char_t* inbuf, unsigned int readSize);
	void setAddress(int address);
	int readRegisters(i2c_char_t reg, i2c_char_t *inbuf, unsigned int size);
	int writeRegisters(i2c_char_t reg, i2c_char_t *values, unsigned int size);
	virtual ~I2c();
	void makeReadMessage(struct i2c_msg* message, i2c_char_t* inbuf, unsigned int readSize);
	void makeWriteMessage(struct i2c_msg* message, i2c_char_t* outbuf, unsigned int writeSize);
	int doIoctl(i2c_rdwr_ioctl_data* packets);
};

inline int I2c::initI2C_RW(int bus, int address, int)
{
	i2C_bus = bus;
	setAddress(address);

	// open I2C device as a file
	char namebuf[MAX_BUF_NAME];
	snprintf(namebuf, sizeof(namebuf), "/dev/i2c-%d", i2C_bus);

	if ((i2C_file = open(namebuf, O_RDWR)) < 0)
	{
		fprintf(stderr, "Failed to open %s I2C Bus\n", namebuf);
		return(1);
	}

	// target device as slave
	// this is useless if you only use I2C_RDWR, but is needed if you use
	// ::write() or ::read()
	if (ioctl(i2C_file, I2C_SLAVE, i2C_address) < 0){
		fprintf(stderr, "I2C_SLAVE address: %d failed...\n", i2C_address);
		return 2;
	}

	return 0;
}

inline int I2c::closeI2C()
{
	if(i2C_file > 0) {
		if(close(i2C_file) > 0)
			return 1;
		else
			i2C_file = -1;
	}
	i2C_file = 0;
	return 0;
}

inline ssize_t I2c::readBytes(void *buf, size_t count)
{
	return read((i2c_char_t*)buf, count);
}

inline ssize_t I2c::writeBytes(const void *buf, size_t count)
{
	return write((i2c_char_t*)buf, count);
}

inline I2c::~I2c()
{
	closeI2C();
}

//writeRegisters() and readRegisters(): with a little help from https://www.linuxquestions.org/questions/programming-9/reading-data-via-i2c-dev-4175499069/
//also interesting: read the source of linux/i2c-dev.h
inline int I2c::writeRegisters(
	i2c_char_t reg,
	i2c_char_t *values,
	unsigned int size)
{
	i2c_char_t outbuf[1 + size];
	/* The first byte indicates which register we'll write */
	outbuf[0] = reg;

	/*
	* The second and successive bytes indicate the value(s) to write.
	* Note that not all devices will allow writing more than one byte.
	*/
	memcpy((void*)(outbuf + 1), (void*)values, size);

	return write(outbuf, sizeof(outbuf));
}

inline int I2c::readRegisters(
	i2c_char_t reg,
	i2c_char_t *inbuf,
	unsigned int readSize)
{
	i2c_char_t outbuf[1];

	/*
	* In order to read a register, we first do a "dummy write" by writing
	* 0 bytes to the register we want to read from.
	*/
	outbuf[0] = reg;

	return writeRead(outbuf, sizeof(outbuf), inbuf, readSize);
}

inline void I2c::setAddress(int address)
{
	i2C_address = address;
}

inline int I2c::read(i2c_char_t *inbuf, unsigned int size)
{
	struct i2c_rdwr_ioctl_data packets;
	struct i2c_msg messages[1];
	makeReadMessage(&messages[0], inbuf, size);
	packets.msgs = messages;
	packets.nmsgs = 1;
	return doIoctl(&packets);
}

inline int I2c::write(i2c_char_t *outbuf, unsigned int size)
{
	struct i2c_rdwr_ioctl_data packets;
	struct i2c_msg messages[1];
	makeWriteMessage(&messages[0], outbuf, size);
	packets.msgs = messages;
	packets.nmsgs = 1;
	return doIoctl(&packets);
}

inline int I2c::writeRead(i2c_char_t* outbuf, unsigned int writeSize, i2c_char_t* inbuf, unsigned int readSize)
{
	//this is called a repeated start: write and read in a single transaction
	//with two START and only one STOP
	//It is achieved by putting two messages (write, read) into packets
	struct i2c_rdwr_ioctl_data packets;
	struct i2c_msg messages[2];
	makeWriteMessage(&messages[0], outbuf, writeSize);
	makeReadMessage(&messages[1], inbuf, readSize);
	packets.msgs = messages;
	packets.nmsgs = 2;
	return doIoctl(&packets);
}

inline void I2c::makeReadMessage(struct i2c_msg* message, i2c_char_t* inbuf, unsigned int readSize)
{
	message->addr = i2C_address;
	message->flags = I2C_M_RD;
	message->len = readSize;
	message->buf = inbuf;
}

inline void I2c::makeWriteMessage(struct i2c_msg* message, i2c_char_t* outbuf, unsigned int writeSize)
{
	message->addr = i2C_address;
	message->flags = 0;
	message->len = writeSize;
	message->buf = outbuf;
}

inline int I2c::doIoctl(i2c_rdwr_ioctl_data* packets)
{
	int ret = ioctl(i2C_file, I2C_RDWR, packets);
	if(ret < 0) {
		return 1;
	}
	return 0;
}
