#pragma once

#include <stdio.h>
#include <unistd.h>
#include <fcntl.h>
#include <linux/i2c-dev.h>
// heuristic to guess what version of i2c-dev.h we have:
// the one installed with `apt-get install libi2c-dev`
// would conflict with linux/i2c.h, while the stock
// one requires linus/i2c.h
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
	int i2C_file;

public:
	int initI2C_RW(int bus, int address, int file);
	virtual int readI2C() = 0;
	int closeI2C();

	virtual ~I2c();

};


inline int I2c::initI2C_RW(int bus, int address, int fileHnd)
{
	i2C_bus 	= bus;
	i2C_address = address;
	i2C_file 	= fileHnd;

	// open I2C device as a file
	char namebuf[MAX_BUF_NAME];
	snprintf(namebuf, sizeof(namebuf), "/dev/i2c-%d", i2C_bus);

	if ((i2C_file = open(namebuf, O_RDWR)) < 0)
	{
		fprintf(stderr, "Failed to open %s I2C Bus\n", namebuf);
		return(1);
	}

	// target device as slave
	if (ioctl(i2C_file, I2C_SLAVE, i2C_address) < 0){
		fprintf(stderr, "I2C_SLAVE address %#x failed...", i2C_address);
		return(2);
	}

	return 0;
}



inline int I2c::closeI2C()
{
	if(close(i2C_file)>0)
	{
		fprintf(stderr, "Failed to close  file %d\n", i2C_file);
		return 1;
	}
	return 0;
}


inline I2c::~I2c(){}
