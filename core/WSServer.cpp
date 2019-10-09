/***** WSServer.cpp *****/
#include <WSServer.h>
#include <seasocks/IgnoringLogger.h>
#include <seasocks/Server.h>
#include <seasocks/WebSocket.h>
#include <AuxTaskNonRT.h>
#include <cstring>

WSServer::WSServer(){}
WSServer::WSServer(int port){
	setup(port);
}
WSServer::~WSServer(){
	cleanup();
}

struct WSServerDataHandler : seasocks::WebSocket::Handler {
	std::shared_ptr<seasocks::Server> server;
	std::set<seasocks::WebSocket*> connections;
	std::string address;
	std::function<void(std::string, void*, int)> on_receive;
	std::function<void(std::string)> on_connect;
	std::function<void(std::string)> on_disconnect;
	bool binary;
	void onConnect(seasocks::WebSocket *socket) override {
		connections.insert(socket);
		if(on_connect)
			on_connect(address);
	}
	void onData(seasocks::WebSocket *socket, const char *data) override {
		on_receive(address, (void*)data, std::strlen(data));
	}
	void onData(seasocks::WebSocket *socket, const uint8_t* data, size_t size) override {
		on_receive(address, (void*)data, size);
	}
	void onDisconnect(seasocks::WebSocket *socket) override {
		connections.erase(socket);
		if (on_disconnect)
			on_disconnect(address);
	}
};

void WSServer::client_task_func(std::shared_ptr<WSServerDataHandler> handler, void* buf, int size){
	if (handler->binary){
		// make a copy of the data before we send it out
		auto data = std::make_shared<std::vector<void*> >(size);
		memcpy(data->data(), buf, size);
		handler->server->execute([handler, data, size]{
			for (auto c : handler->connections){
				c->send((uint8_t*) data->data(), size);
			}
		});
	} else {
		// make a copy of the data before we send it out
		std::string str = (const char*)buf;
		handler->server->execute([handler, str, size]{
			for (auto c : handler->connections){
				c->send(str.c_str());
			}
		});
	}
}

void WSServer::setup(int _port) {
	port = _port;
	
	auto logger = std::make_shared<seasocks::IgnoringLogger>();
	server = std::make_shared<seasocks::Server>(logger);

	server_task = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	server_task->create(std::string("WSServer_")+std::to_string(_port), [this](){ server->serve("/dev/null", port); });
	server_task->schedule();
}

void WSServer::addAddress(std::string _address, std::function<void(std::string, void*, int)> on_receive, std::function<void(std::string)> on_connect, std::function<void(std::string)> on_disconnect, bool binary){
	auto handler = std::make_shared<WSServerDataHandler>();
	handler->server = server;
	handler->address = _address;
	handler->on_receive = on_receive;
	handler->on_connect = on_connect;
	handler->on_disconnect = on_disconnect;
	handler->binary = binary;
	server->addWebSocketHandler((std::string("/")+_address).c_str(), handler);
	
	address_book[_address] = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	address_book[_address]->create(std::string("WSClient_")+_address, [this, handler](void* buf, int size){ client_task_func(handler, buf, size); });
}

int WSServer::send(const char* _address, const char* str){
	return address_book[_address]->schedule(str);
}
int WSServer::send(const char* _address, void* buf, int num_bytes){
	return address_book[_address]->schedule(buf, num_bytes);
}

void WSServer::cleanup(){
	server->terminate();
}
