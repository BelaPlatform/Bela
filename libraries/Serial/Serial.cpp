#include "Serial.h"

#include <errno.h>
#include <fcntl.h>
#include <poll.h>
#include <stdio.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <termios.h>
#include <unistd.h>

Serial::Serial() {}
Serial::~Serial() {
	cleanup();
}

int Serial::setup (const char* device, unsigned int speed) {
	fd = open(device, O_RDWR | O_NOCTTY | O_SYNC);
	if (fd < 0) {
		fprintf(stderr, "Error opening %s: %s\n", device, strerror(errno));
		return -1;
	}

	unsigned int baudRate = speedToBaudRate(speed);
	if(B0 == baudRate) {
		fprintf(stderr, "Error setting BAUD rate for %s: %d speed not supported\n", device, speed);
		return -1;
	}
	setInterfaceAttribs(baudRate);
	setMinCount(0); /* set to pure timed read */
	return 0;
}

unsigned int Serial::speedToBaudRate(unsigned int speed) {
	// use the below to generate the body of the switch statement (need to add default:)
// grep "define[ ]\+B[0-9]\+" /usr/include/arm-linux-gnueabihf/bits/termios.h | sed "s/\s\+/ /g" | cut -d ' ' -f 2 | sed "s/\(B\)\([0-9]\+\)/\t\tcase \2: speed = \1\2;\n\t\tbreak;/"
	switch(speed) {
		default:
		case 0: speed = B0;
		break;
		case 50: speed = B50;
		break;
		case 75: speed = B75;
		break;
		case 110: speed = B110;
		break;
		case 134: speed = B134;
		break;
		case 150: speed = B150;
		break;
		case 200: speed = B200;
		break;
		case 300: speed = B300;
		break;
		case 600: speed = B600;
		break;
		case 1200: speed = B1200;
		break;
		case 1800: speed = B1800;
		break;
		case 2400: speed = B2400;
		break;
		case 4800: speed = B4800;
		break;
		case 9600: speed = B9600;
		break;
		case 19200: speed = B19200;
		break;
		case 38400: speed = B38400;
		break;
		case 57600: speed = B57600;
		break;
		case 115200: speed = B115200;
		break;
		case 230400: speed = B230400;
		break;
		case 460800: speed = B460800;
		break;
		case 500000: speed = B500000;
		break;
		case 576000: speed = B576000;
		break;
		case 921600: speed = B921600;
		break;
		case 1000000: speed = B1000000;
		break;
		case 1152000: speed = B1152000;
		break;
		case 1500000: speed = B1500000;
		break;
		case 2000000: speed = B2000000;
		break;
		case 2500000: speed = B2500000;
		break;
		case 3000000: speed = B3000000;
		break;
		case 3500000: speed = B3500000;
		break;
		case 4000000: speed = B4000000;
		break;
	}
	return speed;
}

int Serial::setInterfaceAttribs(unsigned int speed) {
	struct termios tty;

	if (tcgetattr(fd, &tty) < 0) {
		printf("Error from tcgetattr: %s\n", strerror(errno));
		return -1;
	}

	cfsetospeed(&tty, (speed_t)speed);
	cfsetispeed(&tty, (speed_t)speed);

	tty.c_cflag |= (CLOCAL | CREAD); /* ignore modem controls */
	tty.c_cflag &= ~CSIZE;
	tty.c_cflag |= CS8;      /* 8-bit characters */
	tty.c_cflag &= ~PARENB;  /* no parity bit */
	tty.c_cflag &= ~CSTOPB;  /* only need 1 stop bit */
	tty.c_cflag &= ~CRTSCTS; /* no hardware flowcontrol */

	/* setup for non-canonical mode */
	tty.c_iflag &=
	~(IGNBRK | BRKINT | PARMRK | ISTRIP | INLCR | IGNCR | ICRNL | IXON);
	tty.c_lflag &= ~(ECHO | ECHONL | ICANON | ISIG | IEXTEN);
	tty.c_oflag &= ~OPOST;

	/* fetch bytes as they become available */
	tty.c_cc[VMIN] = 1;
	tty.c_cc[VTIME] = 1;

	if (tcsetattr(fd, TCSANOW, &tty) != 0) {
		printf("Error from tcsetattr: %s\n", strerror(errno));
		return -1;
	}
	return 0;
}

void Serial::setMinCount(int mcount) {
	struct termios tty;

	if (tcgetattr(fd, &tty) < 0) {
		printf("Error tcgetattr: %s\n", strerror(errno));
		return;
	}

	tty.c_cc[VMIN] = mcount ? 1 : 0;
	tty.c_cc[VTIME] = 5; /* half second timer */

	if (tcsetattr(fd, TCSANOW, &tty) < 0) {
		printf("Error tcsetattr: %s\n", strerror(errno));
	}
}


int Serial::read(char* buf, size_t len, int timeoutMs) {
	struct pollfd pfd[1];
	pfd[0].fd = fd;
	pfd[0].events = POLLIN;
	int result = poll(pfd, 1, timeoutMs);
	if (result < 0) {
		fprintf(stderr, "Error polling for serial: %d %s\n", errno,
		strerror(errno));
		return -errno;
	} else if (0 == result) {
		// timeout
		return 0;
	} else if (pfd[0].revents & POLLIN) {
		int rdlen = ::read(fd, buf, len);
		if (rdlen < 0) {
			fprintf(stderr, "Error from read: %d: %s\n", rdlen, strerror(errno));
		}
		return rdlen;
	} else {
		fprintf(stderr, "unknown error while reading serial\n");
		return -1;
	}
}

int Serial::write(const char* buf, size_t len) {
	if(-1 == len)
		len = strlen(buf);
	int ret = ::write(fd, buf, len);
	if (ret < 0) {
		fprintf(stderr, "write failed: %d %s\n", errno, strerror(errno));
	}
	return ret;
}

void Serial::cleanup() { close(fd); }

