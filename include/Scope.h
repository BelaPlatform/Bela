/***** Scope.h *****/
#ifndef __Scope_H_INCLUDED__
#define __Scope_H_INCLUDED__ 

#include <OSCServer.h>
#include <OSCClient.h>
#include <ne10/NE10.h>
#include <stdarg.h>

#define OSC_RECEIVE_PORT 8675
#define OSC_SEND_PORT 8676
#define SCOPE_UDP_PORT 8677

#define FRAMES_STORED 4

#define TRIGGER_LOG_COUNT 16

/** 
 * \brief An oscilloscope which allows data to be visualised in a browser in real time.
 *
 * To use the scope, ensure the Bela IDE is running, and navigate to 
 * http://192.168.7.2/scope
 */
class Scope{
    public:
        Scope();
        
        /**
         * \brief Initialise the scope, setting the number of channels and the sample rate
         *
         * This function must be called once during setup. numChannels must be set
         * to the number of parameters passed in to log() or the channels may not be
         * displayed correctly. sampleRate must be the rate at which data is logged to
         * the scope (the rate at which log() is called) in Hz or the x-axis time values
         * displayed on the scope will be incorrect.
         *
         * @param numChannels number of channels displayed by the scope.
         * @param sampleRate sample rate of the data passed in.
         */
        void setup(unsigned int numChannels, float sampleRate);

        /** 
         * \brief Logs a frame of data to the scope.
         *
         * Pass one argument per channel (starting from the first), up to the
         * number of channels of the object.
         * Omitted values will be set to 0.
         */
        void log(float chn1, ...);

	/**
	 * \brief Logs a frame of data to the scope.
         *
         * Accepts a pointer to an array of floats representing each channel's value in
         * ascending order.
         *
         * @param values a pointer to an array containing numChannels values.
         */
        void log(float* values);
        
        /** 
         * \brief Cause the scope to trigger when set to custom trigger mode.
         *
         * This method can be used to force the scope to trigger rather than relying on
         * the typical auto or normal trigger.
         */
        bool trigger();
        
    private:
        OSCServer oscServer;
        OSCClient oscClient;
        UdpClient socket;
        
        void parseMessage(oscpkt::Message);
        void start();
        void stop();
        void triggerTimeDomain();
        void triggerFFT();
        void triggerNormal();
        void triggerAuto();
        void scheduleSendBufferTask();
        void sendBuffer();
        void customTrigger();
        bool triggered();
        bool prelog();
        void postlog(int);
        void setPlotMode();
        void doFFT();
        
        // settings
        int numChannels;
        float sampleRate;
        int connected;
        int frameWidth;
        int plotMode;
        int triggerMode;
        int triggerChannel;
        int triggerDir;
        float triggerLevel;
        int xOffset;
        int upSampling;
        int downSampling;
        float holdOff;
        
        bool sendBufferFlag;
        int logCount;
        
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
        
        // FFT
        int FFTLength;
        float FFTScale;
        int pointerFFT;
        bool collectingFFT;
        float *windowFFT;
        
        ne10_fft_cpx_float32_t* inFFT;
    	ne10_fft_cpx_float32_t* outFFT;
        ne10_fft_cfg_float32_t cfg;
        
        // aux tasks
        AuxiliaryTask scopeTriggerTask;
        static void triggerTask(void*);
        
        AuxiliaryTask scopeSendBufferTask;
        static void sendBufferTask(void*);
        
};

#endif
