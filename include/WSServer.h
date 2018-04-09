/***** WSServer.h *****/
#include <string>
#include <memory>
#include <set>
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
		~WSServer();
		
		void setup(int port, std::string address, void(*on_receive)(void* buf, int size));
		
		void streamTo(std::string address, int size = WSSERVER_STREAM_BUFFERSIZE);
		
		void send(std::string str);
		void send(void* buf, int num_bytes);
		
		void stream(float data);
		
	private:
		void cleanup();
		
		int port;
		std::string address;
		std::shared_ptr<seasocks::Server> server;
		std::shared_ptr<WSServerDataHandler> handler;
		std::set<seasocks::WebSocket*> connections;
		
		std::string streamAddress;
		std::vector<float> streamBuffer;
		std::shared_ptr<WSServerStreamHandler> stream_handler;
		std::set<seasocks::WebSocket*> stream_connections;
		
		std::unique_ptr<AuxTaskNonRT> ws_server_task;
		static void ws_server_task_func(void* ptr);
		void(*callback)(void* buf, int size);
		
		std::unique_ptr<AuxTaskNonRT> ws_client_task;
		static void ws_client_task_func(void* ptr, void* buf, int size);
		
		std::unique_ptr<AuxTaskNonRT> ws_stream_task;
		static void ws_stream_task_func(void* ptr, void* buf, int size);
};