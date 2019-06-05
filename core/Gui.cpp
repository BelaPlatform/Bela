#include <Gui.h>
#include <memory> // for shared pointers

Gui::Gui()
{
}
Gui::Gui(unsigned int port, std::string address)
{
	setup(port, address);
}

int Gui::setup(unsigned int port, std::string address)
{
	_port = port;
	_addressData = address+"_data";
	_addressControl = address+"_control";

	// Set up the websocket server
	ws_server = std::unique_ptr<WSServer>(new WSServer());
	ws_server->setup(port);
	ws_server->addAddress(_addressData, nullptr, nullptr, nullptr, true);

	ws_server->addAddress(_addressControl,
		// onData()
		[this](std::string address, void* buf, int size)
		{
			ws_onData((const char*) buf);
		},
		// onConnect()
		[this](std::string address)
		{
			ws_connect();
		},
		// onDisconnect()
		[this](std::string address)
		{
			ws_disconnect();
		}
	);
	return 0;
}

int Gui::setup(unsigned int port, std::string address, std::string projectName)
{
	_port = port;
	_addressData = address+"_data";
	_addressControl = address+"_control";
	_projectName = std::wstring(projectName.begin(), projectName.end());

	// Set up the websocket server
	ws_server = std::unique_ptr<WSServer>(new WSServer());
	ws_server->setup(port);
	ws_server->addAddress(_addressData, nullptr, nullptr, nullptr, true);

	ws_server->addAddress(_addressControl,
		// onData()
		[this](std::string address, void* buf, int size)
		{
			ws_onData((const char*) buf);
		},
		// onConnect()
		[this](std::string address)
		{
			ws_connect();
		},
		// onDisconnect()
		[this](std::string address)
		{
			ws_disconnect();
		}
	);
	return 0;
}
/*
 * Called when websocket is connected.
 * Communication is started here with the server sending a 'connection' JSON object
 * with initial settings.
 * The client replies with 'connection-ack', which should be parsed accordingly.
 */
void Gui::ws_connect()
{
	// send connection JSON 
	JSONObject root;
	root[L"event"] = new JSONValue(L"connection");
	if(!_projectName.empty())
		root[L"projectName"] = new JSONValue(_projectName);

	// Parse whatever needs to be parsed on connection

	JSONValue *value = new JSONValue(root);
	std::wstring wide = value->Stringify().c_str();
	std::string str( wide.begin(), wide.end() );
	ws_server->send(_addressControl.c_str(), str.c_str());

	delete value;
}

/*
 * Called when websocket is disconnected.
 *
 */
void Gui::ws_disconnect()
{
	wsIsConnected = false;
}

/*
 *  on_data callback for scope_control websocket
 *  runs on the (linux priority) seasocks thread
 */
void Gui::ws_onData(const char* data)
{
	
	// parse the data into a JSONValue
	JSONValue *value = JSON::Parse(data);
	if (value == NULL || !value->IsObject()){
		printf("could not parse JSON:\n%s\n", data);
		return;
	}
	// look for the "event" key
	JSONObject root = value->AsObject();
	if (root.find(L"event") != root.end() && root[L"event"]->IsString()){
		std::wstring event = root[L"event"]->AsString();
		printf("%ls\n", event.c_str());
		if (event.compare(L"connection-reply") == 0){
			wsIsConnected = true;
		} else if (event.compare(L"gui-ready") == 0){
			guiIsReady = true;
		}
	}
	delete value;
	return;
}

Gui::~Gui()
{
	cleanup();
}
void Gui::cleanup()
{
}
