/***** OSCServer.h *****/
#ifndef __OSCServer_H_INCLUDED__
#define __OSCServer_H_INCLUDED__ 

#include <UdpServer.h>
#include <oscpkt.hh>
#include <AuxTaskNonRT.h>

#define OSCSERVER_POLL_MS 5
#define OSCSERVER_BUFFERSIZE 65536

class OSCServer{
    public:
        OSCServer(){}
		
        void setup(int port, void (*callback)(oscpkt::Message* msg));
        int waitForMessage(int timeout_ms);
        
    private:
        int port;
        UdpServer socket;

        AuxTaskNonRT recieve_task;
        static void recieve_task_func(void* ptr);
		
        oscpkt::PacketReader pr;
        char* inBuffer[OSCSERVER_BUFFERSIZE];
        
        void (*callback)(oscpkt::Message* msg);
};


#endif
