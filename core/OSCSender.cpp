/***** OSCSender.cpp *****/
#include <OSCSender.h>
#include <Bela.h>

OSCSender::OSCSender(){}

void OSCSender::send_task_func(void* ptr, void* buf, int size){
	OSCSender* instance = (OSCSender*)ptr;
	instance->socket.send(buf, size);
}

void OSCSender::stream_task_func(void* ptr, void* buf, int size){
	OSCSender* instance = (OSCSender*)ptr;
	instance->newMessage(instance->streamAddress)
			.add(buf, size)
			.sendNow();
}

void OSCSender::setup(int _port, std::string _ip_address){
	ip_address = _ip_address;
    port = _port;
    
    socket.setServer(ip_address.c_str());
	socket.setPort(port);
	
	send_task.create(std::string("OSCSenderTask_") + std::to_string(_port), OSCSender::send_task_func, this);
}

void OSCSender::streamTo(std::string address, int streaming_buffer_size){
	streamAddress = address;
	streamBufferSize = streaming_buffer_size;
	streamBuffer.reserve(streamBufferSize);
	stream_task.create(std::string("OSCStreamTask_") + std::to_string(port), OSCSender::stream_task_func, this);
}

void OSCSender::stream(float in){
	streamBuffer.push_back(in);
	if (streamBuffer.size() >= streamBufferSize){
		stream_task.schedule(&streamBuffer[0], streamBuffer.size()*sizeof(float));
		streamBuffer.clear();
	}
}

OSCSender &OSCSender::newMessage(std::string address){
	msg.init(address);
	return *this;
}

OSCSender &OSCSender::add(int payload){
	msg.pushInt32(payload);
	return *this;
}
OSCSender &OSCSender::add(float payload){
	msg.pushFloat(payload);
	return *this;
}
OSCSender &OSCSender::add(std::string payload){
	msg.pushStr(payload);
	return *this;
}
OSCSender &OSCSender::add(bool payload){
	msg.pushBool(payload);
	return *this;
}
OSCSender &OSCSender::add(void *ptr, size_t num_bytes){
	msg.pushBlob(ptr, num_bytes);
	return *this;
}

void OSCSender::send(){
	pw.init().addMessage(msg);
	send_task.schedule(pw.packetData(), pw.packetSize());
}

void OSCSender::sendNow(){
	pw.init().addMessage(msg);
    socket.send(pw.packetData(), pw.packetSize());
}