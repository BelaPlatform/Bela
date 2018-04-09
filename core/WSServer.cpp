/***** WSServer.cpp *****/
#include <WSServer.h>
#include <seasocks/PrintfLogger.h>
#include <seasocks/Server.h>
#include <seasocks/WebSocket.h>
#include <AuxTaskNonRT.h>
#include <cstring>

WSServer::WSServer(){}
WSServer::~WSServer(){
	cleanup();
}

struct WSServerDataHandler : seasocks::WebSocket::Handler {
	std::set<seasocks::WebSocket*> connections;
	WSServer* instance;
	void onConnect(seasocks::WebSocket *socket) override {
		printf("connection!\n");
		connections.insert(socket);
	}
	void onData(seasocks::WebSocket *socket, const char *data) override {
		instance->callback((void*)data, std::strlen(data));
	}
	void onData(seasocks::WebSocket *socket, const uint8_t* data, size_t size) override {
		instance->callback((void*)data, size);
	}
	void onDisconnect(seasocks::WebSocket *socket) override {
		connections.erase(socket);
	}
};

void WSServer::ws_server_task_func(void* ptr){
	printf("ws_server_task_func\n");
	WSServer* instance = (WSServer*)ptr;
	
	auto logger = std::make_shared<seasocks::PrintfLogger>();
	instance->server = std::make_shared<seasocks::Server>(logger);
	
	instance->handler = std::make_shared<WSServerDataHandler>();
	instance->handler->instance = instance;
	instance->server->addWebSocketHandler(instance->address.c_str(), instance->handler);
	
	instance->server->serve("/dev/null", instance->port);
	printf("server terminated\n");
}

void WSServer::setup(int _port, std::string _address, void(*_callback)(void* buf, int size)){
	port = _port;
	address = _address;
	callback = _callback;
	
	ws_server_task = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	ws_server_task->create(std::string("WSServer_")+std::to_string(_port), WSServer::ws_server_task_func, this);
	ws_server_task->schedule();
}

void WSServer::cleanup(){
	printf("terminate\n");
	server->terminate();
}