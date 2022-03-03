#pragma once
#include <sys/types.h>
#include <netinet/in.h>

class UdpClient{
	private:
		int port;
		int outSocket;
		struct timeval stTimeOut;
		fd_set stWriteFDS;
		bool enabled = false;
		bool isSetPort = false;
		bool isSetServer = false;
		struct sockaddr_in destinationServer;
	public:
		UdpClient();
		UdpClient(int aPort, const char* aServerName);
		~UdpClient();
		bool setup(int aPort, const char* aServerName);
		void cleanup();
		/**
		 * Sets the port.
		 *
		 * Sets the port on the destination server.
		 * @param aPort the destineation port.
		 */
		void setPort(int aPort);

		/**
		 * Sets the server.
		 *
		 * Sets the IP address of the destinatioon server.
		 * @param aServerName the IP address of the destination server
		 */
		void setServer(const char* aServerName);

		/**
		 * Sends a packet.
		 *
		 * Sends a UPD packet to the destination server on the destination port.
		 * @param message A pointer to the location in memory which contains the message to be sent.
		 * @param size The number of bytes to be read from memory and sent to the destination.
		 * @return the number of bytes sent or -1 if an error occurred.
		 */
		int send(void* message, int size);

		int write(const char* remoteHostname, int remotePortNumber, void* sourceBuffer, int numBytesToWrite);
		int waitUntilReady(bool readyForReading, int timeoutMsecs);
		int setSocketBroadcast(int broadcastEnable);
};
