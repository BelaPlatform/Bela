#include <vector>
#include <string>
#include <WSServer.h>
#include <JSON.h>
#include <typeinfo> // for types in templates
#include <DataBuffer.h>


// forward declarations
class WSServer;
class JSONValue;
class AuxTaskRT;

class Gui
{
	private:

		std::vector<DataBuffer> _buffers;
		std::unique_ptr<WSServer> ws_server;

		bool wsIsConnected = false;

		void ws_connect();
		void ws_disconnect();
		void ws_onControlData(const char* data, int size);
		void ws_onData(const char* data, int size);
		int doSendBuffer(const char* type, unsigned int bufferId, const void* data, size_t size);

		unsigned int _port;
		std::string _addressControl;
		std::string _addressData;
		std::wstring _projectName;

		// User defined functions
		std::function<bool(const char*, int, void*)> customOnControlData;
		std::function<bool(const char*, int, void*)> customOnData;

		void* userControlData = nullptr;
		void* userBinaryData = nullptr;

	public:
		Gui();
		Gui(unsigned int port, std::string address);
		~Gui();

		int setup(unsigned int port = 5555, std::string address = "gui");
		/**
		 * Sets the web socket communication between server and client.
		 * Two different web socket connections will be configured, one for control data and the other one for raw binary data. 
		 * @param port Port on which to stablish the the web socket communication.
		 * @param address Base address used to stalish the web socket communication.
		 * @param projectName Project name to be sent to via the web-socket to the client.
		 * @returns O if web sockets have been configured.
		 **/
		int setup(std::string projectName, unsigned int port = 5555, std::string address = "gui");
		void cleanup();

		bool isConnected(){ return wsIsConnected; };

		// BUFFERS
		/**
		 * Sets the buffer type and size of the container.
		 * @param bufferType type of the buffer, can be float (f), int (i) or char (c)
		 * @param size Maximum number of elements that the buffer can hold.
		 * @retur Buffer ID, generated automatically based on the number of buffers and
		 * 	the order on which they have been created.
		 **/
		unsigned int setBuffer(char bufferType, unsigned int size);
		/**
		 * Returns a DataBuffer object which represents a typed buffer holding a number
		 * of bytes that an be retrieved in different formats.
		 * @param bufferId: buffer ID
		 **/
		DataBuffer& getDataBuffer(unsigned int bufferId);

		/**
		 * Set callback to parse control data received from the client.
		 * @param callback Callback to be called whenever new control data is received.
		 * 	Takes a byte buffer, the size of the buffer and a pointer as parameters.
		 * 	The first two parameters are used for the data received on the web-socket.
		 *	The third parameter is used to access data structures pointed by the user.
		 *
		 * @param customControlData Pointer to data structure to be pased to the callback.
		 **/
		void setControlDataCallback(std::function<bool(const char*, int, void*)> callback, void* customControlData=nullptr){
			customOnControlData = callback;
			userControlData = customControlData;
		};
		/**
		 * Set callback to parse binary data received from the client.
		 * @param callback: Callback to be called whenever new data is received.
		 * 	Takes a byte buffer, the size of the buffer and a pointer as parameters.
		 * 	The first two parameters are used for the data received on the web-socket.
		 *	The third parameter is used to access data structures pointed by the user.
		 *
		 * @param customBinaryData: Pointer to data structure to be pased to the callback.
		 **/

		void setBinaryDataCallback(std::function<bool(const char*, int, void*)> callback, void* customBinaryData=nullptr){
			customOnData = callback;
			userBinaryData = customBinaryData;
		};

		/**
		 * Sends a buffer (a vector) through the web-socket to the client with a given ID.
		 * @param bufferId Given buffer ID
		 * @param buffer Vector of arbitrary length and type
		 **/
		template<typename T, typename A>
		int sendBuffer(unsigned int bufferId, std::vector<T,A> & buffer);
		/**
		 * Sends a buffer (an array) through the web-socket to the client with a given ID.
		 * @param bufferId Given buffer ID
		 * @param buffer Array of arbitrary size and type
		 **/
		template <typename T, size_t N>
		int sendBuffer(unsigned int bufferId, T (&buffer)[N]);
		/**
		 * Sends a buffer (pointer) of specified length through the
		 * websocket to the client with a given ID.
		 * @param bufferId Buffer ID
		 * @param buffer Pointer to the location of memory to send
		 * @param count number of elements to send
		 */
		template <typename T>
		int sendBuffer(unsigned int bufferId, T* ptr, size_t count);
		/**
		 * Sends a single value through the web-socket to the client with a given ID.
		 * @param bufferId Given buffer ID
		 * @param value of arbitrary type
		 **/
		template <typename T>
		int sendBuffer(unsigned int bufferId, T value);
};

template<typename T, typename A>
int Gui::sendBuffer(unsigned int bufferId, std::vector<T,A> & buffer)
{
	const char* type = typeid(T).name();
	return doSendBuffer(type, bufferId, (const void*)buffer.data(), (buffer.size()*sizeof(T)));
}

template <typename T, size_t N>
int Gui::sendBuffer(unsigned int bufferId, T (&buffer)[N])
{
	const char* type = typeid(T).name();
	return doSendBuffer(type, bufferId, (const void*)buffer, N*sizeof(T));
}

template <typename T>
int Gui::sendBuffer(unsigned int bufferId, T* ptr, size_t count){
	const char* type = typeid(T).name();
	return doSendBuffer(type, bufferId, ptr, count * sizeof(T));
}

template <typename T>
int Gui::sendBuffer(unsigned int bufferId, T value)
{
	const char* type = typeid(T).name();
	return doSendBuffer(type, bufferId, (const void*)&value, sizeof(T));
}
