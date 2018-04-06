/***** OSCServer.cpp *****/
#include <OSCServer.h>
#include <Bela.h>

void OSCServer::recieve_task_func(void* ptr){
	OSCServer* instance = (OSCServer*)ptr;
	while(!gShouldStop){
		instance->waitForMessage(OSCSERVER_POLL_MS);
	}
}

void OSCServer::setup(int _port, void (*_callback)(oscpkt::Message* msg)){
    port = _port;
    callback = _callback;
    
    if(!socket.init(port)){
        fprintf(stderr, "OSCServer: Unable to initialise UDP socket: %d %s\n", errno, strerror(errno));
        return;
    }
	
    recieve_task.create(std::string("OSCServerTask_") + std::to_string(_port), OSCServer::recieve_task_func, this);
    recieve_task.schedule();
}

int OSCServer::waitForMessage(int timeout){
	int ret = socket.waitUntilReady(true, timeout);
	if (ret == -1){
		fprintf(stderr, "OSCServer: Error polling UDP socket: %d %s\n", errno, strerror(errno));
		return -1;
	} else if(ret == 1){
		int msgLength = socket.read(&inBuffer, OSCSERVER_BUFFERSIZE, false);
		if (msgLength < 0){
			fprintf(stderr, "OSCServer: Error reading UDP socket: %d %s\n", errno, strerror(errno));
			return -1;
        }
        pr.init(inBuffer, msgLength);
        if (!pr.isOk()){
        	fprintf(stderr, "OSCServer: oscpkt error parsing recieved message: %i", pr.getErr());
        	return -1;
        }
		callback(pr.popMessage());
	}
	return ret;
}
