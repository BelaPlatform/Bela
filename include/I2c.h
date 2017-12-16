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


class I2c
{

protected:
	int i2cBus;
	int i2cAddress;
	int i2cFile = 0;
	bool debugMode = 0;

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
	void setDebug(int debugMode);
};
