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
#include <signal.h>
#include <unistd.h>
#include <errno.h>
#include <string.h>
#include <poll.h>
#include <time.h>

#define SYSFS_GPIO_DIR "/sys/class/gpio"
#define HOMEPAGE_URL "http://bela.io/wiki"
#define MAX_BUF 64

#define POLL
//#define EDGE // This is more efficient as it gets IRQ from the kernel. When using it, check in `dmesg` that there are no OOOOPS

enum { BELA_CAPE_BTN_VERSION = 0x0101 };
enum { INVALID_VERSION = 0xffff };
enum { DEFAULT_BUTTON_PIN = 115 }; // The Bela cape button, which is on P9.27 / GPIO3[19]
enum { DEFAULT_PRESSED_VALUE = 0 };
enum { DEFAULT_INITIAL_DELAY = 0 };
enum { DEFAULT_MONITOR_CLICK = 0 };
enum { DEFAULT_MONITOR_HOLD = 1 };
enum { DEFAULT_HOLD_PRESS_TIMEOUT_MS = 2000 };

static char DEFAULT_CLICK_ACTION[] = "/root/cape_button_click.sh";
static char DEFAULT_HOLD_ACTION[] = "/root/cape_button_hold.sh";

static char* CLICK_ACTION;
static char* HOLD_ACTION;
static int BUTTON_PIN;
static int PRESSED_VALUE;
static int INITIAL_DELAY;
static int MONITOR_CLICK;
static int MONITOR_HOLD;
static int HOLD_PRESS_TIMEOUT_MS;

int gpio_is_pin_valid(int pin)
{
	return pin >= 0 && pin < 128;
}

#ifdef EDGE
enum edge_e
{
	E_NONE    = 0,
	E_RISING  = 1,
	E_FALLING = 2,
	E_BOTH    = 3,
};
#endif

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

#ifdef EDGE
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
#endif /* EDGE */

enum PIN_DIRECTION{
	INPUT_PIN=0,
	OUTPUT_PIN=1
};
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

volatile int gShouldStop;
int verbose;
// Handle Ctrl-C by requesting that the polling loop stops
void interrupt_handler(int var)
{
	gShouldStop = 1;
}

int is_pressed(int fd)
{
	char buff[16];
	memset(buff, 0, sizeof(buff));
	int n = read(fd, buff, sizeof(buff));
	if (n == 0)
	{
		fprintf(stderr, "Reading value returned 0\n");
		return -1;
	}

	if (lseek(fd, SEEK_SET, 0) == -1)
	{
		fprintf(stderr, "Rewinding failed. Error %d\n", errno);
		return -1;
	}
	return strtoul(buff, NULL, 10) == PRESSED_VALUE;
}

