/***** OSCReceiver.cpp *****/
#include <OSCReceiver.h>
#include <Bela.h>
#include <AuxTaskNonRT.h>
#include <UdpServer.h>

OSCReceiver::OSCReceiver(){}
OSCReceiver::OSCReceiver(int port, std::function<void(oscpkt::Message* msg)> on_receive){
	setup(port, on_receive);
}
OSCReceiver::~OSCReceiver(){
	lShouldStop = true;
	// allow in-progress read to complete before destructing
	while(waitingForMessage){
		usleep(OSCRECEIVER_POLL_US/2);
	}
}

void OSCReceiver::recieve_task_func(void* ptr){
	OSCReceiver* instance = (OSCReceiver*)ptr;
	while(!gShouldStop && !instance->lShouldStop){
		instance->waitingForMessage = true;
		instance->waitForMessage(0);
		instance->waitingForMessage = false;
		usleep(OSCRECEIVER_POLL_US);
	}
}

void OSCReceiver::setup(int port, std::function<void(oscpkt::Message* msg)> _on_receive){
    
    on_receive = _on_receive;
    pr = std::unique_ptr<oscpkt::PacketReader>(new oscpkt::PacketReader());
    
    socket = std::unique_ptr<UdpServer>(new UdpServer());
    if(!socket->init(port)){
        fprintf(stderr, "OSCReceiver: Unable to initialise UDP socket: %d %s\n", errno, strerror(errno));
        return;
    }
	
	recieve_task = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	recieve_task->create(std::string("OSCReceiverTask_") + std::to_string(port), OSCReceiver::recieve_task_func, this);
    recieve_task->schedule();
}

int OSCReceiver::waitForMessage(int timeout){
	int ret = socket->waitUntilReady(true, timeout);
	if (ret == -1){
		fprintf(stderr, "OSCReceiver: Error polling UDP socket: %d %s\n", errno, strerror(errno));
		return -1;
	} else if(ret == 1){
		int msgLength = socket->read(&inBuffer, OSCRECEIVER_BUFFERSIZE, false);
		if (msgLength < 0){
			fprintf(stderr, "OSCReceiver: Error reading UDP socket: %d %s\n", errno, strerror(errno));
			return -1;
        }
        pr->init(inBuffer, msgLength);
        if (!pr->isOk()){
        	fprintf(stderr, "OSCReceiver: oscpkt error parsing recieved message: %i", pr->getErr());
        	return -1;
        }
		on_receive(pr->popMessage());
	}
	return ret;
}
