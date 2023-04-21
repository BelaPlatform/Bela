#include "UdpServer.h"
#include <stdexcept>
#include <arpa/inet.h>
#include <errno.h>
#include <stdio.h>
#include <unistd.h>

void UdpServer::cleanup(){
	close();
}
UdpServer::UdpServer(unsigned int port){
	if(!setup(port))
		throw std::runtime_error("UdpServer: could not bind to port " + std::to_string(port));
};
UdpServer::UdpServer(){}
UdpServer::~UdpServer(){
	cleanup();
};
bool UdpServer::setup(unsigned int port){
	close();
	inSocket = socket(AF_INET, SOCK_DGRAM, 0);
	if(inSocket < 0)
		return enabled = false;
	server.sin_family = AF_INET;
	server.sin_addr.s_addr = INADDR_ANY;
	if(port < 1 || port >= 65536)
		return enabled = false;
	server.sin_port = htons(port);
	if(bind(inSocket, (struct sockaddr *)&server, sizeof(server)) < 0)
		return enabled = false;
	return enabled = true;
}

int UdpServer::getBoundPort() const {
	return enabled ? server.sin_port : -1;
}

void UdpServer::close(){
	if(inSocket >= 0)
	{
		int ret =::close(inSocket);
		if(ret != 0)
			fprintf(stderr, "Error while closing socket, errno: %d\n", errno);
	}
	inSocket = -1;
	enabled = false;
}

int UdpServer::waitUntilReady(bool readyForReading, int timeoutMsecs){
	return waitUntilReady(timeoutMsecs);
}
#define FD_INIT(fd, fds) \
	FD_ZERO(&fds); \
	FD_SET(fd, &fds);

int UdpServer::waitUntilReady(int timeoutMsecs){
	if(!enabled)
		return -1;
	fd_set stReadFDS;
	FD_INIT(inSocket, stReadFDS);
	if(timeoutMsecs < 0)
		return select(inSocket + 1, &stReadFDS, NULL, NULL, NULL); //calling this with a NULL timeout will block indefinitely
	float timeOutSecs = timeoutMsecs * 0.001;
	struct timeval stTimeOut;
	stTimeOut.tv_sec = (long int)timeOutSecs;
	timeOutSecs -= (int)timeOutSecs;
	long int timeOutUsecs = timeOutSecs * 1000000;
	stTimeOut.tv_usec = timeOutUsecs;
	int descriptorReady = select(inSocket + 1, &stReadFDS, NULL, NULL, &stTimeOut);
//	printf("stTimeOut.tv_sec = %ld, stTimeOut.tv_usec = %ld, descriptorReady: \n", stTimeOut.tv_sec, stTimeOut.tv_usec, descriptorReady);
//	return descriptorReady > 0 ? (timeOutUsecs-stTimeOut.tv_usec) : descriptorReady;
	return descriptorReady > 0 ? 1 : descriptorReady;
}

int UdpServer::read(//Returns the number of bytes read, or -1 if there was an error.
					void *destBuffer,
					int maxBytesToRead,
					bool blockUntilSpecifiedAmountHasArrived)
{
	if(!enabled)
		return -1;
	fd_set stReadFDS;
	FD_INIT(inSocket, stReadFDS);
	struct timeval stZeroTimeOut = {
		.tv_sec = 0,
		.tv_usec = 0,
	};
	int descriptorReady = select(inSocket + 1, &stReadFDS, NULL, NULL, &stZeroTimeOut);
	if(descriptorReady < 0){ //an error occurred
		return -1;
	}
	int numberOfBytes = 0;
	do
	{
		if (FD_ISSET(inSocket, &stReadFDS))
		{
			socklen_t fromLength = sizeof(from);
			numberOfBytes += recvfrom(inSocket, ((char*)destBuffer) + numberOfBytes, maxBytesToRead - numberOfBytes, 0, (struct sockaddr*)&from, &fromLength);
			if(numberOfBytes < 0)
				return -1;
		}
	}
	while (blockUntilSpecifiedAmountHasArrived && numberOfBytes < maxBytesToRead);
	return numberOfBytes;
}
int UdpServer::getLastRecvPort()
{
	return from.sin_port;
}

const char* UdpServer::getLastRecvAddr()
{
	return inet_ntoa(from.sin_addr);
}

int UdpServer::empty(){
	return empty(0);
}
int UdpServer::empty(int maxCount){
	int count = 0;
	int n;
	do {
		if(waitUntilReady(true, 0) == 0)
			return 0;
		float waste;
		n = read(&waste, sizeof(float), false);
		count++;
	} while (n > 0 && (maxCount <= 0 || maxCount < count));
	printf("socket emptied with %d reads\n", count);
	return count;
}
