/***** OSCReceiver.h *****/
#ifndef __OSCReceiver_H_INCLUDED__
#define __OSCReceiver_H_INCLUDED__ 

#include <UdpServer.h>
#include <oscpkt.hh>
#include <AuxTaskNonRT.h>

#define OSCRECEIVER_POLL_MS 5
#define OSCRECEIVER_BUFFERSIZE 65536

class OSCReceiver{
    public:
        OSCReceiver(){}
		
        void setup(int port, void (*callback)(oscpkt::Message* msg));
        int waitForMessage(int timeout_ms);
        
    private:
        int port;
        UdpServer socket;

        AuxTaskNonRT recieve_task;
        static void recieve_task_func(void* ptr);
		
        oscpkt::PacketReader pr;
        char* inBuffer[OSCRECEIVER_BUFFERSIZE];
        
        void (*callback)(oscpkt::Message* msg);
};


#endif
