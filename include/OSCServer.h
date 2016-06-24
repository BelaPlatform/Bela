/***** OSCServer.h *****/
#ifndef __OSCServer_H_INCLUDED__
#define __OSCServer_H_INCLUDED__ 

#include <UdpServer.h>
#include <oscpkt.hh>
#include <Bela.h>
#include <queue>

#define UDP_RECEIVE_TIMEOUT_MS 20
#define UDP_RECEIVE_MAX_LENGTH 16384

class OSCServer{
    public:
        OSCServer();

        // must be called once during setup
        void setup(int port);
        
        // returns true if messages are queued
        // audio-thread safe
        bool messageWaiting();
        
        // removes and returns the oldest message from the queue
        // audio-thread safe, but don't call unless messageWaiting() returns true
        oscpkt::Message popMessage();
        
        // if there are OSC messages waiting, decode and queue them
        // not audio-thread safe!
        void receiveMessageNow(int timeout);
        
    private:
        int port;
        UdpServer socket;

        AuxiliaryTask OSCReceiveTask;
        
        void createAuxTasks();
        void messageCheck();
        
        static void checkMessages(void*);
        
        int inBuffer[UDP_RECEIVE_MAX_LENGTH];
        std::queue<oscpkt::Message> inQueue;
        oscpkt::Message poppedMessage;
        oscpkt::PacketReader pr;
};


#endif
