#include "Gui.h"
#include <iostream>
#include <libraries/WSServer/WSServer.h>

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
	ws_server->addAddress(_addressData,
		[this](const std::string& address, const WSServerDetails* id, const unsigned char* buf, size_t size)
		{
			ws_onData(address, id, buf, size);
		},
	 nullptr, nullptr, true);

	ws_server->addAddress(_addressControl,
		// onData()
		[this](const std::string& address, const WSServerDetails* id,  const unsigned char* buf, size_t size)
		{
			ws_onControlData(address, id, buf, size);
		},
		// onConnect()
		[this](const std::string& address, const WSServerDetails* id)
		{
			ws_connect(address, id);
		},
		// onDisconnect()
		[this](const std::string& address, const WSServerDetails* id)
		{
			ws_disconnect(address, id);
		}
	);
	return 0;
}

int Gui::setup(std::string projectName, unsigned int port, std::string address)
{
	_projectName = std::wstring(projectName.begin(), projectName.end());
	setup(port, address);
	return 0;
}
/*
 * Called when websocket is connected.
 * Communication is started here with the server sending a 'connection' JSON object
 * with initial settings.
 * The client replies with 'connection-reply', which should be parsed accordingly.
 */
void Gui::ws_connect(const std::string& address, const WSServerDetails* id)
{
	// TODO: this is currently sent to all clients, but it should only be sent to the new one
	// send connection JSON
	JSONObject root;
	root[L"event"] = new JSONValue(L"connection");
	if(!_projectName.empty())
		root[L"projectName"] = new JSONValue(_projectName);
	JSONValue *value = new JSONValue(root);
	sendControl(value, WSServer::kThreadCallback);
	delete value;
}

/*
 * Called when websocket is disconnected.
 *
 */
void Gui::ws_disconnect(const std::string& address, const WSServerDetails* id)
{
	if(wsConnections.count(id))
		wsConnections.erase(id);
}

/*
 *  on_data callback for gui_control websocket
 *  runs on the (linux priority) seasocks thread
 */
void Gui::ws_onControlData(const std::string& address, const WSServerDetails* id, const unsigned char* data, unsigned int size)
{
	// parse the data into a JSONValue
	JSONValue *value = JSON::Parse((const char*)data);
	if (value == NULL || !value->IsObject()){
		fprintf(stderr, "Could not parse JSON:\n%s\n", data);
		return;
	}
	// look for the "event" key
	JSONObject root = value->AsObject();
	if(customOnControlData && !customOnControlData(root, controlCallbackArg))
	{
		delete value;
		return;
	}
	if (root.find(L"event") != root.end() && root[L"event"]->IsString()){
		std::wstring event = root[L"event"]->AsString();
		if (event.compare(L"connection-reply") == 0){
			if(!wsConnections.count(id))
				wsConnections.insert(id);
		}
	}
	delete value;
	return;
}

void Gui::ws_onData(const std::string& address, const WSServerDetails* id, const unsigned char* data, size_t size)
{
	if(customOnData && !customOnData(address, id, data, size, binaryCallbackArg))
	{
		return;
	}
	else
	{
		uint32_t bufferId = *(uint32_t*) data;
		data += sizeof(uint32_t);
		char bufferType = *data;
		data += sizeof(uint32_t);
		uint32_t bufferLength = *(uint32_t*) data;
		uint32_t numBytes = (bufferType == 'c' ? bufferLength : bufferLength * sizeof(float));
		data += 2*sizeof(uint32_t);
		if(bufferId < _buffers.size())
		{
			if(bufferType != _buffers[bufferId].getType())
			{
				fprintf(stderr, "Buffer %d: received buffer type (%c) doesn't match original buffer type (%c).\n", bufferId, bufferType, _buffers[bufferId].getType());
			}
			else
			{
				if(numBytes > _buffers[bufferId].getCapacity())
				{
					fprintf(stderr, "Buffer %d: size of received buffer (%d bytes) exceeds that of the original buffer (%d bytes). The received data will be trimmed.\n", bufferId, numBytes, _buffers[bufferId].getCapacity());
					numBytes = _buffers[bufferId].getCapacity();
				}
				// Copy data to buffers
				getDataBuffer(bufferId).getBuffer()->assign(data, data + numBytes);
			}
		}
		else
		{
			fprintf(stderr, "Received buffer ID %d is out of range.\n", bufferId);
		}
	}
	return;
}

// BUFFERS
unsigned int Gui::setBuffer(char bufferType, unsigned int size)
{
	unsigned int buffId = _buffers.size();
	_buffers.emplace_back(bufferType, size);
	return buffId;
}

DataBuffer& Gui::getDataBuffer( unsigned int bufferId )
{
	if(bufferId >= _buffers.size())
		throw std::runtime_error((std::string("Buffer ID ")+std::to_string((int)bufferId)+std::string(" is out of range.\n")).c_str());

	return _buffers[bufferId];
}

Gui::~Gui()
{
	cleanup();
	// trigger the destruction of the server so that ws_disconnect is called
	// while the object is still valid
	ws_server.reset();
}
void Gui::cleanup()
{
}

int Gui::sendControl(JSONValue* root, WSServer::CallingThread callingThread) {
    std::wstring wide = JSON::Stringify(root);
    std::string str(wide.begin(), wide.end());
    return ws_server->sendNonRt(_addressControl.c_str(), str.c_str(), callingThread);
}

int Gui::doSendBuffer(const char* type, unsigned int bufferId, const void* data, size_t size)
{
	std::string idTypeStr = std::to_string(bufferId) + "/" + std::string(type);
	int ret;
	if(0 == (ret = ws_server->sendRt(_addressData.c_str(), idTypeStr.c_str())))
                    if(0 == (ret = ws_server->sendRt(_addressData.c_str(), (void*)data, size)))
                            return 0;
	rt_fprintf(stderr, "You are sending messages to the GUI too fast. Please slow down\n");
	return ret;
}
