/*
 * I2c.h
 *
 *  Created on: Oct 14, 2013
 *      Author: Victor Zappi
 */

#ifndef I2C_H_
#define I2C_H_

#include <iostream>
#include <iomanip>
#include <string>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <fcntl.h>
#include <linux/i2c.h>
#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <stropts.h>

#define MAX_BUF_NAME 64

using namespace std;


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
			cout << "Failed to open " << namebuf << " I2C Bus" << endl;
			return(1);
	}

	// target device as slave
	if (ioctl(i2C_file, I2C_SLAVE, i2C_address) < 0){
			cout << "I2C_SLAVE address " << i2C_address << " failed..." << endl;
			return(2);
	}

	return 0;
}



inline int I2c::closeI2C()
{
	if(close(i2C_file)>0)
	{
		cout << "Failed to close  file "<< i2C_file << endl;
		return 1;
	}
	return 0;
}


inline I2c::~I2c(){}


#endif /* I2C_H_ */
