/***** OSCClient.cpp *****/
#include "OSCClient.h"

OSCClient::OSCClient(){}

OSCClient::OSCClient(int port, const char* address, bool scheduleTask){
	setup(port, address, scheduleTask);
}

OSCClient::~OSCClient(){
	cleanup();
}

void OSCClient::cleanup(){}

void OSCClient::setup(int _port, const char* _address, bool scheduleTask){
	address = _address;
   	port = _port;
    
   	socket.setServer(address);
	socket.setPort(port);
	
	if (scheduleTask)
    		createAuxTasks();
}

void OSCClient::sendQueue(void* ptr){
    OSCClient *instance = (OSCClient*)ptr;
    while(!gShouldStop){
        instance->queueSend();
        usleep(1000);
    }
}

void OSCClient::createAuxTasks(){
    char name [30];
    sprintf (name, "OSCSendTask %i", port);
    OSCSendTask = Bela_createAuxiliaryTask(sendQueue, BELA_AUDIO_PRIORITY-5, name, this);
    Bela_scheduleAuxiliaryTask(OSCSendTask);
}

void OSCClient::queueMessage(oscpkt::Message msg){
    outQueue.push(msg);
}

void OSCClient::queueSend(){
    if (!outQueue.empty()){
        pw.init().startBundle();
        while(!outQueue.empty()){
            pw.addMessage(outQueue.front());
            outQueue.pop();
        }
        pw.endBundle();
        outBuffer = pw.packetData();
        socket.send(outBuffer, pw.packetSize());
    }
}

void OSCClient::sendMessageNow(oscpkt::Message msg){
    pw.init().addMessage(msg);
    outBuffer = pw.packetData();
    socket.send(outBuffer, pw.packetSize());
}

// OSCMessageFactory
OSCMessageFactory& OSCMessageFactory::to(std::string addr){
    msg.init(addr);
    return *this;
}

OSCMessageFactory& OSCMessageFactory::add(std::string in){
    msg.pushStr(in);
    return *this;
}
OSCMessageFactory& OSCMessageFactory::add(int in){
    msg.pushInt32(in);
    return *this;
}
OSCMessageFactory& OSCMessageFactory::add(float in){
    msg.pushFloat(in);
    return *this;
}
OSCMessageFactory& OSCMessageFactory::add(bool in){
    msg.pushBool(in);
    return *this;
}
OSCMessageFactory& OSCMessageFactory::add(void *ptr, int size){
    msg.pushBlob(ptr, size);
    return *this;
}
oscpkt::Message OSCMessageFactory::end(){
    return msg;
}
