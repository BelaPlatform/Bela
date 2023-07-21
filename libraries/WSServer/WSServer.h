#pragma once
#include <string>
#include <memory>
#include <set>
#include <map>
#include <vector>
#include <functional>

// forward declarations for faster render.cpp compiles
namespace seasocks{
	class Server;
	class WebSocket;
}
class AuxTaskNonRT;
struct WSServerDataHandler;
class WSServerDetails;

class WSServer{
	friend struct WSServerDataHandler;
	public:
		enum CallingThread {
			kThreadCallback,
			kThreadOther,
		};
		WSServer();
		WSServer(int _port);
		~WSServer();
		
		void setup(int port);

		void addAddress(const std::string& address,
				std::function<void(const std::string&, const WSServerDetails*, const unsigned char*, size_t)> on_receive = nullptr,
				std::function<void(const std::string&, const WSServerDetails*)> on_connect = nullptr,
				std::function<void(const std::string&, const WSServerDetails*)> on_disconnect = nullptr,
				bool binary = false);
		
		int sendNonRt(const char* address, const char* str, CallingThread callingThread = kThreadOther);
		int sendNonRt(const char* address, const void* buf, unsigned int size, CallingThread callingThread = kThreadOther);
		int sendRt(const char* address, const char* str);
		int sendRt(const char* address, const void* buf, unsigned int size);
		
	private:
		void cleanup();
		
		int port;
		std::string address;
		std::shared_ptr<seasocks::Server> server;
		
		struct AddressBookItem {
			std::unique_ptr<AuxTaskNonRT> thread;
			std::shared_ptr<WSServerDataHandler> handler;
		};
		std::map<std::string, AddressBookItem> address_book;
		std::unique_ptr<AuxTaskNonRT> server_task;
		
		void sendToAllConnections(std::shared_ptr<WSServerDataHandler> handler, const void* buf, unsigned int size, CallingThread callingThread);
};
