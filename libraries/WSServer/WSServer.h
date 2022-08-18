/***** WSServer.h *****/
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

class WSServer{
	friend struct WSServerDataHandler;
	public:
		WSServer();
		WSServer(int _port);
		~WSServer();
		
		void setup(int port);

		void addAddress(std::string address, std::function<void(std::string, void*, int)> on_receive = nullptr, std::function<void(std::string)> on_connect = nullptr, std::function<void(std::string)> on_disconnect = nullptr, bool binary = false);
		
		int sendNonRt(const char* address, const char* str);
		int sendNonRt(const char* address, const void* buf, unsigned int size);
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
		
		void client_task_func(std::shared_ptr<WSServerDataHandler> handler, const void* buf, unsigned int size);
};
