#include "OscReceiver.h"
#include <Bela.h> // gShouldStop
#include <AuxTaskNonRT.h>
#include <libraries/UdpServer/UdpServer.h>

OscReceiver::OscReceiver(){}
OscReceiver::OscReceiver(int port, std::function<void(oscpkt::Message* msg, void* arg)> on_receive, void* callbackArg){
	setup(port, on_receive, callbackArg);
}
OscReceiver::~OscReceiver(){
	lShouldStop = true;
	// allow in-progress read to complete before destructing
	while(waitingForMessage){
		usleep(OSCRECEIVER_POLL_US/2);
	}
}

void OscReceiver::receive_task_func(){
	OscReceiver* instance = this;
	while(!gShouldStop && !instance->lShouldStop){
		instance->waitingForMessage = true;
		instance->waitForMessage(0);
		instance->waitingForMessage = false;
		usleep(OSCRECEIVER_POLL_US);
	}
}

void OscReceiver::setup(int port, std::function<void(oscpkt::Message* msg, void* arg)> _on_receive, void* callbackArg){
    
    onReceiveArg = callbackArg;
    on_receive = _on_receive;
    pr = std::unique_ptr<oscpkt::PacketReader>(new oscpkt::PacketReader());
    
    socket = std::unique_ptr<UdpServer>(new UdpServer());
    if(!socket->setup(port)){
        fprintf(stderr, "OscReceiver: Unable to initialise UDP socket: %d %s\n", errno, strerror(errno));
        return;
    }
	
	receive_task = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	receive_task->create(std::string("OscReceiverTask_") + std::to_string(port), [this](){receive_task_func(); });

    receive_task->schedule();
}

int OscReceiver::waitForMessage(int timeout){
	int ret = socket->waitUntilReady(true, timeout);
	if (ret == -1){
		fprintf(stderr, "OscReceiver: Error polling UDP socket: %d %s\n", errno, strerror(errno));
		return -1;
	} else if(ret == 1){
		int msgLength = socket->read(&inBuffer, OSCRECEIVER_BUFFERSIZE, false);
		if (msgLength < 0){
			fprintf(stderr, "OscReceiver: Error reading UDP socket: %d %s\n", errno, strerror(errno));
			return -1;
        }
        pr->init(inBuffer, msgLength);
        if (!pr->isOk()){
        	fprintf(stderr, "OscReceiver: oscpkt error parsing received message: %i", pr->getErr());
        	return -1;
        }
		on_receive(pr->popMessage(), onReceiveArg);
	}
	return ret;
}
