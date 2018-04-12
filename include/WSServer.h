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
struct WSServerStreamHandler;

class WSServer{
	friend struct WSServerDataHandler;
	friend struct WSServerStreamHandler;
	public:
		WSServer();
		WSServer(int _port, std::string _address, void(*_callback)(void* buf, int size));
		~WSServer();
		
		void setup(int port, std::string address, void(*on_receive)(void* buf, int size));
		
		void addAddress(std::string address, void(*on_receive)(void* buf, int size));
		
		void send(std::string str);
		void send(std::string address, std::string str);
		void send(void* buf, int num_bytes);
		void send(std::string address, void* buf, int num_bytes);
		
		void stream(float data);
		
	private:
		void cleanup();
		
		int port;
		std::string address;
		std::shared_ptr<seasocks::Server> server;
		
		std::map<std::string, std::unique_ptr<AuxTaskNonRT>> address_book;
		std::unique_ptr<AuxTaskNonRT> server_task;
		
		static void server_task_func(void* ptr);
		static void client_task_func(void* ptr, void* buf, int size);
};