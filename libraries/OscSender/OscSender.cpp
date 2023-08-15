/***** OscSender.cpp *****/
#include "OscSender.h"
#include <Bela.h>
#include <libraries/UdpClient/UdpClient.h>
#include <oscpkt.hh>
#include <AuxTaskNonRT.h>

#define OSCSENDER_MAX_ARGS 1024
#define OSCSENDER_MAX_BYTES 65536

OscSender::OscSender(){}
OscSender::OscSender(int port, std::string ip_address){
	setup(port, ip_address);
}
OscSender::~OscSender(){}

void OscSender::doSendToSocket(const void* buf, size_t size) {
	socket->send(buf, size);
}

void OscSender::setup(int port, std::string ip_address){

    pw = std::unique_ptr<oscpkt::PacketWriter>(new oscpkt::PacketWriter());
    msg = std::unique_ptr<oscpkt::Message>(new oscpkt::Message());
    msg->reserve(OSCSENDER_MAX_ARGS, OSCSENDER_MAX_BYTES);
    
    socket = std::unique_ptr<UdpClient>(new UdpClient());
	socket->setup(port, ip_address.c_str());
	
	send_task = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	send_task->create(std::string("OscSndrTsk_") + ip_address + std::to_string(port), [this](const void* buf, int size){
		doSendToSocket(buf, size);
	});
}

OscSender &OscSender::newMessage(std::string address){
	msg->init(address);
	return *this;
}

OscSender &OscSender::add(int payload){
	msg->pushInt32(payload);
	return *this;
}
OscSender &OscSender::add(float payload){
	msg->pushFloat(payload);
	return *this;
}
OscSender &OscSender::add(std::string payload){
	msg->pushStr(payload);
	return *this;
}
OscSender &OscSender::add(bool payload){
	msg->pushBool(payload);
	return *this;
}
OscSender &OscSender::add(void *ptr, size_t num_bytes){
	msg->pushBlob(ptr, num_bytes);
	return *this;
}

void OscSender::send(){
	pw->init().addMessage(*msg);
	send_task->schedule(pw->packetData(), pw->packetSize());
}

void OscSender::sendNonRt(){
	pw->init().addMessage(*msg);
	doSendToSocket(pw->packetData(), pw->packetSize());
}

void OscSender::send(const oscpkt::Message& extMsg){
	pw->init().addMessage(extMsg);
	send_task->schedule(pw->packetData(), pw->packetSize());
}

void OscSender::sendNonRt(const oscpkt::Message& extMsg){
	pw->init().addMessage(extMsg);
	doSendToSocket(pw->packetData(), pw->packetSize());
}
