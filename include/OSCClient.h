/***** OSCClient.h *****/
#ifndef __OSCClient_H_INCLUDED__
#define __OSCClient_H_INCLUDED__ 

#include <UdpClient.h>
#include <oscpkt.hh>
#include <AuxTaskNonRT.h>

#define OSCCLIENT_DEFAULT_STREAMING_BUFFERSIZE 1024

class OSCClient{
	public:
		OSCClient();
		
		void setup(int port, std::string ip_address=std::string("127.0.0.1"));
		
		OSCClient &newMessage(std::string address);
		OSCClient &add(int payload);
		OSCClient &add(float payload);
		OSCClient &add(std::string payload);
		OSCClient &add(bool payload);
		OSCClient &add(void *ptr, size_t num_bytes);
		void sendNow();
		void send();
		
		void streamTo(std::string address, int streaming_buffer_size = OSCCLIENT_DEFAULT_STREAMING_BUFFERSIZE);
		void stream(float in);

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