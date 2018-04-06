/***** OSCClient.cpp *****/
#include <OSCClient.h>
#include <Bela.h>

OSCClient::OSCClient(){}

void OSCClient::send_task_func(void* ptr, void* buf, int size){
	OSCClient* instance = (OSCClient*)ptr;
	instance->socket.send(buf, size);
}

void OSCClient::stream_task_func(void* ptr, void* buf, int size){
	OSCClient* instance = (OSCClient*)ptr;
	instance->newMessage(instance->streamAddress)
			.add(buf, size)
			.sendNow();
}

void OSCClient::setup(int _port, std::string _ip_address){
	ip_address = _ip_address;
    port = _port;
    
    socket.setServer(ip_address.c_str());
	socket.setPort(port);
	
	send_task.create(std::string("OSCClientTask_") + std::to_string(_port), OSCClient::send_task_func, this);
}

void OSCClient::streamTo(std::string address, int streaming_buffer_size){
	streamAddress = address;
	streamBufferSize = streaming_buffer_size;
	streamBuffer.reserve(streamBufferSize);
	stream_task.create(std::string("OSCStreamTask_") + std::to_string(port), OSCClient::stream_task_func, this);
}

void OSCClient::stream(float in){
	streamBuffer.push_back(in);
	if (streamBuffer.size() >= streamBufferSize){
		stream_task.schedule(&streamBuffer[0], streamBuffer.size()*sizeof(float));
		streamBuffer.clear();
	}
}

OSCClient &OSCClient::newMessage(std::string address){
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
OSCClient &OSCClient::add(std::string payload){
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
	send_task.schedule(pw.packetData(), pw.packetSize());
}

void OSCClient::sendNow(){
	pw.init().addMessage(msg);
    socket.send(pw.packetData(), pw.packetSize());
}