/***** OSCClient.cpp *****/
#include <OSCClient.h>
#include <Bela.h>

OSCClient::OSCClient(){}

void OSCClient::task_func(void* ptr, void* buf, int size){
	OSCClient* instance = (OSCClient*)ptr;
	instance->socket.send(buf, size);
}

void OSCClient::setup(int _port, const char* _ip_address){
	ip_address = _ip_address;
    port = _port;
    
    socket.setServer(ip_address);
	socket.setPort(port);
	
	// TODO work out how to add port number to task name to allow multiple instances of OSCClient
	task.create("OSCClientTask", OSCClient::task_func, this);
}

OSCClient &OSCClient::newMessage(const char* address){
	msg.init(address);
	return *this;
}

OSCClient &OSCClient::add(int payload){
	msg.pushInt32(payload);
	return *this;
}
OSCClient &OSCClient::add(float payload){
	msg.pushFloat(payload);
	return *this;
}
OSCClient &OSCClient::add(const char* payload){
	msg.pushStr(payload);
	return *this;
}
OSCClient &OSCClient::add(bool payload){
	msg.pushBool(payload);
	return *this;
}
OSCClient &OSCClient::add(void *ptr, size_t num_bytes){
	msg.pushBlob(ptr, num_bytes);
	return *this;
}

void OSCClient::send(){
	pw.init().addMessage(msg);
	task.schedule(pw.packetData(), pw.packetSize());
}

void OSCClient::sendNow(){
	pw.init().addMessage(msg);
    socket.send(pw.packetData(), pw.packetSize());
}