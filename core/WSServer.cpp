/***** WSServer.cpp *****/
#include <WSServer.h>
#include <seasocks/IgnoringLogger.h>
#include <seasocks/Server.h>
#include <seasocks/WebSocket.h>
#include <AuxTaskNonRT.h>
#include <cstring>

WSServer::WSServer(){}
WSServer::~WSServer(){
	cleanup();
}

struct WSServerDataHandler : seasocks::WebSocket::Handler {
	WSServer* instance;
	void onConnect(seasocks::WebSocket *socket) override {
		printf("connection!\n");
		instance->connections.insert(socket);
	}
	void onData(seasocks::WebSocket *socket, const char *data) override {
		instance->callback((void*)data, std::strlen(data));
	}
	void onData(seasocks::WebSocket *socket, const uint8_t* data, size_t size) override {
		instance->callback((void*)data, size);
	}
	void onDisconnect(seasocks::WebSocket *socket) override {
		instance->connections.erase(socket);
	}
};

void WSServer::ws_server_task_func(void* ptr){
	printf("ws_server_task_func\n");
	WSServer* instance = (WSServer*)ptr;
	
	auto logger = std::make_shared<seasocks::IgnoringLogger>();
	instance->server = std::make_shared<seasocks::Server>(logger);
	
	instance->handler = std::make_shared<WSServerDataHandler>();
	instance->handler->instance = instance;
	instance->server->addWebSocketHandler(instance->address.c_str(), instance->handler);
	
	instance->server->serve("/dev/null", instance->port);
	printf("server terminated\n");
}

void WSServer::ws_client_task_func(void* ptr, void* buf, int size){
	// printf("ws_client_task_func\n");
	WSServer* instance = (WSServer*)ptr;
	instance->server->execute([instance, buf, size]{
		// printf("HELLO\n");
		for (auto c : instance->connections){
			c->send((uint8_t*) buf, size);
		}
	});
	// printf("ws_client_task_func done\n");
}

void WSServer::setup(int _port, std::string _address, void(*_callback)(void* buf, int size)){
	port = _port;
	address = _address;
	callback = _callback;
	
	ws_server_task = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	ws_server_task->create(std::string("WSServer_")+std::to_string(_port), WSServer::ws_server_task_func, this);
	ws_server_task->schedule();
	
	ws_client_task = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	ws_client_task->create(std::string("WSClient_")+std::to_string(_port), WSServer::ws_client_task_func, this);
}

void WSServer::send(std::string str){
	ws_client_task->schedule(str.c_str());
}
void WSServer::send(void* buf, int num_bytes){
	ws_client_task->schedule(buf, num_bytes);
}

void WSServer::cleanup(){
	printf("terminate\n");
	server->terminate();
}