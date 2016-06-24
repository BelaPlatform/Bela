/*
 * udpServer.h
 *
 *  Created on: 19 May 2015
 *      Author: giulio moro
 */

#ifndef UDPSERVER_H_
#define UDPSERVER_H_

#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <errno.h>
#include <netdb.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>

class UdpServer{
	private:
		int port;
		int enabled;
		int inSocket;
		struct sockaddr_in server;
		struct timeval stTimeOut;
		struct timeval stZeroTimeOut;
		fd_set stReadFDS;
		int size;
		void *wasteBuffer;
		int wasteBufferSize;
		int length;
		socklen_t fromLength;
		struct sockaddr_in from;
	public:
		UdpServer();
		UdpServer(int aPort);
		~UdpServer();
		bool init(int aPort);
		bool bindToPort(int aPort);
		int getBoundPort() const;
		/*
		 * Reads bytes from the socket.
		 *
		 * Drop-in replacement for JUCE DatagramSocket::read()
		 *
			If blockUntilSpecifiedAmountHasArrived is true, the method will block until maxBytesToRead
			bytes have been read, (or until an error occurs). If this flag is false, the method will
			return as much data as is currently available without blocking.
		 */
		int read(void* destBuffer, int maxBytesToRead, bool blockUntilSpecifiedAmountHasArrived);
		void close();
		int empty();
		int empty(int maxCount);
		/*
		 * Waits until the socket is ready for reading or writing.
		 *
			Drop-in replacement for JUCE DatagramSocket::waitUntilReady.
			If readyForReading is true, it will wait until the socket is ready for reading; if false, it will wait until it's ready for writing.
			If the timeout is < 0, it will wait forever, or else will give up after the specified time.
			If the socket is ready on return, this returns 1. If it times-out before the socket becomes ready, it returns 0. If an error occurs, it returns -1.
		 */
		int waitUntilReady(bool readyForReading, int timeoutMsecs);
};



#endif /* UDPSERVER_H_ */
