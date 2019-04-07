/***** OSCSender.cpp *****/
#include "OSCSender.h"
#include <Bela.h>
#include <UdpClient/UdpClient.h>
#include <oscpkt.hh>
#include <AuxTaskNonRT.h>

#define OSCSENDER_MAX_ARGS 1024
#define OSCSENDER_MAX_BYTES 65536

OSCSender::OSCSender(){}
OSCSender::OSCSender(int port, std::string ip_address){
	setup(port, ip_address);
}
OSCSender::~OSCSender(){}

void OSCSender::send_task_func(void* buf, int size){
	OSCSender* instance = this;
	instance->socket->send(buf, size);
}

void OSCSender::setup(int port, std::string ip_address){

    pw = std::unique_ptr<oscpkt::PacketWriter>(new oscpkt::PacketWriter());
    msg = std::unique_ptr<oscpkt::Message>(new oscpkt::Message());
    msg->reserve(OSCSENDER_MAX_ARGS, OSCSENDER_MAX_BYTES);
    
    socket = std::unique_ptr<UdpClient>(new UdpClient());
    socket->setServer(ip_address.c_str());
	socket->setPort(port);
	
	send_task = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	send_task->create(std::string("OSCSenderTask_") + std::to_string(port), [this](void* buf, int size){send_task_func(buf, size); });
}

OSCSender &OSCSender::newMessage(std::string address){
	msg->init(address);
	return *this;
}

OSCSender &OSCSender::add(int payload){
	msg->pushInt32(payload);
	return *this;
}
OSCSender &OSCSender::add(float payload){
	msg->pushFloat(payload);
	return *this;
}
OSCSender &OSCSender::add(std::string payload){
	msg->pushStr(payload);
	return *this;
}
OSCSender &OSCSender::add(bool payload){
	msg->pushBool(payload);
	return *this;
}
OSCSender &OSCSender::add(void *ptr, size_t num_bytes){
	msg->pushBlob(ptr, num_bytes);
	return *this;
}

void OSCSender::send(){
	pw->init().addMessage(*msg);
	send_task->schedule(pw->packetData(), pw->packetSize());
}
