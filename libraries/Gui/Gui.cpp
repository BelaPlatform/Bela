#include "Gui.h"
#include <memory> // for shared pointers
#include <iostream>

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
		[this](std::string address, void* buf, int size)
		{
			ws_onData((const char*) buf, size);
		},
	 nullptr, nullptr, true);

	ws_server->addAddress(_addressControl,
		// onData()
		[this](std::string address, void* buf, int size)
		{
			ws_onControlData((const char*) buf, size);
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
void Gui::ws_onControlData(const char* data, int size)
{
	if(customOnControlData && !customOnControlData(data, size, userControlData))
	{
		return;
	}
	else
	{
		// parse the data into a JSONValue
		JSONValue *value = JSON::Parse(data);
		if (value == NULL || !value->IsObject()){
			fprintf(stderr, "Could not parse JSON:\n%s\n", data);
			return;
		}
		// look for the "event" key
		JSONObject root = value->AsObject();
		if (root.find(L"event") != root.end() && root[L"event"]->IsString()){
			std::wstring event = root[L"event"]->AsString();
			if (event.compare(L"connection-reply") == 0){
				wsIsConnected = true;
			}
		}
		delete value;
	}
	return;
}

void Gui::ws_onData(const char* data, int size)
{
	if(customOnData && !customOnData(data, size, userBinaryData))
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
}
void Gui::cleanup()
{
}

int Gui::doSendBuffer(const char* type, unsigned int bufferId, const void* data, size_t size)
{
	std::string bufferStr = std::to_string(bufferId);
	int ret;
	if(0 == (ret = ws_server->send(_addressData.c_str(), bufferStr.c_str())))
		if(0 == (ret = ws_server->send(_addressData.c_str(), (void*)type, 1)))
			if(0 == (ret = ws_server->send(_addressData.c_str(), (void*)data, size)))
				return 0;
	rt_fprintf(stderr, "You are sending messages to the GUI too fast. Please slow down\n");
	return ret;
}
