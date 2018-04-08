/***** OSCReceiver.cpp *****/
#include <OSCReceiver.h>
#include <Bela.h>

OSCReceiver::OSCReceiver(int port, void (*onreceive)(oscpkt::Message* msg)){
	setup(port, onreceive);
}

void OSCReceiver::recieve_task_func(void* ptr){
	OSCReceiver* instance = (OSCReceiver*)ptr;
	while(!gShouldStop){
		instance->waitForMessage(OSCRECEIVER_POLL_MS);
	}
}

void OSCReceiver::setup(int _port, void (*_callback)(oscpkt::Message* msg)){
    port = _port;
    callback = _callback;
    
    if(!socket.init(port)){
        fprintf(stderr, "OSCReceiver: Unable to initialise UDP socket: %d %s\n", errno, strerror(errno));
        return;
    }
	
    recieve_task.create(std::string("OSCReceiverTask_") + std::to_string(_port), OSCReceiver::recieve_task_func, this);
    recieve_task.schedule();
}

int OSCReceiver::waitForMessage(int timeout){
	int ret = socket.waitUntilReady(true, timeout);
	if (ret == -1){
		fprintf(stderr, "OSCReceiver: Error polling UDP socket: %d %s\n", errno, strerror(errno));
		return -1;
	} else if(ret == 1){
		int msgLength = socket.read(&inBuffer, OSCRECEIVER_BUFFERSIZE, false);
		if (msgLength < 0){
			fprintf(stderr, "OSCReceiver: Error reading UDP socket: %d %s\n", errno, strerror(errno));
			return -1;
        }
        pr.init(inBuffer, msgLength);
        if (!pr.isOk()){
        	fprintf(stderr, "OSCReceiver: oscpkt error parsing recieved message: %i", pr.getErr());
        	return -1;
        }
		callback(pr.popMessage());
	}
	return ret;
}
