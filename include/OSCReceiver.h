/***** OSCReceiver.h *****/
#ifndef __OSCReceiver_H_INCLUDED__
#define __OSCReceiver_H_INCLUDED__ 

#include <UdpServer.h>
#include <oscpkt.hh>
#include <AuxTaskNonRT.h>

#define OSCRECEIVER_POLL_MS 5
#define OSCRECEIVER_BUFFERSIZE 65536

/**
 * \brief OSCReceiver provides functions for receiving OSC messages in Bela.
 *
 * When an OSC message is received over UDP on the port number passed to 
 * OSCReceiver::setup() it is passed in the form of an oscpkt::Message
 * to the onreceive callback. This callback, which must be passed to
 * OSCReceiver::setup() by the user, is run off the audio thread at 
 * non-realtime priority.
 *
 * For documentation of oscpkt see http://gruntthepeon.free.fr/oscpkt/
 */
class OSCReceiver{
    public:
        OSCReceiver(){}
        OSCReceiver(int port, void (*onreceive)(oscpkt::Message* msg));
        ~OSCReceiver(){}
	
        /**
		 * \brief Initiliases OSCReceiver
		 *
		 * Must be called once during setup()
		 *
		 * @param port the port number used to receive OSC messages
		 * @param onreceive the callback function which recevied OSC messages are passed to
		 *
		 */
        void setup(int port, void (*onreceive)(oscpkt::Message* msg));

        /**
		 * \brief Blocks execution until an OSC message is received
		 *
		 * This optional method can be used to block execution until an OSC message is 
		 * received. It should only be used in setup() or from an auxiliary thread, if
		 * used from render() it will cause mode switches. 
		 *
		 * @param timeout the time in milliseconds to block for if no messages are received. Null will block indefinitely.
		 * 
		 */
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
