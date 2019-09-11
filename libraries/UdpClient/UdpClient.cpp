/*
 * udpClient.cpp
 *
 *  Created on: 19 May 2015
 *      Author: giulio moro
 */
#include "UdpClient.h"
#include <stdexcept>
#include <string>

	UdpClient::UdpClient(){}
	UdpClient::UdpClient(int aPort, const char* aServerName){
		setup(aPort, aServerName);
	}
	bool UdpClient::setup(int aPort, const char* aServerName){
		enabled=true;
		outSocket=socket(AF_INET, SOCK_DGRAM, 0);
		if(outSocket<0){
			enabled=false;
			return false;
		}
		setSocketBroadcast(1);
		setPort(aPort);
		setServer(aServerName);
		memset(&stTimeOut, 0, sizeof(struct timeval));
		return true;
	}
	void UdpClient::cleanup(){
		close(outSocket);
	}
	UdpClient::~UdpClient(){
		cleanup(); 
	}
static void dieUninitialized(std::string str){
	throw std::runtime_error((std::string("UdpClient: ")+str+std::string(" failed. setup() was not called, or was invalid\n")).c_str());
}
	void UdpClient::setPort(int aPort){
		if(!enabled)
		{
			dieUninitialized("setPort()");
		}
		port=aPort;
		destinationServer.sin_port = htons(port);
		destinationServer.sin_family = AF_INET;
		isSetPort=true;
	};
	void UdpClient::setServer(const char* aServerName){
		if(!enabled)
		{
			dieUninitialized("setServer()");
		}
		inet_pton(AF_INET,aServerName,&destinationServer.sin_addr);
		isSetServer=true;
	};
	int UdpClient::send(void * message, int size){
		if(!enabled)
			return -1;
		unsigned int length;
		length=sizeof(struct sockaddr_in);
		int n=sendto(outSocket,message,size,0,(const struct sockaddr *)&destinationServer,length);
		if (n < 0){
			return n;
		}
		return 1;
	};
	int UdpClient::write(const char* remoteHostname, int remotePortNumber, void* sourceBuffer, int numBytesToWrite){
		setServer(remoteHostname);
		setPort(remotePortNumber);
		return send(sourceBuffer, numBytesToWrite);
	}
  int UdpClient::waitUntilReady(bool readyForReading, int timeoutMsecs){
//	If the socket is ready on return, this returns 1. If it times-out before the socket becomes ready, it returns 0. If an error occurs, it returns -1.
    if(enabled==false)
		return -1;
    if(timeoutMsecs<0)
		return select(outSocket+1, NULL, &stWriteFDS, NULL, NULL); //calling this with a NULL timeout will block indefinitely
    FD_ZERO(&stWriteFDS);
    FD_SET(outSocket, &stWriteFDS);
	float timeOutSecs=timeoutMsecs*0.001;
	stTimeOut.tv_sec=(int)timeOutSecs;
	timeOutSecs-=(int)timeOutSecs;
	stTimeOut.tv_usec=(int)(timeOutSecs*1000000);
    int descriptorReady= select(outSocket+1, NULL, &stWriteFDS, NULL, &stTimeOut);
    return descriptorReady>0? 1 : descriptorReady;
  }
	int	UdpClient::setSocketBroadcast(int broadcastEnable){
		int ret = setsockopt(outSocket, SOL_SOCKET, SO_BROADCAST, &broadcastEnable, sizeof(broadcastEnable));
		if(ret < 0){
			printf("Impossible to set the socket to Broadcast\n");
		}
		return ret;
	}
