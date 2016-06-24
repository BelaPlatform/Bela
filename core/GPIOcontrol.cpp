/*
 * SimpleGPIO.cpp
 *
 * Modifications by Derek Molloy, School of Electronic Engineering, DCU
 * www.derekmolloy.ie
 * Almost entirely based on Software by RidgeRun:
 *
 * Copyright (c) 2011, RidgeRun
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 * 3. All advertising materials mentioning features or use of this software
 *    must display the following acknowledgement:
 *    This product includes software developed by the RidgeRun.
 * 4. Neither the name of the RidgeRun nor the
 *    names of its contributors may be used to endorse or promote products
 *    derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY RIDGERUN ''AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL RIDGERUN BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

#include "../include/GPIOcontrol.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#include <unistd.h>
#include <fcntl.h>
#include <poll.h>


/****************************************************************
 * gpio_setup
 ****************************************************************/
int gpio_setup(unsigned int gpio, int out_flag)
{
	/* Export the GPIO pins and set their direction */
	if(gpio_export(gpio)) {
		printf("Unable to export GPIO input pin\n");
		return -1;
	}
	if(gpio_set_dir(gpio, out_flag)) {
		printf("Unable to set GPIO input direction\n");
		return -1;
	}

	return gpio_fd_open(gpio, O_RDWR);
}

/****************************************************************
 * gpio_export
 ****************************************************************/
int gpio_export(unsigned int gpio)
{
	int fd, len, result = 0;
	char buf[MAX_BUF];

	fd = open(SYSFS_GPIO_DIR "/export", O_WRONLY);
	if (fd < 0) {
		perror("gpio/export");
		return fd;
	}

	len = snprintf(buf, sizeof(buf), "%d", gpio);
	if(write(fd, buf, len) < 0)
		result = -1;
	close(fd);

	return result;
}

/****************************************************************
 * gpio_unexport
 ****************************************************************/
int gpio_unexport(unsigned int gpio)
{
	int fd, len, result = 0;
	char buf[MAX_BUF];

	fd = open(SYSFS_GPIO_DIR "/unexport", O_WRONLY);
	if (fd < 0) {
		perror("gpio/export");
		return fd;
	}

	len = snprintf(buf, sizeof(buf), "%d", gpio);
	if(write(fd, buf, len) < 0)
		result = -1;
	close(fd);
	return result;
}

/****************************************************************
 * gpio_set_dir
 ****************************************************************/
int gpio_set_dir(unsigned int gpio, int out_flag)
{
	int fd, result = 0;
	char buf[MAX_BUF];

	snprintf(buf, sizeof(buf), SYSFS_GPIO_DIR  "/gpio%d/direction", gpio);

	fd = open(buf, O_WRONLY);
	if (fd < 0) {
		perror("gpio/direction");
		return fd;
	}

	if (out_flag == OUTPUT_PIN) {
		if(write(fd, "out", 4) < 0)
			result = -1;
	}
	else {
		if(write(fd, "in", 3) < 0)
			result = -1;
	}

	close(fd);
	return result;
}

/****************************************************************
 * gpio_set_value
 ****************************************************************/
int gpio_set_value(unsigned int gpio, int value)
{
	int fd, result = 0;
	char buf[MAX_BUF];

	snprintf(buf, sizeof(buf), SYSFS_GPIO_DIR "/gpio%d/value", gpio);

	fd = open(buf, O_WRONLY);
	if (fd < 0) {
		perror("gpio/set-value");
		return fd;
	}

	if (value==LOW) {
		if(write(fd, "0", 2) < 0)
			result = -1;
	}
	else {
		if(write(fd, "1", 2) < 0)
			result = -1;
	}

	close(fd);
	return result;
}

/****************************************************************
 * gpio_get_value
 ****************************************************************/
int gpio_get_value(unsigned int gpio, unsigned int *value)
{
	int fd, result = 0;
	char buf[MAX_BUF];
	char ch;

	snprintf(buf, sizeof(buf), SYSFS_GPIO_DIR "/gpio%d/value", gpio);

	fd = open(buf, O_RDONLY);
	if (fd < 0) {
		perror("gpio/get-value");
		return fd;
	}

	if(read(fd, &ch, 1) <= 0) {
		result = -1;
	}
	else {
		if (ch != '0') {
		*value = 1;
		} else {
		*value = 0;
		}
	}

	close(fd);
	return result;
}


/****************************************************************
 * gpio_set_edge
 ****************************************************************/

int gpio_set_edge(unsigned int gpio, char *edge)
{
	int fd, result = 0;
	char buf[MAX_BUF];

	snprintf(buf, sizeof(buf), SYSFS_GPIO_DIR "/gpio%d/edge", gpio);

	fd = open(buf, O_WRONLY);
	if (fd < 0) {
		perror("gpio/set-edge");
		return fd;
	}

	if(write(fd, edge, strlen(edge) + 1) < 0)
		result = -1;
	close(fd);
	return result;
}

/****************************************************************
 * gpio_fd_open
 ****************************************************************/

int gpio_fd_open(unsigned int gpio, int writeFlag)
{
	int fd;
	char buf[MAX_BUF];

	snprintf(buf, sizeof(buf), SYSFS_GPIO_DIR "/gpio%d/value", gpio);

	fd = open(buf, writeFlag | O_NONBLOCK );
	if (fd < 0) {
		perror("gpio/fd_open");
	}
	return fd;
}

/****************************************************************
 * gpio_fd_close
 ****************************************************************/

int gpio_fd_close(int fd)
{
	return close(fd);
}

/****************************************************************
 * gpio_read
 ****************************************************************/
int gpio_read(int fd, unsigned int *value)
{
	int result = 0;
	char ch;

	if(read(fd, &ch, 1) <= 0) {
		result = -1;
	}
	else {
		if (ch != '0') {
		*value = 1;
		} else {
		*value = 0;
		}
	}

	return result;
}

/****************************************************************
 * gpio_write
 ****************************************************************/
int gpio_write(int fd, int value)
{
	int result = 0;
	//char buf[MAX_BUF];

	if (value==LOW) {
		if(write(fd, "0", 2) < 0)
			result = -1;
	}
	else {
		if(write(fd, "1", 2) < 0)
			result = -1;
	}

	return result;
}


/****************************************************************
 * gpio_dismiss
 ****************************************************************/
int gpio_dismiss(int fd, unsigned int gpio)
{
	close(fd);
	gpio_unexport(gpio);
	return 0;
}

/****************************************************************
 * led_set_trigger
 ****************************************************************/
int led_set_trigger(unsigned int lednum, const char *trigger)
{
	// Set the trigger source for an onboard user LED
	int fd, result = 0;
	char buf[MAX_BUF];

	snprintf(buf, sizeof(buf), SYSFS_LED_DIR "/beaglebone:green:usr%d/trigger", lednum);

	fd = open(buf, O_WRONLY);
	if (fd < 0) {
		perror("gpio/led-set-trigger");
		return fd;
	}

	if(write(fd, trigger, strlen(trigger) + 1) < 0)
		result = -1;

	close(fd);
	return result;
}

