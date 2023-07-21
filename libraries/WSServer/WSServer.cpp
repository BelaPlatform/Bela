/***** WSServer.cpp *****/
#include "WSServer.h"
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
	std::set<seasocks::WebSocket*> connections;
	std::string address;
	std::function<void(const std::string&, const WSServerDetails*, const unsigned char*, size_t)> on_receive;
	std::function<void(const std::string&, const WSServerDetails*)> on_connect;
	std::function<void(const std::string&, const WSServerDetails*)> on_disconnect;
	bool binary;
	void onConnect(seasocks::WebSocket *socket) override {
		connections.insert(socket);
		if(on_connect) {
			on_connect(address, (WSServerDetails*)socket);
		}
	}
	void onData(seasocks::WebSocket *socket, const char *data) override {
		on_receive(address, (WSServerDetails*)socket, (const unsigned char*)data, std::strlen(data));
	}
	void onData(seasocks::WebSocket *socket, const uint8_t* data, size_t size) override {
		on_receive(address, (WSServerDetails*)socket, data, size);
	}
	void onDisconnect(seasocks::WebSocket *socket) override {
		connections.erase(socket);
		if (on_disconnect)
			on_disconnect(address, (WSServerDetails*)socket);
	}
};

// this is either called directly from sendNonRt(), or via callback when scheduled from sendRt()
void WSServer::client_task_func(std::shared_ptr<WSServerDataHandler> handler, const void* buf, unsigned int size){
	if(!handler)
		return;
	// make a copy of the data before we send it out
	if(handler->connections.size())
	{
			// make a copy of input data
			auto data = std::make_shared<std::vector<void*> >(size);
			memcpy(data->data(), buf, size);
			std::weak_ptr<WSServerDataHandler> wkHdl(handler);
			// schedule execution on the seasocks thread
			// passing in a weak_ptr
			(*handler->connections.begin())->server().execute([data, size, wkHdl]{
				auto handler = wkHdl.lock();
				if(!handler)
					return;
				for (auto c : handler->connections){
					if(handler->binary)
						c->send((uint8_t*) data->data(), size);
					else
						c->send((const char*)data->data());
				}
			});
		}
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

void WSServer::addAddress(const std::string& _address,
				std::function<void(const std::string&, const WSServerDetails*, const unsigned char*, size_t)> on_receive,
				std::function<void(const std::string&, const WSServerDetails*)> on_connect,
				std::function<void(const std::string&, const WSServerDetails*)> on_disconnect,
				bool binary)
{
	auto handler = std::make_shared<WSServerDataHandler>();
	handler->address = _address;
	handler->on_receive = on_receive;
	handler->on_connect = on_connect;
	handler->on_disconnect = on_disconnect;
	handler->binary = binary;
	server->addWebSocketHandler((std::string("/")+_address).c_str(), handler);
	
	address_book[_address] = {
		.thread = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT()),
		.handler = handler,
	};
	// do _not_ capture a shared_ptr in a lambda.
	// See possible pitfalls here
	// https://floating.io/2017/07/lambda-shared_ptr-memory-leak/
	std::weak_ptr<WSServerDataHandler> wkHdl(handler);
	address_book[_address].thread->create(std::string("WSClient_")+_address,
		[this,wkHdl](void* buf, int size){
			auto handler = wkHdl.lock();
			if(handler)
				client_task_func(handler, buf, size);
		});
}

int WSServer::sendNonRt(const char* _address, const char* str) {
	return sendNonRt(_address, (const void*)str, strlen(str) + 1);
}

int WSServer::sendNonRt(const char* _address, const void* buf, unsigned int size) {
	try {
		client_task_func(address_book.at(_address).handler, buf, size);
		return 0;
	} catch (std::exception&) {
		return -1;
	}
}

int WSServer::sendRt(const char* _address, const char* str){
	try {
		return address_book.at(_address).thread->schedule(str);
	} catch (std::exception&) {
		return -1;
	}
}

int WSServer::sendRt(const char* _address, const void* buf, unsigned int size){
	try {
		return address_book.at(_address).thread->schedule(buf, size);
	} catch (std::exception&) {
		return -1;
	}
}

void WSServer::cleanup(){
	server->terminate();
}