int run(void)
{
	if(INITIAL_DELAY > 0){
		printf("Sleeping %d seconds before polling\n", INITIAL_DELAY);
		usleep(INITIAL_DELAY * 1000000);
	}
	int ret = gpio_export(BUTTON_PIN);
	int shouldUnexport = (ret == 0);
	
#ifdef EDGE
	int err = gpio_set_edge(BUTTON_PIN, E_BOTH);
	if (err != 0)
		return err;
#endif

	gpio_set_dir(BUTTON_PIN, INPUT_PIN);
	int fd = gpio_open(BUTTON_PIN);

#ifdef EDGE
	struct pollfd pfd[1];

	pfd[0].fd = fd;
	pfd[0].events = POLLPRI;
#endif

	timestamp_ms_t pressed_at = 0;

	printf("Monitoring pin `%d`, will execute `%s` on click and `%s` on hold (>%dms). Button is pressed when pin is %s...\n", BUTTON_PIN, 
		MONITOR_CLICK ? CLICK_ACTION : "(nothing)", 
		MONITOR_HOLD ? HOLD_ACTION : "(nothing)",
		HOLD_PRESS_TIMEOUT_MS,
		PRESSED_VALUE == 0 ? "LOW" : "HIGH");
	signal(SIGINT, interrupt_handler);
	signal(SIGTERM, interrupt_handler);
	gShouldStop = 0;
	while(!gShouldStop)
	{
		int pollTime;
		// set a timeout for the poll:
		if(pressed_at)
		{
			// if it's already pressed, wait as long as
			// needed to detect a HOLD
			pollTime = HOLD_PRESS_TIMEOUT_MS + 1;
		}
		else
		{
			// otherwise wait forever
			pollTime = -1;
		}
#ifdef EDGE
		if(verbose)
			printf("Detecting edge with timeout %d\n", pollTime);
		int result = poll(pfd, 1, pollTime);
		if(verbose)
			printf("Finished detecting edge: %d\n", result);

		if (result == -1)
			break;

		if (result == 0 && !pressed_at)
			continue;

		if (pfd[0].revents & POLLPRI || pollTime >= 0) // well ... this should be the case by definition
#endif
#ifdef POLL
		{
			int polling_start_value = is_pressed(fd);

			if(polling_start_value < 0)
			{
				printf("read failed\n");
			} else { 
				if(verbose)
					printf("polling_start_value: %d\n", polling_start_value);
			}

			timestamp_ms_t polling_start_timestamp = get_timestamp_ms();
			while(!gShouldStop)
			{
				usleep(40000);
				int new_value = is_pressed(fd);
				if(new_value < 0)
				{
					fprintf(stderr, "read returned %d\n", new_value);
					usleep(1000000);
					continue;
				}
				if(polling_start_value != new_value) // the poor man's "edge detector"
				{
					break;
				}
				if(pollTime > 0) // if we actually have a timeout, it's the poor man's "edge detector with timeout"
				{
					timestamp_ms_t timestamp = get_timestamp_ms();
					timestamp_ms_t elapsed = timestamp - polling_start_timestamp;
					if(elapsed > pollTime)
					{
						break;
					}
				}
			}
		}
		// The following block is unconditional when POLLing
#endif /* POLL */
		{
			timestamp_ms_t timestamp = get_timestamp_ms();

			int pressed = is_pressed(fd);
			if(pressed < 0)
				break;

			if(verbose)
				printf("Pressed: %d\n", pressed);

			if (pressed && !pressed_at)
			{
				pressed_at = timestamp;
			}
			else if (pressed_at != 0)
			{
				if (timestamp - pressed_at < HOLD_PRESS_TIMEOUT_MS)
				{
					if(MONITOR_CLICK)
						system(CLICK_ACTION);
					else
						printf("Click detected -- no action\n");
				}
				else
				{
					if(MONITOR_HOLD)
						system(HOLD_ACTION);
					else
						printf("Hold detected -- no action\n");
				}
				pressed_at = 0;
			}
		}
	}

	if(verbose)
		printf("Cleaning up...\n");
	gpio_close(fd);

#ifdef EDGE
	gpio_set_edge(BUTTON_PIN, E_NONE);
#endif
	if(shouldUnexport)
		gpio_unexport(BUTTON_PIN);
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
		"\t--click <arg>   The file to execute when a click is detected. Default: %s\n"
		"\t--hold <arg>    The file to execute when a hold is detected. Default: %s\n"
		"\t--pressed <arg> The input value corresponding to pressed status (0 or 1). Default: %d.\n"
		"\t--delay <ard>   Postpone the beginning of the polling by <arg> seconds. Default: %d.\n"
		"\t--pin <arg>     The GPIO number to monitor. Default: %d.\n"
		"\t--monitor-click <arg> Whether to monitor the click (0 or 1). Default: %d.\n"
		"\t--monitor-hold  <arg> Whether to monitor the hold (0 or 1). Default: %d.\n"
		"\t--hold-press-timeout-ms <arg> How long to wait before detecting a hold (ms). Default: %d.\n"
		"\t--help          Display the usage information.\n"
		"\t--version       Show the version information.\n"
		"\n",
		DEFAULT_CLICK_ACTION,
		DEFAULT_HOLD_ACTION,
		DEFAULT_PRESSED_VALUE,
		DEFAULT_INITIAL_DELAY,
		DEFAULT_BUTTON_PIN,
		DEFAULT_MONITOR_CLICK,
		DEFAULT_MONITOR_HOLD,
		DEFAULT_HOLD_PRESS_TIMEOUT_MS
	);
	print_version();
}

int main(int argc, char **argv)
{
	BUTTON_PIN = DEFAULT_BUTTON_PIN;
	CLICK_ACTION = DEFAULT_CLICK_ACTION;
	HOLD_ACTION = DEFAULT_HOLD_ACTION;
	PRESSED_VALUE = DEFAULT_PRESSED_VALUE;
	INITIAL_DELAY = DEFAULT_INITIAL_DELAY;
	MONITOR_CLICK = DEFAULT_MONITOR_CLICK;
	MONITOR_HOLD = DEFAULT_MONITOR_HOLD;
	HOLD_PRESS_TIMEOUT_MS = DEFAULT_HOLD_PRESS_TIMEOUT_MS;
	verbose = 0;
	int i;
	for (i=1; i<argc; ++i)
	{
		if (strcmp(argv[i], "--delay") == 0)
		{
			if(i + 1 < argc){
				++i;
				INITIAL_DELAY = atoi(argv[i]);
				continue;
			} else {
				fprintf(stderr, "Argument missing\n");
				print_usage();
				return 1;
			}
		}
		if (strcmp(argv[i], "--pressed") == 0)
		{
			if(i + 1 < argc){
				++i;
				PRESSED_VALUE= atoi(argv[i]);
				continue;
			} else {
				fprintf(stderr, "Argument missing\n");
				print_usage();
				return 1;
			}
		}
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
				CLICK_ACTION = argv[i];
				MONITOR_CLICK = 1;
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
				MONITOR_HOLD = 1;
				continue;
			} else {
				fprintf(stderr, "Argument missing\n");
				print_usage();
				return 1;
			}
		}
		if (strcmp(argv[i], "--monitor-click") == 0)
		{
			if(i + 1 < argc){
				++i;
				MONITOR_CLICK = atoi(argv[i]);
				continue;
			} else {
				fprintf(stderr, "Argument missing\n");
				print_usage();
				return 1;
			}
		}
		if (strcmp(argv[i], "--monitor-hold") == 0)
		{
			if(i + 1 < argc){
				++i;
				MONITOR_HOLD = atoi(argv[i]);
				continue;
			} else {
				fprintf(stderr, "Argument missing\n");
				print_usage();
				return 1;
			}
		}
		if (strcmp(argv[i], "--hold-press-timeout-ms") == 0)
		{
			if(i + 1 < argc){
				++i;
				HOLD_PRESS_TIMEOUT_MS = atoi(argv[i]);
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
		else if (strcmp(argv[i], "--verbose") == 0)
		{
			verbose = 1;
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
