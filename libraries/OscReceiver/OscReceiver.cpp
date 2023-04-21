#include "OscReceiver.h"
#include <libraries/UdpServer/UdpServer.h>
#include <thread>

constexpr unsigned int OscReceiverBlockReadUs = 50000;
constexpr unsigned int OscReceiverSleepBetweenReadsUs = 5000;
constexpr unsigned int OscReceiverInBufferSize = 65536; // maximum UDP packet size

OscReceiver::OscReceiver(){}
OscReceiver::OscReceiver(int port, std::function<void(oscpkt::Message* msg, const char* addr, void* arg)> on_receive, void* callbackArg){
	setup(port, on_receive, callbackArg);
}

OscReceiver::~OscReceiver(){
	lShouldStop = true;
	// allow in-progress read to complete before destructing
	if(receive_task && receive_task->joinable())
	{
		receive_task->join();
	}
}

void OscReceiver::receive_task_func(){
	OscReceiver* instance = this;
	while(!instance->lShouldStop){
		int ret = instance->waitForMessage(OscReceiverBlockReadUs / 1000);
		if(ret < 0)
			break; // error. Abort
		else if(ret >= 0)
			continue; // message retrieved successfully. Try again immediately
		else
			//(0 == ret) no message retrieved. Briefly sleep before retrying
			usleep(OscReceiverSleepBetweenReadsUs);
	}
}

void OscReceiver::setup(int port, std::function<void(oscpkt::Message* msg, const char* addr, void* arg)> _on_receive, void* callbackArg)
{
	inBuffer.resize(OscReceiverInBufferSize);

	onReceiveArg = callbackArg;
	on_receive = _on_receive;
	pr = std::unique_ptr<oscpkt::PacketReader>(new oscpkt::PacketReader());

	socket = std::unique_ptr<UdpServer>(new UdpServer());
	if(!socket->setup(port)){
		fprintf(stderr, "OscReceiver: Unable to initialise UDP socket: %d %s\n", errno, strerror(errno));
		return;
	}
	receive_task = std::unique_ptr<std::thread>(new std::thread(&OscReceiver::receive_task_func, this));
}

int OscReceiver::waitForMessage(int timeout){
	int ret = socket->waitUntilReady(timeout);
	if (ret == -1){
		fprintf(stderr, "OscReceiver: Error polling UDP socket: %d %s\n", errno, strerror(errno));
		return -1;
	} else if(ret == 1){
		int msgLength = socket->read(inBuffer.data(), inBuffer.size(), false);
		if (msgLength < 0){
			fprintf(stderr, "OscReceiver: Error reading UDP socket: %d %s\n", errno, strerror(errno));
			return -1;
		}
		std::string addr = std::string(socket->getLastRecvAddr()) + ":" + std::to_string(socket->getLastRecvPort());
		pr->init(inBuffer.data(), msgLength);
		if (!pr->isOk()){
			fprintf(stderr, "OscReceiver: oscpkt error parsing received message: %i\n", pr->getErr());
			return ret;
		}
		on_receive(pr->popMessage(), addr.c_str(), onReceiveArg);
	}
	return ret;
}
