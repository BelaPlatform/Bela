#include <vector>
#include <string>
#include <memory>
#include <WSServer.h>
#include <JSON.h>
#include <typeinfo> // for types in templates

// forward declarations
class WSServer;
class JSONValue;
class AuxTaskRT;

class Gui
{
	private:

		std::unique_ptr<WSServer> ws_server;

		bool wsIsConnected = false;
		bool guiIsReady = false;

		void ws_connect();
		void ws_disconnect();
		void ws_onData(const char* data);
		
		unsigned int _port;
		std::string _addressControl;
		std::string _addressData;
		std::wstring _projectName;

	public:
		Gui();
		Gui(unsigned int port, std::string address);
		~Gui();

		int setup(unsigned int port, std::string address);
		int setup(unsigned int port, std::string address, std::string projectName);
		void cleanup();
		
		bool isConnected()
	       	{
			return wsIsConnected;
		};
		
		bool isReady()
		{
			return guiIsReady;
		};


		// BUFFERS
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
