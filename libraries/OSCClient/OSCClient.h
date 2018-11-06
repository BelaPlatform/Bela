/***** OSCClient.h *****/
#ifndef __OSCClient_H_INCLUDED__
#define __OSCClient_H_INCLUDED__ 

#include <UdpClient/UdpClient.h>
#include <Bela.h>
#include <oscpkt.hh>
#include <queue>

/**
 * \brief OSCMessageFactory provides functions for building OSC messages within Bela.
 *
 * This class is safe to use on the audio thread.
 *
 * It is a wrapper for the oscpkt::Message class, which allows a message to be constructed
 * conveniently on one line like so:
 *
 * oscpkt::Message msg = oscMessageFactory.to("/osc_address").add(std::string("string")).add(5).add(3.14).add(false).end();
 *
 * Every use of OSCMessageFactory must begin with to() and end with end()
 *
 * Uses oscpkt (http://gruntthepeon.free.fr/oscpkt/) underneath
 */
class OSCMessageFactory{
    public:
    	/**
		 * \brief Sets the address of the OSC message
		 *
		 * Must be called first when creating a message
		 *
		 * Returns the class instance, allowing methods to be chained
		 *
		 * @param address the address of the OSC message
		 *
		 */
        OSCMessageFactory& to(std::string address);
        
        /**
		 * \brief Adds a parameter to an OSC message
		 *
		 * Must be called after to() but before end()
		 *
		 * Parameters can be std::string, int, float, bool, or a void pointer to a binary buffer
		 *
		 * Returns the class instance, allowing methods to be chained
		 *
		 * @param address the address of the OSC message
		 *
		 */
        OSCMessageFactory& add(std::string);
        OSCMessageFactory& add(int);
        OSCMessageFactory& add(float);
        OSCMessageFactory& add(bool);
        OSCMessageFactory& add(void *ptr, int size);
        
        /**
		 * \brief Finalises and returns the OSC message
		 *
		 * Must be called last when creating a message
		 *
		 * Returns the created OSC message
		 *
		 * \return oscpkt::Message the created message
		 *
		 */
        oscpkt::Message end();
        
    private:
        oscpkt::Message msg;
};

/**
 * \brief OSCClient provides functions for sending OSC messages from Bela.
 *
 * Care must be taken to use the correct methods while running on the audio thread to
 * prevent Xenomai mode switches and audio glitches.
 *
 * Uses oscpkt (http://gruntthepeon.free.fr/oscpkt/) underneath
 */
class OSCClient{
    public:
        OSCClient();
        OSCClient(int port, const char* address="127.0.0.1", bool scheduleTask = true);
	~OSCClient();

        /**
		 * \brief Sets the port and optionally the IP address used to send OSC messages
		 *
		 * Must be called once during setup()
		 *
		 * If address is left blank it will default to localhost (127.0.0.1)
		 * If scheduleTask is set to false, messages queued with queueMessage()
		 * will not be sent. Messages sent with sendMessageNow() will be sent.
		 * This can save CPU if messages only need to be sent during setup.
		 * scheduleTask defaults to true.
		 *
		 * @param port the port used to send OSC messages
		 * @param address the IP address OSC messages are sent to (defaults to 127.0.0.1)
		 * @param scheduleTask send queued messages (defaults to true)
		 *
		 */

	void cleanup();

        void setup(int port, const char* address="127.0.0.1", bool scheduleTask = true);
        
        /**
		 * \brief Queue an OSC message to be sent at the end of the current audio block
		 *
		 * This method is audio-thread safe, and can be used from render()
		 *
		 * This is the function you would usually use to send OSC messages
		 * The messages are sent over UDP to the IP and port specified in setup()
		 *
		 * @param oscpkt::Message an oscpkt Message object representing an OSC message
		 * 
		 */
        void queueMessage(oscpkt::Message);
        
        /**
		 * \brief Send an OSC message immediately *** do not use on audio thread! ***
		 *
		 * This method is *not* audio-thread safe, and can *not* be used from render()
		 *
		 * This method can be used to send OSC messages during setup, or from an
		 * auxiliary task
		 *
		 * @param oscpkt::Message an oscpkt Message object representing an OSC message
		 * 
		 */
        void sendMessageNow(oscpkt::Message);
        
        /**
		 * \brief Create a new oscpkt::Message object representing an OSC message
		 *
		 * This member is an instance of OSCMessageFactory, which can be used
		 * to build an OSC message.
		 * e.g: oscClient.queueMessage(oscClient.newMessage.to("/address").add(param).end())
		 * 
		 */
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
