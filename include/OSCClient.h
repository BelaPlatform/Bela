/***** OSCClient.h *****/
#ifndef __OSCClient_H_INCLUDED__
#define __OSCClient_H_INCLUDED__ 

#include <UdpClient.h>
#include <Bela.h>
#include <oscpkt.hh>
#include <queue>

class OSCMessageFactory{
    public:
        OSCMessageFactory& to(std::string);
        OSCMessageFactory& add(std::string);
        OSCMessageFactory& add(int);
        OSCMessageFactory& add(float);
        OSCMessageFactory& add(bool);
        OSCMessageFactory& add(void *ptr, int size);
        oscpkt::Message end();
    private:
        oscpkt::Message msg;
};

class OSCClient{
    public:
        OSCClient();
        
        // must be called once during setup
        void setup(int port, const char* address="127.0.0.1", bool scheduleTask = true);
        
        // queue a message to be sent during the next aux task OSCSendTask
        // audio-thread safe
        void queueMessage(oscpkt::Message);
        
        // send a mesage immediately
        // *** do not use on audio thread! ***
        // to be used during setup
        void sendMessageNow(oscpkt::Message);
        
        // allows new OSC messages to be created
        // audio-thread safe
        // usage: oscClient.queueMessage(oscClient.newMessage.to("/address").add(param).end());
        OSCMessageFactory newMessage;
        
    private:
        const char* address;
        int port;
        
        UdpClient socket;
        AuxiliaryTask OSCSendTask;
        std::queue<oscpkt::Message> outQueue;
        oscpkt::PacketWriter pw;
        char* outBuffer;
        
        static void sendQueue(void*);
        
        void createAuxTasks();
        void queueSend();
        
};

#endif
