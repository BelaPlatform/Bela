/***** WSServer.cpp *****/
#include <WSServer.h>
#include <seasocks/IgnoringLogger.h>
#include <seasocks/Server.h>
#include <seasocks/WebSocket.h>
#include <AuxTaskNonRT.h>
#include <cstring>

WSServer::WSServer(){}
WSServer::WSServer(int _port, std::string _address, void(*_callback)(void* buf, int size)){
	setup(_port, _address, _callback);
}
WSServer::~WSServer(){
	cleanup();
}

struct WSServerDataHandler : seasocks::WebSocket::Handler {
	std::shared_ptr<seasocks::Server> server;
	std::set<seasocks::WebSocket*> connections;
	void(*callback)(void* buf, int size);
	void onConnect(seasocks::WebSocket *socket) override {
		printf("connection!\n");
		connections.insert(socket);
	}
	void onData(seasocks::WebSocket *socket, const char *data) override {
		callback((void*)data, std::strlen(data));
	}
	void onData(seasocks::WebSocket *socket, const uint8_t* data, size_t size) override {
		callback((void*)data, size);
	}
	void onDisconnect(seasocks::WebSocket *socket) override {
		connections.erase(socket);
	}
};

void WSServer::server_task_func(void* ptr){
	WSServer* instance = (WSServer*)ptr;
	instance->server->serve("/dev/null", instance->port);
}

void WSServer::client_task_func(void* ptr, void* buf, int size){
	WSServerDataHandler* instance = (WSServerDataHandler*)ptr;
	instance->server->execute([instance, buf, size]{
		for (auto c : instance->connections){
			c->send((uint8_t*) buf, size);
		}
	});
}

void WSServer::setup(int _port, std::string _address, void(*_callback)(void* buf, int size)){
	port = _port;
	address = _address;
	
	auto logger = std::make_shared<seasocks::IgnoringLogger>();
	server = std::make_shared<seasocks::Server>(logger);
	
	addAddress(_address, _callback);
	
	server_task = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	server_task->create(std::string("WSServer_")+std::to_string(_port), WSServer::server_task_func, this);
	server_task->schedule();
}

void WSServer::addAddress(std::string _address, void(*_callback)(void* buf, int size)){
	auto handler = std::make_shared<WSServerDataHandler>();
	handler->server = server;
	handler->callback = _callback;
	server->addWebSocketHandler((std::string("/")+_address).c_str(), handler);
	
	address_book[_address] = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	address_book[_address]->create(std::string("WSClient_")+_address, WSServer::client_task_func, (void*)handler.get());
}

void WSServer::send(std::string str){
	address_book[address]->schedule(str.c_str());
}
void WSServer::send(std::string _address, std::string str){
	address_book[_address]->schedule(str.c_str());
}
void WSServer::send(void* buf, int num_bytes){
	address_book[address]->schedule(buf, num_bytes);
}
void WSServer::send(std::string _address, void* buf, int num_bytes){
	address_book[_address]->schedule(buf, num_bytes);
}

void WSServer::cleanup(){
	server->terminate();
}