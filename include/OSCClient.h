/***** OSCClient.h *****/
#ifndef __OSCClient_H_INCLUDED__
#define __OSCClient_H_INCLUDED__ 

#include <UdpClient.h>
#include <oscpkt.hh>
#include <AuxTaskNonRT.h>

#define OSCCLIENT_MAX_MSGS 1024

class OSCClient{
	public:
		OSCClient();
		
		void setup(int port, const char* ip_address="127.0.0.1");
		
		OSCClient &newMessage(const char* address);
		OSCClient &add(int payload);
		OSCClient &add(float payload);
		OSCClient &add(const char* payload);
		OSCClient &add(bool payload);
		OSCClient &add(void *ptr, size_t num_bytes);
		void sendNow();
		void send();
		
	private:
		const char* ip_address;
        int port;
        
        UdpClient socket;
        
        oscpkt::Message msg;
        oscpkt::PacketWriter pw;
        char* outBuffer;
        
        AuxTaskNonRT task;
        static void task_func(void* ptr, void* buf, int size);
};

#endif