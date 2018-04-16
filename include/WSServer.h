/***** WSServer.h *****/
#include <string>
#include <memory>
#include <set>
#include <map>
#include <vector>

#define WSSERVER_STREAM_BUFFERSIZE 1024

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
		WSServer(int _port, std::string _address, std::function<void(std::string, void*, int)> on_receive = nullptr, std::function<void(std::string)> on_connect = nullptr, std::function<void(std::string)> on_disconnect = nullptr, bool binary = false);
		~WSServer();
		
		void setup(int port, std::string address, std::function<void(std::string, void*, int)> on_receive = nullptr, std::function<void(std::string)> on_connect = nullptr, std::function<void(std::string)> on_disconnect = nullptr, bool binary = false);
		
		void addAddress(std::string address, std::function<void(std::string, void*, int)> on_receive = nullptr, std::function<void(std::string)> on_connect = nullptr, std::function<void(std::string)> on_disconnect = nullptr, bool binary = false);
		
		void send(std::string str);
		void send(std::string address, std::string str);
		void send(void* buf, int num_bytes);
		void send(std::string address, void* buf, int num_bytes);
		
	private:
		void cleanup();
		
		int port;
		std::string address;
		std::shared_ptr<seasocks::Server> server;
		
		std::map<std::string, std::unique_ptr<AuxTaskNonRT>> address_book;
		std::unique_ptr<AuxTaskNonRT> server_task;
		
		void client_task_func(std::shared_ptr<WSServerDataHandler> handler, void* buf, int size);
};