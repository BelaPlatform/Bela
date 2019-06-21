#include <vector>
#include <string>
#include <memory>
#include <WSServer.h>
#include <JSON.h>
#include <typeinfo> // for types in templates
#include <DataBuffer.h>


// forward declarations
class WSServer;
class JSONValue;
class AuxTaskRT;
class DataBuffer;

class Gui
{
	private:

		std::vector<DataBuffer> _buffers;
		std::unique_ptr<WSServer> ws_server;

		bool wsIsConnected = false;
		bool guiIsReady = false;

		void ws_connect();
		void ws_disconnect();
		void ws_onControlData(const char* data, int size);
		void ws_onData(const char* data, int size);

		unsigned int _port;
		std::string _addressControl;
		std::string _addressData;
		std::wstring _projectName;

		unsigned int getBufferCapacity( unsigned int bufferId ){ return _buffers[bufferId].getCapacity(); };


		// User defined functions
		std::function<bool(const char*, int, void*)> customOnControlData;
		std::function<bool(const char*, int, void*)> customOnData;

		void* userControlData = nullptr;
		void* userBinaryData = nullptr;

	public:
		Gui();
		Gui(unsigned int port, std::string address);
		~Gui();

		int setup(unsigned int port, std::string address);
		int setup(unsigned int port, std::string address, std::string projectName);
		void cleanup();

		bool isConnected(){ return wsIsConnected; };

		bool isReady(){ return guiIsReady; };


		// BUFFERS
		// Returns buffer ID
		// Such ID is generated automatically based on the number of buffers
		unsigned int setBuffer(char bufferType, unsigned int size);

		std::vector<char>*  getBufferById( unsigned int bufferId );

		char* getBufferAsChar( unsigned int bufferId );

		int* getBufferAsInt( unsigned int bufferId );

		float* getBufferAsFloat( unsigned int bufferId );

		char getBufferType( unsigned int bufferId );

		int getBufferLen( unsigned int bufferId );

		int getNumBytes( unsigned int bufferId );


		void setControlDataCallback(std::function<bool(const char*, int, void*)> callback, void* customControlData=nullptr){
			customOnControlData = callback;
			userControlData = customControlData;
		};
		void setBinaryDataCallback(std::function<bool(const char*, int, void*)> callback, void* customBinaryData=nullptr){
			customOnData = callback;
			userBinaryData = customBinaryData;
		};


		template<typename T, typename A>
		void sendBuffer(unsigned int bufferId, std::vector<T,A> & buffer);

		template<typename T>
		void sendBuffer(unsigned int bufferId, T buffer);

};

template<typename T, typename A>
void Gui::sendBuffer(unsigned int bufferId, std::vector<T,A> & buffer)
{
	std::string bufferStr = std::to_string(bufferId);
	ws_server->send(_addressData.c_str(), bufferStr.c_str());
	const char* type = typeid(T).name();
	ws_server->send(_addressData.c_str(), type);
	ws_server->send(_addressData.c_str(), buffer.data(), (int)(buffer.size()*sizeof(T)));
}
