#pragma once

#include <memory>
#include <vector>

class UdpClient;
class AuxTaskNonRT;
namespace oscpkt{
	class Message;
	class PacketWriter;
}

/**
 * \brief OscSender provides functions for sending OSC messages from Bela.
 *
 * Functionality is provided for sending messages with int, float, bool, 
 * std::string and binary blob arguments. Sending a stream of floats is
 * also supported.
 *
 * Uses oscpkt (http://gruntthepeon.free.fr/oscpkt/) underneath
 */
class OscSender{
	public:
		OscSender();
		OscSender(int port, std::string ip_address=std::string("127.0.0.1"));
		~OscSender();
		
        /**
		 * \brief Initialises OscSender
		 *
		 * Must be called once during setup()
		 *
		 * If address is left blank it will default to localhost (127.0.0.1)
		 *
		 * @param port the UDP port number used to send OSC messages
		 * @param address the IP address OSC messages are sent to (defaults to 127.0.0.1)
		 *
		 */
		void setup(int port, std::string ip_address=std::string("127.0.0.1"));
		
		/**
		 * \brief Creates a new OSC message
		 *
		 * @param address the address which the OSC message will be sent to
		 *
		 */
		OscSender &newMessage(std::string address);
		/**
		 * \brief Adds an int argument to a message
		 *
		 * Can optionally be chained with other calls to add(), newMessage() and
		 * send() or sendNow()
		 *
		 * @param payload the argument to be added to the message
		 */
		OscSender &add(int payload);
		/**
		 * \brief Adds a float argument to a message
		 *
		 * Can optionally be chained with other calls to add(), newMessage() and
		 * send() or sendNow()
		 *
		 * @param payload the argument to be added to the message
		 */
		OscSender &add(float payload);
		/**
		 * \brief Adds a string argument to a message
		 *
		 * Can optionally be chained with other calls to add(), newMessage() and
		 * send() or sendNow()
		 *
		 * @param payload the argument to be added to the message
		 */
		OscSender &add(std::string payload);
		/**
		 * \brief Adds a boolean argument to a message
		 *
		 * Can optionally be chained with other calls to add(), newMessage() and
		 * send() or sendNow()
		 *
		 * @param payload the argument to be added to the message
		 */
		OscSender &add(bool payload);
		/**
		 * \brief Adds a binary blob argument to a message
		 *
		 * Copies binary data into a buffer, which is sent as a binary blob.
		 * Can optionally be chained with other calls to add(), newMessage() and
		 * send() or sendNow()
		 *
		 * @param ptr pointer to the data to be sent
		 * @param num_bytes the number of bytes to be sent
		 */
		OscSender &add(void *ptr, size_t num_bytes);
		/**
		 * \brief Sends the message
		 *
		 * After creating a message with newMessage() and adding arguments to it
		 * with add(), the message is sent with this function. It is safe to call
		 * from the audio thread.
		 *
		 */
		void send();

        	std::unique_ptr<UdpClient> socket;
        
        	std::unique_ptr<oscpkt::Message> msg;
        	std::unique_ptr<oscpkt::PacketWriter> pw;

		std::unique_ptr<AuxTaskNonRT> send_task;
		void send_task_func(void* buf, int size);
};
