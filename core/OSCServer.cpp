/***** OSCServer.cpp *****/
#include <OSCServer.h>

// constructor
OSCServer::OSCServer(){}

// static method for checking messages
// called by messageCheckTask with pointer to OSCServer instance as argument
void OSCServer::checkMessages(void* ptr){
    OSCServer *instance = (OSCServer*)ptr;
    instance->messageCheck();
}

void OSCServer::setup(int _port){
    port = _port;
    if(!socket.init(port))
        rt_printf("socket not initialised\n");
    createAuxTasks();
}

void OSCServer::createAuxTasks(){
    char name [30];
    sprintf (name, "OSCReceiveTask %i", port);
    OSCReceiveTask = Bela_createAuxiliaryTask(OSCServer::checkMessages, BELA_AUDIO_PRIORITY-5, name, this, true);
}

void OSCServer::messageCheck(){
    if (socket.waitUntilReady(true, UDP_RECEIVE_TIMEOUT_MS)){
        int msgLength = socket.read(&inBuffer, UDP_RECEIVE_MAX_LENGTH, false);
        pr.init(inBuffer, msgLength);
        oscpkt::Message *inmsg;
        while (pr.isOk() && (inmsg = pr.popMessage()) != 0) {
            inQueue.push(*inmsg);
        }
    }
}

bool OSCServer::messageWaiting(){
    return !inQueue.empty();
}

oscpkt::Message OSCServer::popMessage(){
    if (!inQueue.empty()){
        poppedMessage = inQueue.front();
        inQueue.pop();
    } else {
        poppedMessage.init("/error");
    }
    return poppedMessage;
}

void OSCServer::receiveMessageNow(int timeout){
    if (socket.waitUntilReady(true, timeout)){
        int msgLength = socket.read(&inBuffer, UDP_RECEIVE_MAX_LENGTH, false);
        pr.init(inBuffer, msgLength);
        oscpkt::Message *inmsg;
        while (pr.isOk() && (inmsg = pr.popMessage()) != 0) {
            inQueue.push(*inmsg);
        }
    }
}




