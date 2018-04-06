/***** OSCSender.h *****/
#ifndef __OSCSender_H_INCLUDED__
#define __OSCSender_H_INCLUDED__ 

#include <UdpClient.h>
#include <oscpkt.hh>
#include <AuxTaskNonRT.h>

#define OSCSENDER_DEFAULT_STREAMING_BUFFERSIZE 1024

class OSCSender{
	public:
		OSCSender();
		
		void setup(int port, std::string ip_address=std::string("127.0.0.1"));
		
		OSCSender &newMessage(std::string address);
		OSCSender &add(int payload);
		OSCSender &add(float payload);
		OSCSender &add(std::string payload);
		OSCSender &add(bool payload);
		OSCSender &add(void *ptr, size_t num_bytes);
		void sendNow();
		void send();
		
		void streamTo(std::string address, int streaming_buffer_size = OSCSENDER_DEFAULT_STREAMING_BUFFERSIZE);
		void stream(float in);
		// void stream(float* buf, int num_floats);

	private:
		std::string ip_address;
        int port;
        
        UdpClient socket;
        
        oscpkt::Message msg;
        oscpkt::PacketWriter pw;

        AuxTaskNonRT send_task;
        static void send_task_func(void* ptr, void* buf, int size);
        
        std::string streamAddress;
        std::vector<float> streamBuffer;
        int streamBufferSize;
        
        AuxTaskNonRT stream_task;
        static void stream_task_func(void* ptr, void* buf, int size);
};

#endif