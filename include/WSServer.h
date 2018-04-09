/***** WSServer.h *****/
#include <string>
#include <memory>

// forward declarations for faster render.cpp compiles
namespace seasocks{
	class Server;
}
class AuxTaskNonRT;
struct WSServerDataHandler;

class WSServer{
	friend struct WSServerDataHandler;
	public:
		WSServer();
		~WSServer();
		
		void setup(int port, std::string address, void(*on_receive)(void* buf, int size));
		
	private:
		void cleanup();
		
		int port;
		std::string address;
		std::shared_ptr<seasocks::Server> server;
		std::shared_ptr<WSServerDataHandler> handler;
		
		std::unique_ptr<AuxTaskNonRT> ws_server_task;
		static void ws_server_task_func(void* ptr);
		void(*callback)(void* buf, int size);
};