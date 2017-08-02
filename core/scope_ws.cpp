/***** scope_ws.cpp *****/
#include <seasocks/IgnoringLogger.h>
#include <seasocks/Server.h>
#include <seasocks/WebSocket.h>
#include <memory>
#include <Scope.h>
#include <JSON.h>

#define SCOPE_WS_PORT 5432

static Aux_Task ws_server_task;
static Scope* scope;
static seasocks::Server* server;
static std::set<seasocks::WebSocket *> dataConnections;
static std::set<seasocks::WebSocket *> controlConnections;
std::vector<std::string> sliders;
std::vector<std::string> settings;

struct ScopeDataHandler : seasocks::WebSocket::Handler {
	void onConnect(seasocks::WebSocket *socket) override 
		{ dataConnections.insert(socket); }
	void onData(seasocks::WebSocket *, const char *data) override 
		{ for (auto c : dataConnections) c->send(data); }
	void onDisconnect(seasocks::WebSocket *socket) override 
		{ dataConnections.erase(socket); }
};
struct ScopeControlHandler : seasocks::WebSocket::Handler {
	// methods called by seasocks
	void onConnect(seasocks::WebSocket *socket) override 
		{
			controlConnections.insert(socket);
			for (auto setting : settings){
				socket->send(setting);
			}
			JSONObject root;
			root[L"event"] = new JSONValue(L"connection");
			root[L"numChannels"] = new JSONValue(scope->numChannels);
			root[L"sampleRate"] = new JSONValue(scope->sampleRate);
			root[L"numSliders"] = new JSONValue(scope->numSliders);
			JSONValue *value = new JSONValue(root);
			// std::wcout << "constructed JSON: " << value->Stringify().c_str() << "\n";
			std::wstring wide = value->Stringify().c_str();
			std::string str( wide.begin(), wide.end() );
			socket->send(str);
			for (auto slider : sliders){
				socket->send(slider);
			}
		}
	void onData(seasocks::WebSocket *, const char *data) override 
		{
			// printf("recieved: %s\n", data);
			JSONValue *value = JSON::Parse(data);
			if (value == NULL || !value->IsObject()){
				printf("could not parse JSON:\n%s\n", data);
				return;
			}
			
			JSONObject root = value->AsObject();
			if (root.find(L"event") != root.end() && root[L"event"]->IsString()){
				std::wstring event = root[L"event"]->AsString();
				// std::wcout << "event: " << event << "\n";
				if (event.compare(L"connection-reply") == 0){
					startScope(root);
				} else if (event.compare(L"slider") == 0){
					setSlider(root);
				}
				return;
			}
			
			std::vector<std::wstring> keys = value->ObjectKeys();
			for (auto key : keys){
				JSONValue *key_value = value->Child(key.c_str());
				if (key_value->IsNumber())
					scope->setSetting(key, (float)key_value->AsNumber());
			}

		}
	void onDisconnect(seasocks::WebSocket *socket) override 
		{
			controlConnections.erase(socket); 
			scope->stop();
		}
	// methods NOT called by seasocks
	void startScope(JSONObject json){
		
		if (scope->started)
			scope->stop();
		
		if (json.find(L"frameWidth") != json.end() && json[L"frameWidth"]->IsNumber())
			scope->pixelWidth = (int)json[L"frameWidth"]->AsNumber();
		
		if (json.find(L"plotMode") != json.end() && json[L"plotMode"]->IsNumber())
			scope->plotMode = (int)json[L"plotMode"]->AsNumber();
			
		if (json.find(L"triggerMode") != json.end() && json[L"triggerMode"]->IsNumber())
			scope->triggerMode = (int)json[L"triggerMode"]->AsNumber();
			
		if (json.find(L"triggerChannel") != json.end() && json[L"triggerChannel"]->IsNumber())
			scope->triggerChannel = (int)json[L"triggerChannel"]->AsNumber();
			
		if (json.find(L"triggerDir") != json.end() && json[L"triggerDir"]->IsNumber())
			scope->triggerDir = (int)json[L"triggerDir"]->AsNumber();
			
		if (json.find(L"triggerLevel") != json.end() && json[L"triggerLevel"]->IsNumber())
			scope->triggerLevel = (float)json[L"triggerLevel"]->AsNumber();
			
		if (json.find(L"xOffset") != json.end() && json[L"xOffset"]->IsNumber())
			scope->xOffset = (int)json[L"xOffset"]->AsNumber();
			
		if (json.find(L"upSampling") != json.end() && json[L"upSampling"]->IsNumber())
			scope->upSampling = (int)json[L"upSampling"]->AsNumber();
			
		if (json.find(L"downSampling") != json.end() && json[L"downSampling"]->IsNumber())
			scope->downSampling = (int)json[L"downSampling"]->AsNumber();
			
		if (json.find(L"holdOff") != json.end() && json[L"holdOff"]->IsNumber())
			scope->holdOff = (float)json[L"holdOff"]->AsNumber();
			
		if (json.find(L"FFTLength") != json.end() && json[L"FFTLength"]->IsNumber())
			scope->newFFTLength = (int)json[L"FFTLength"]->AsNumber();
			
		if (json.find(L"FFTXAxis") != json.end() && json[L"FFTXAxis"]->IsNumber())
			scope->FFTXAxis = (int)json[L"FFTXAxis"]->AsNumber();
			
		if (json.find(L"FFTYAxis") != json.end() && json[L"FFTYAxis"]->IsNumber())
			scope->FFTYAxis = (int)json[L"FFTYAxis"]->AsNumber();
			
		scope->setXParams();
		scope->setPlotMode();
		scope->start();
		
	}
	void setSlider(JSONObject json){
		int slider = -1;
		float value = 0.0f;
		if (json.find(L"slider") != json.end() && json[L"slider"]->IsNumber())
			slider = (int)json[L"slider"]->AsNumber();
		if (json.find(L"value") != json.end() && json[L"value"]->IsNumber())
			value = (float)json[L"value"]->AsNumber();
			
		if (slider >= 0 && slider < scope->numSliders){
			scope->sliders[slider].value = value;
			scope->sliders[slider].changed = true;
		}
	}
};

