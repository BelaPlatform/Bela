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

struct WSServerStreamHandler : seasocks::WebSocket::Handler {
	WSServer* instance;
	void onConnect(seasocks::WebSocket *socket) override 
		{ instance->stream_connections.insert(socket); }
	// void onData(WebSocket *, const char *data) override 
		// { for (auto c : connections) c->send(data); }
	void onDisconnect(seasocks::WebSocket *socket) override 
		{ instance->stream_connections.erase(socket); }
};

void WSServer::ws_server_task_func(void* ptr){
	printf("ws_server_task_func\n");
	WSServer* instance = (WSServer*)ptr;
	instance->server->serve("/dev/null", instance->port);
	printf("server terminated\n");
}

void WSServer::ws_client_task_func(void* ptr, void* buf, int size){
	WSServer* instance = (WSServer*)ptr;
	instance->server->execute([instance, buf, size]{
		for (auto c : instance->connections){
			c->send((uint8_t*) buf, size);
		}
	});
}

void WSServer::ws_stream_task_func(void* ptr, void* buf, int size){
	WSServer* instance = (WSServer*)ptr;
	instance->server->execute([instance, buf, size]{
		for (auto c : instance->stream_connections){
			c->send((uint8_t*) buf, size);
		}
	});
}

void WSServer::setup(int _port, std::string _address, void(*_callback)(void* buf, int size)){
	port = _port;
	address = _address;
	callback = _callback;
	
	auto logger = std::make_shared<seasocks::IgnoringLogger>();
	server = std::make_shared<seasocks::Server>(logger);
	
	handler = std::make_shared<WSServerDataHandler>();
	handler->instance = this;
	server->addWebSocketHandler(_address.c_str(), handler);
	
	ws_server_task = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	ws_server_task->create(std::string("WSServer_")+std::to_string(_port), WSServer::ws_server_task_func, this);
	ws_server_task->schedule();
	
	ws_client_task = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	ws_client_task->create(std::string("WSClient_")+std::to_string(_port), WSServer::ws_client_task_func, this);
}

void WSServer::streamTo(std::string _address, int stream_buffer_size){
	streamAddress = _address;

	streamBuffer.reserve(stream_buffer_size);
	
	stream_handler = std::make_shared<WSServerStreamHandler>();
	stream_handler->instance = this;
	server->addWebSocketHandler(_address.c_str(), stream_handler);
	
	ws_stream_task = std::unique_ptr<AuxTaskNonRT>(new AuxTaskNonRT());
	ws_stream_task->create(std::string("WSStream_")+std::to_string(port), WSServer::ws_stream_task_func, this);
}

void WSServer::send(std::string str){
	ws_client_task->schedule(str.c_str());
}
void WSServer::send(void* buf, int num_bytes){
	ws_client_task->schedule(buf, num_bytes);
}

void WSServer::stream(float data){
	streamBuffer.push_back(data);
	if (streamBuffer.size() >= streamBuffer.capacity()){
		ws_stream_task->schedule((void*)&streamBuffer[0], streamBuffer.size()*sizeof(float));
		streamBuffer.clear();
	}
}

void WSServer::cleanup(){
	printf("terminate\n");
	server->terminate();
}