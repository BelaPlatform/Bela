/*
 * bela-cape-btn daemon for the bela capebutton.
 * 
 * Adapted from:
 * Copyright (C) 2016  Vilniaus Blokas UAB, http://blokas.io/bela
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

#define HOMEPAGE_URL "http://bela.io/wiki"

enum { BELA_CAPE_BTN_VERSION   = 0x0100 };
enum { INVALID_VERSION       = 0xffff };
enum { BUTTON_PIN            = 115     }; // The Bela cape button, which is on P9.27 / GPIO3[19]
enum { HOLD_PRESS_TIMEOUT_MS = 2000 };

static const char *const CLICKED_ACTION       = "/root/click.sh";
static const char *const HOLD_ACTION          = "/root/hold.sh";
static const char *const BELA_VERSION_FILE = "/sys/kernel/bela/version";

int gpio_is_pin_valid(int pin)
{
	return pin >= 0 && pin < 100;
}

enum edge_e
{
	E_NONE    = 0,
	E_RISING  = 1,
	E_FALLING = 2,
	E_BOTH    = 3,
};

int gpio_set_edge(int pin, enum edge_e edge)
{
	if (!gpio_is_pin_valid(pin))
	{
		fprintf(stderr, "Invalid pin number %d!\n", pin);
		return -1;
	}

	char gpio[64];

	snprintf(gpio, sizeof(gpio), "/sys/class/gpio/gpio%d/edge", pin);

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

	char gpio[64];

	snprintf(gpio, sizeof(gpio), "/sys/class/gpio/gpio%d/value", pin);

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

unsigned short get_kernel_module_version(void)
{
	FILE *f = fopen(BELA_VERSION_FILE, "rt");

	if (!f)
		return INVALID_VERSION;

	unsigned int major;
	unsigned int minor;
	int n = fscanf(f, "%u.%u", &major, &minor);
	fclose(f);

	if (n == 2)
		return (major & 0xff) << 8 + (minor & 0xff);

	return INVALID_VERSION;
}

int run(void)
{
	unsigned short version = get_kernel_module_version();

	if (version == INVALID_VERSION)
	{
		fprintf(stderr, "Reading bela version failed, did the kernel module load successfully?\n");
		return -EINVAL;
	}
	else if (version < 0x0100 || version >= 0x0200)
	{
		fprintf(stderr, "The kernel module version (%04x) and bela-cape-btn version (%04x) are incompatible! Please check for updates at " HOMEPAGE_URL "\n", version, BELA_CAPE_BTN_VERSION);
		return -EINVAL;
	}

	int err = gpio_set_edge(BUTTON_PIN, E_BOTH);

	if (err != 0)
		return err;

	int fd = gpio_open(BUTTON_PIN);

	struct pollfd pfd[1];

	pfd[0].fd = fd;
	pfd[0].events = POLLPRI;

	timestamp_ms_t pressed_at = 0;

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
		"\t--help     Display the usage information.\n"
		"\t--version  Show the version information.\n"
		"\n"
		);
	print_version();
}

int main(int argc, char **argv)
{
	int i;
	for (i=1; i<argc; ++i)
	{
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
