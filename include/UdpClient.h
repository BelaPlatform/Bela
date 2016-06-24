/*
 * udpClient.h
 *
 *  Created on: 19 May 2015
 *      Author: giulio moro
 */

#ifndef UDPCLIENT_H_
#define UDPCLIENT_H_

#include <sys/types.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <netdb.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>

class UdpClient{
	private:
		int port;
		int enabled;
		int outSocket;
    struct timeval stTimeOut;
    	fd_set stWriteFDS;
		bool isSetPort;
		bool isSetServer;
		struct sockaddr_in destinationServer;
	public:
		UdpClient();
		UdpClient(int aPort, const char* aServerName);
		~UdpClient();
		void setPort(int aPort);
		void setServer(const char* aServerName);
		int send(void* message, int size);
		int write(const char* remoteHostname, int remotePortNumber, void* sourceBuffer, int numBytesToWrite);
		int waitUntilReady(bool readyForReading, int timeoutMsecs);
		int setSocketBroadcast(int broadcastEnable);
};



#endif /* UDPCLIENT_H_ */
