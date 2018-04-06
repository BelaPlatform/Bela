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
		
		void newMessage(const char* address);
		void add(int payload);
		void add(float payload);
		void add(const char* payload);
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