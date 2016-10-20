/*
 * bela-cape-btn daemon for the bela capebutton.
 * 
 * Adapted from:
 * a) Copyright (C) 2016  Vilniaus Blokas UAB, http://blokas.io/bela
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; version 2 of the
 * License.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 *
 * and
 *
 * SimpleGPIO.cpp
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

#include <stdio.h>
#include <stdlib.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
#include <poll.h>
#include <time.h>

#define SYSFS_GPIO_DIR "/sys/class/gpio"
#define HOMEPAGE_URL "http://bela.io/wiki"
#define MAX_BUF 64

enum { BELA_CAPE_BTN_VERSION = 0x0100 };
enum { INVALID_VERSION = 0xffff };
enum { DEFAULT_BUTTON_PIN = 115 }; // The Bela cape button, which is on P9.27 / GPIO3[19]
enum { HOLD_PRESS_TIMEOUT_MS = 2000 };

static char DEFAULT_CLICKED_ACTION[] = "/root/cape_button_click.sh";
static char DEFAULT_HOLD_ACTION[] = "/root/cape_button_hold.sh";

static char* CLICKED_ACTION;
static char* HOLD_ACTION;
static int BUTTON_PIN;

int gpio_is_pin_valid(int pin)
{
	return pin >= 0 && pin < 128;
}

enum edge_e
{
	E_NONE    = 0,
	E_RISING  = 1,
	E_FALLING = 2,
	E_BOTH    = 3,
};

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

int gpio_set_edge(int pin, enum edge_e edge)
{
	if (!gpio_is_pin_valid(pin))
	{
		fprintf(stderr, "Invalid pin number %d!\n", pin);
		return -1;
	}

	char gpio[MAX_BUF];

	snprintf(gpio, sizeof(gpio), SYSFS_GPIO_DIR "/gpio%d/edge", pin);

	int fd = open(gpio, O_WRONLY);
	if (fd == -1)
	{
		fprintf(stderr, "Failed to open %s! Error %d\n", gpio, errno);
		return -1;
	}

	static const char *const edge2str[] =
	{
		"none",
		"rising",
		"falling",
		"both",
	};

	const int n = strlen(edge2str[edge])+1;

	int result = write(fd, edge2str[edge], n);
	if (result != n)
	{
		fprintf(stderr, "Failed writing to %s! Error %d\n", gpio, errno);
		close(fd);
		return -1;
	}
	int err = close(fd);
	if (err != 0)
	{
		fprintf(stderr, "Failed closing %s! Error %d\n", gpio, errno);
		return -1;
	}
	return 0;
}

int gpio_open(int pin)
{
	if (!gpio_is_pin_valid(pin))
	{
		fprintf(stderr, "Invalid pin number %d!\n", pin);
		return -1;
	}

	char gpio[MAX_BUF];

	snprintf(gpio, sizeof(gpio), SYSFS_GPIO_DIR "/gpio%d/value", pin);

	int fd = open(gpio, O_RDONLY);

	if (fd == -1)
	{
		fprintf(stderr, "Failed opening %s! Error %d\n", gpio, errno);
	}

	return fd;
}

int gpio_close(int fd)
{
	int err = close(fd);
	if (err != 0)
	{
		fprintf(stderr, "Failed closing descriptor %d! Error %d\n", fd, err);
		return -1;
	}
	return 0;
}

typedef unsigned long long timestamp_ms_t;

timestamp_ms_t get_timestamp_ms(void)
{
	struct timespec tp;
	clock_gettime(CLOCK_MONOTONIC, &tp);
	return tp.tv_sec * 1000 + tp.tv_nsec / 1000000;
}

int run(void)
{
	gpio_export(BUTTON_PIN);
	
	int err = gpio_set_edge(BUTTON_PIN, E_BOTH);

	if (err != 0)
		return err;

	int fd = gpio_open(BUTTON_PIN);

	struct pollfd pfd[1];

	pfd[0].fd = fd;
	pfd[0].events = POLLPRI;

	timestamp_ms_t pressed_at = 0;

	printf("Monitoring pin `%d`, will execute `%s` on click and `%s` on hold...\n", BUTTON_PIN, CLICKED_ACTION, HOLD_ACTION);
	for (;;)
	{
		int result = poll(pfd, 1, -1);

		if (result == -1)
			break;

		if (result == 0)
			continue;

		if (pfd[0].revents & POLLPRI)
		{
			timestamp_ms_t timestamp = get_timestamp_ms();

			char buff[16];
			memset(buff, 0, sizeof(buff));
			int n = read(fd, buff, sizeof(buff));
			if (n == 0)
			{
				fprintf(stderr, "Reading value returned 0\n");
				break;
			}

			if (lseek(fd, SEEK_SET, 0) == -1)
			{
				fprintf(stderr, "Rewinding failed. Error %d\n", errno);
				break;
			}

			unsigned long pressed = strtoul(buff, NULL, 10);

			if (pressed)
			{
				pressed_at = timestamp;
			}
			else if (pressed_at != 0)
			{
				if (timestamp - pressed_at < HOLD_PRESS_TIMEOUT_MS)
				{
					system(CLICKED_ACTION);
				}
				else
				{
					system(HOLD_ACTION);
				}
				pressed_at = 0;
			}
		}
	}

	gpio_close(fd);

	gpio_set_edge(BUTTON_PIN, E_NONE);
	return 0;
}

void print_version(void)
{
	printf("Version %x.%02x, Augmented Instruments  Lab " HOMEPAGE_URL "\n", BELA_CAPE_BTN_VERSION >> 8, BELA_CAPE_BTN_VERSION & 0xff);
}

void print_usage(void)
{
	printf("Usage: bela-cape-btn [options]\n"
		"Options:\n"
		"\t--click <arg>  The file to execute when a click is detected.\n"
		"\t--hold <arg>   The file to execute when a hold is detected.\n"
		"\t--pin <arg>    The GPIO number to monitor.\n"
		"\t--help         Display the usage information.\n"
		"\t--version      Show the version information.\n"
		"\n"
		);
	print_version();
}

int main(int argc, char **argv)
{

	BUTTON_PIN = DEFAULT_BUTTON_PIN;
	CLICKED_ACTION = DEFAULT_CLICKED_ACTION;
	HOLD_ACTION = DEFAULT_HOLD_ACTION;
	int i;
	for (i=1; i<argc; ++i)
	{
		if (strcmp(argv[i], "--pin") == 0)
		{
			if(i + 1 < argc){
				++i;
				BUTTON_PIN = atoi(argv[i]);
				continue;
			} else {
				fprintf(stderr, "Argument missing\n");
				print_usage();
				return 1;
			}
		}
		if (strcmp(argv[i], "--click") == 0)
		{
			if(i + 1 < argc){
				++i;
				CLICKED_ACTION = argv[i];
				continue;
			} else {
				fprintf(stderr, "Argument missing\n");
				print_usage();
				return 1;
			}
		}
		if (strcmp(argv[i], "--hold") == 0)
		{
			if(i + 1 < argc){
				++i;
				HOLD_ACTION = argv[i];
				continue;
			} else {
				fprintf(stderr, "Argument missing\n");
				print_usage();
				return 1;
			}
		}
		if (strcmp(argv[i], "--help") == 0)
		{
			print_usage();
			return 0;
		}
		else if (strcmp(argv[i], "--version") == 0)
		{
			print_version();
			return 0;
		}
		else
		{
			printf("Uknown option '%s'\n", argv[i]);
			print_usage();
			return 0;
		}
	}

	return run();
}
