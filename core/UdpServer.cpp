/*
 * udpServer.cpp
 *
 *  Created on: 19 May 2015
 *      Author: giulio moro
 */
#include "UdpServer.h"

UdpServer::UdpServer(int aPort){
	init(aPort);
};
UdpServer::UdpServer(){
	init(0);
}
UdpServer::~UdpServer(){
	close();
};
bool UdpServer::init(int aPort){
	enabled=true;
	stZeroTimeOut.tv_sec = 0; //set timeout to 0
	stZeroTimeOut.tv_usec = 0;
	inSocket=socket(AF_INET, SOCK_DGRAM, 0);
	if (inSocket < 0){
		enabled=false;
	}
	length = sizeof(server);
	server.sin_family=AF_INET;
	server.sin_addr.s_addr=INADDR_ANY;
	enabled=bindToPort(aPort);
	wasteBufferSize=2048;
	wasteBuffer=malloc(wasteBufferSize);
  memset(&stTimeOut,0,sizeof(struct timeval));
	return enabled;
}

bool UdpServer::bindToPort(int aPort){
	port=aPort;
	if(port<1){
		enabled=false;
		return false;
	}
	server.sin_port=htons(port);
	if (bind(inSocket,(struct sockaddr *)&server,length)<0){
		enabled=false;
		return false;
	}
	enabled=true;
	return true;
}

void UdpServer::close(){
	int ret=::close(inSocket);
	if(ret != 0)
		printf("Error while closing socket, errno: %d\n", errno);//Stop receiving data for this socket. If further data arrives, reject it.
	inSocket=0;
}

int UdpServer::waitUntilReady(bool readyForReading, int timeoutMsecs){
//	If the socket is ready on return, this returns 1. If it times-out before the socket becomes ready, it returns 0. If an error occurs, it returns -1.
	if(enabled==false)
		return -1;
	if(timeoutMsecs<0)
		return select(inSocket+1, &stReadFDS, NULL, NULL, NULL); //calling this with a NULL timeout will block indefinitely
	FD_ZERO(&stReadFDS);
	FD_SET(inSocket, &stReadFDS);
	float timeOutSecs=timeoutMsecs*0.001;
	stTimeOut.tv_sec=(long int)timeOutSecs;
	timeOutSecs-=(int)timeOutSecs;
	long int timeOutUsecs=timeOutSecs*1000000;
	stTimeOut.tv_usec=timeOutUsecs;
	int descriptorReady= select(inSocket+1, &stReadFDS, NULL, NULL, &stTimeOut);
//	printf("stTimeOut.tv_sec=%ld, stTimeOut.tv_usec=%ld, descriptorReady: \n",stTimeOut.tv_sec,stTimeOut.tv_usec, descriptorReady);
//	return descriptorReady>0 ? (timeOutUsecs-stTimeOut.tv_usec) : descriptorReady;
	return descriptorReady>0 ? 1 : descriptorReady;
}

int UdpServer::read(//Returns the number of bytes read, or -1 if there was an error.
					void *destBuffer,
					int maxBytesToRead,
					bool blockUntilSpecifiedAmountHasArrived)
{
	if(enabled==false)
		return -1;
	FD_ZERO(&stReadFDS);
	FD_SET(inSocket, &stReadFDS);
	int descriptorReady= select(inSocket+1, &stReadFDS, NULL, NULL, &stZeroTimeOut); //TODO: this is not JUCE-compliant
	if(descriptorReady<0){ //an error occurred
		return -1;
	}
	int numberOfBytes=0;
//	do
	{
		if (FD_ISSET(inSocket, &stReadFDS))
		{
	//		numberOfBytes=recvfrom(inSocket,destBuffer,maxBytesToRead,0,(struct sockaddr *)&from,&fromLength);
			numberOfBytes+=recv(inSocket,destBuffer,maxBytesToRead-numberOfBytes,0);
			if(numberOfBytes<0)
				return -1;
		}
	}
//	while (blockUntilSpecifiedAmountHasArrived && numberOfBytes==maxBytesToRead);
	return numberOfBytes;
}
int UdpServer::empty(){
	return empty(0);
}
int UdpServer::empty(int maxCount){
	int count=0;
	int n;
	do {
		if(waitUntilReady(true, 0)==0)
			return 0;
		float waste;
		n=read(&waste, sizeof(float), false);
		count++;
	} while (n>0 && (maxCount<=0 || maxCount<count));
	printf("socket emptied with %d reads\n", count);
	return count;
}