void ws_server_task_func(){
	auto logger = std::make_shared<seasocks::IgnoringLogger>();
	seasocks::Server _server(logger);
	server = &_server;
	server->addWebSocketHandler("/scope_data", std::make_shared<ScopeDataHandler>());
	server->addWebSocketHandler("/scope_control", std::make_shared<ScopeControlHandler>());
	server->serve("/dev/null", SCOPE_WS_PORT);
}

void scope_ws_setup(Scope* _scope){
	scope = _scope;
	ws_server_task.create("ws_server_task", ws_server_task_func);
	ws_server_task.schedule();
}

class ScopeSendBufferRunnable: public seasocks::Server::Runnable{
		void run(){
			for (auto c : dataConnections) c->send(data, size);
		}
	public:
		uint8_t* data;
		size_t size;
};

void scope_ws_send(void* buf, int size){
	auto runnable = std::make_shared<ScopeSendBufferRunnable>();
	runnable->data = (uint8_t*)buf;
	runnable->size = size;
	// printf("sending buffer size: %i\n", size/sizeof(float));
	server->execute(runnable);
}

void scope_ws_set_slider(int slider, float min, float max, float step, float value, std::string name){
	std::wstring wname(name.begin(), name.end());
	JSONObject root;
	root[L"event"] = new JSONValue(L"set-slider");
	root[L"slider"] = new JSONValue(slider);
	root[L"min"] = new JSONValue(min);
	root[L"max"] = new JSONValue(max);
	root[L"step"] = new JSONValue(step);
	root[L"value"] = new JSONValue(value);
	root[L"name"] = new JSONValue(wname);
	JSONValue *json = new JSONValue(root);
	// std::wcout << "constructed JSON: " << json->Stringify().c_str() << "\n";
	std::wstring wide = json->Stringify().c_str();
	std::string str( wide.begin(), wide.end() );
	sliders.push_back(str);
}

void scope_ws_set_setting(std::wstring setting, float value){
	JSONObject root;
	root[L"event"] = new JSONValue(L"set-setting");
	root[L"setting"] = new JSONValue(setting);
	root[L"value"] = new JSONValue(value);
	JSONValue *json = new JSONValue(root);
	std::wstring wide = json->Stringify().c_str();
	std::string str( wide.begin(), wide.end() );
	// std::wcout << "constructed JSON: " << json->Stringify().c_str() << "\n";
	settings.push_back(str);
}

void scope_ws_cleanup(){
	ws_server_task.cleanup();
}

