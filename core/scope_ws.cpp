/***** scope_ws.cpp *****/
#include <seasocks/PrintfLogger.h>
#include <seasocks/Server.h>
#include <seasocks/WebSocket.h>
#include <memory>
#include <Aux_Task.h>

#define SCOPE_DATA_PORT 5432

static Aux_Task<> ws_server_task;
static seasocks::Server* server;
static std::set<seasocks::WebSocket *> connections;

struct MyHandler : seasocks::WebSocket::Handler {
	void onConnect(seasocks::WebSocket *socket) override 
		{ connections.insert(socket); }
	void onData(seasocks::WebSocket *, const char *data) override 
		{ for (auto c : connections) c->send(data); }
	void onDisconnect(seasocks::WebSocket *socket) override 
		{ connections.erase(socket); }
};

class Exec: public seasocks::Server::Runnable{
		void run(){
			for (auto c : connections) c->send(data, size);
		}
	public:
		uint8_t* data;
		size_t size;
};

void ws_server_task_func(const char* buf, int size){
	auto logger = std::make_shared<seasocks::PrintfLogger>();
	seasocks::Server _server(logger);
	server = &_server;
	server->addWebSocketHandler("/scope_data", std::make_shared<MyHandler>());
	server->serve("/dev/null", SCOPE_DATA_PORT);
}

void scope_ws_setup(){
	ws_server_task.create("ws_server_task", ws_server_task_func);
	ws_server_task.schedule();
}

void scope_ws_send(float* buf, int size){
	auto runnable = std::make_shared<Exec>();
	runnable->data = (uint8_t*)buf;
	runnable->size = size*sizeof(float);
	server->execute(runnable);
}