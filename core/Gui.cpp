#include <Gui.h>
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
			ws_onData((const char*) buf);
		},
	 nullptr, nullptr, true);

	ws_server->addAddress(_addressControl,
		// onData()
		[this](std::string address, void* buf, int size)
		{
			ws_onControlData((const char*) buf);
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
void Gui::ws_onControlData(const char* data)
{
	if(customOnControlData && !customOnControlData(data))
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
			} else if (event.compare(L"gui-ready") == 0){
				guiIsReady = true;
			}
		}
		delete value;
	}
	return;
}

void Gui::ws_onData(const char* data)
{
	if(customOnData && !customOnData(data))
	{
		return;
	}
	else
	{
		int bufferId = (int) *data;
		++data;
		char bufferType = *data;
		++data;
		int bufferLength = ((int)data[1] << 8) | data[0];
		int numBytes = (bufferType == 'c' ? bufferLength : bufferLength * sizeof(float));
		data += 2;

		if(bufferId < _buffers.size())
		{
			if(bufferType != getBufferType(bufferId))
			{
				fprintf(stderr, "Buffer %d: received buffer type (%c) doesn't match original buffer type (%c).\n", bufferId, bufferType, getBufferType(bufferId));
			}
			else
			{
				if(numBytes > getBufferCapacity(bufferId))
				{
					fprintf(stderr, "Buffer %d: size of received buffer (%d bytes) exceeds that of the original buffer (%d bytes). The received data will be trimmed.\n", bufferId, numBytes, getBufferCapacity(bufferId));
					numBytes = getBufferCapacity(bufferId);
				}
				// Copy data to buffers
				//std::memcpy(getBufferById(bufferId)->data(), data, numBytes);
				getBufferById(bufferId)->assign(data, data + numBytes);
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
	DataBuffer newBuffer(buffId, bufferType, size);
	_buffers.push_back(newBuffer);
	return buffId;
}

std::vector<char>*  Gui::getBufferById( unsigned int bufferId )
{
	if(bufferId < _buffers.size())
	{
		return _buffers[bufferId].getBuffer();
	}
	else
	{
		fprintf(stderr, "Buffer ID %d is out of range.\n", bufferId);
		return nullptr;
	}
}

char* Gui::getBufferAsChar( unsigned int bufferId )
{
	if(bufferId < _buffers.size())
	{
		return _buffers[bufferId].getData();
	}
	else
	{
		fprintf(stderr, "Buffer ID %d is out of range.\n", bufferId);
		return nullptr;
	}
}


int* Gui::getBufferAsInt( unsigned int bufferId )
{
	if(bufferId < _buffers.size())
	{
		return (int*) _buffers[bufferId].getData();
	}
	else
	{
		fprintf(stderr, "Buffer ID %d is out of range.\n", bufferId);
		return nullptr;
	}
}

float* Gui::getBufferAsFloat( unsigned int bufferId )
{
	if(bufferId < _buffers.size())
	{
		return (float*) _buffers[bufferId].getData();
	}
	else
	{
		fprintf(stderr, "Buffer ID %d is out of range.\n", bufferId);
		return nullptr;
	}
}

char Gui::getBufferType( unsigned int bufferId )
{
	if(bufferId < _buffers.size())
	{
		return _buffers[bufferId].getType();
	}
	else
	{
		fprintf(stderr, "Buffer ID %d is out of range.\n", bufferId);
		return '\0';
	}
}

int Gui::getBufferLen( unsigned int bufferId )
{
	if(bufferId < _buffers.size())
	{
		return _buffers[bufferId].getNumElements();
	}
	else
	{
		fprintf(stderr, "Buffer ID %d is out of range.\n", bufferId);
		return -1;
	}
}

int Gui::getNumBytes( unsigned int bufferId )
{
	if(bufferId < _buffers.size())
	{
		return _buffers[bufferId].getSize();
	}
	else
	{
		printf(stderr, "Buffer ID %d is out of range.\n", bufferId);
		return -1;
	}
}

Gui::~Gui()
{
	cleanup();
}
void Gui::cleanup()
{
}
