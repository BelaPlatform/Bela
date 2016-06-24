/***** Scope.h *****/
#ifndef __Scope_H_INCLUDED__
#define __Scope_H_INCLUDED__ 

#include <OSCServer.h>
#include <OSCClient.h>
#include <stdarg.h>

#define OSC_RECEIVE_PORT 8675
#define OSC_SEND_PORT 8676
#define SCOPE_UDP_PORT 8677

#define FRAMES_STORED 2

class Scope{
    public:
        Scope();
        
        /**
         * Setup the Scope.
         *
         * @param numChannels number of channels in the scope.
         * @param sampleRate sampleRate of the data passed in.
         */
        void setup(unsigned int numChannels, float sampleRate);

        /**
         * Logs a frame of data to the scope.
         *
         * Pass one argument per channel (starting from the first), up to the
         * number of channels of the object.
         * Omitted values will be set to 0.
         */
        void log(float chn1, ...);

        /**
         * Logs a frame of data to the scope.
         *
         * @param values a pointer to an array containing numChannels values.
         */
        void log(float* values);
        bool trigger();
        
    private:
        OSCServer oscServer;
        OSCClient oscClient;
        UdpClient socket;
        
        void parseMessage(oscpkt::Message);
        void start();
        void stop();
        void doTrigger();
        void triggerNormal();
        void triggerAuto();
        void scheduleSendBufferTask();
        void sendBuffer();
        void customTrigger();
        bool triggered();
        
        // settings
        int numChannels;
        float sampleRate;
        int connected;
        int frameWidth;
        int triggerMode;
        int triggerChannel;
        int triggerDir;
        float triggerLevel;
        int xOffset;
        int upSampling;
        int downSampling;
        float holdOff;
        
        int channelWidth;
        int downSampleCount;
        int holdOffSamples;
        
        // buffers
        std::vector<float> buffer;
        std::vector<float> outBuffer;
        
        // pointers
        int writePointer;
        int readPointer;
        int triggerPointer;
        int customTriggerPointer;
        
        // trigger status
        bool triggerPrimed;
        bool triggerCollecting;
        bool triggerWaiting;
        bool triggering;
        int triggerCount;
        int autoTriggerCount;
        bool started;
        bool customTriggered;
        
        // aux tasks
        AuxiliaryTask scopeTriggerTask;
        static void triggerTask(void*);
        
        AuxiliaryTask scopeSendBufferTask;
        static void sendBufferTask(void*);
        
};

#endif
