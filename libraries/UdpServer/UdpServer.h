#pragma once
#include <netinet/in.h>

class UdpServer{
	private:
		int port;
		int enabled = false;
		int inSocket = -1;
		struct sockaddr_in server;
		struct sockaddr_in from;
	public:
		UdpServer();
		UdpServer(unsigned int port);
		~UdpServer();
		bool setup(unsigned int aPort);
		void cleanup();
		/**
		 * Get the port that the server is currently listening on
		 */
		int getBoundPort() const;
		/**
		 * Reads bytes from the socket.
		 *
		 * @param destBuffer the destination buffer
		 * @param maxBytesToRead the maximum number of bytes to read
		 * @param blockUntilSpecifiedAmountHasArrived If `true`, the method
		 * will block until @p maxBytesToRead bytes have been read, (or
		 * until an error occurs). If it is false, the method
		 * will return as much data as is currently available without
		 * blocking.
		 */
		int read(void* destBuffer, int maxBytesToRead, bool blockUntilSpecifiedAmountHasArrived);
		void close();
		/**
		 * Drain the input buffer
		 */
		int empty();
		int empty(int maxCount);
		/**
		 * Waits until the socket is ready for reading.
		 *
		 * @param timeoutMsecs If it is < 0, it will wait forever,
		 * or else will give up after the specified time in milliseconds.
		 *
		 * @return If the socket is ready on return, this returns 1.
		 * If it times-out before the socket becomes ready, it
		 * returns 0. If an error occurs, it returns -1.
		 */
		int waitUntilReady(int timeoutMsecs);
		/**
		 * Deprecated. Should be called with `readyForReading=true`
		 */
		int waitUntilReady(bool readyForReading, int timeoutMsecs);
		/**
		 * Get the source port for the last received message
		 */
		int getLastRecvPort();
		/**
		 * Get the source address for the last received message
		 */
		const char* getLastRecvAddr();
};
