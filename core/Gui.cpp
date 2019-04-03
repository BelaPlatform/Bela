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

	// Parse whatever needs to be parsed on connection

	JSONValue *value = new JSONValue(root);
	std::wstring wide = value->Stringify().c_str();
	std::string str( wide.begin(), wide.end() );
	ws_server->send(_addressControl.c_str(), str.c_str());
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
		if (event.compare(L"connection-reply") == 0){
			printf("Connection replied\n");
			wsIsConnected = true;
			if(sliders.size() != 0)
			{
				for (auto slider : sliders){
					sendSlider(&slider);
				}
			}
		} else if (event.compare(L"slider") == 0){
			int slider = -1;
			float value = 0.0f;
			if (root.find(L"slider") != root.end() && root[L"slider"]->IsNumber())
				slider = (int)root[L"slider"]->AsNumber();
			if (root.find(L"value") != root.end() && root[L"value"]->IsNumber())
				value = (float)root[L"value"]->AsNumber();
				
			sliders.at(slider).value = value;
			sliders.at(slider).changed = true;
		}
		return;
	}
}

float Gui::getSliderValue(int index)
{
	sliders[index].changed = false;
	return sliders[index].value;
}

std::string Gui::getSelectValue(int index)
{
	selects[index].changed = false;
	return selects[index].options[selects[index].value];
}

void Gui::setSlider(int index, float min, float max, float step, float value, std::string name)
{
	sliders.at(index).value = value;
	sliders.at(index).min = min;
	sliders.at(index).max = max;
	sliders.at(index).step = step;
	sliders.at(index).name = name;
	sliders.at(index).w_name = std::wstring(name.begin(), name.end());
}

void Gui::setSelect(int index, const std::vector<std::string>& options, unsigned int selectedIndex, std::string name)
{
	selects.at(index).options = options;
	if(!selects.at(index).options.empty())
	{
		selects.at(index).value = selectedIndex % (selects.at(index).options.size());
	}
	selects.at(index).name = name;
	selects.at(index).w_name = std::wstring(name.begin(), name.end());
}

void Gui::sendSlider(GuiSlider* slider)
{
	JSONObject root;
	root[L"event"] = new JSONValue(L"set-slider");
	root[L"slider"] = new JSONValue(slider->index);
	root[L"value"] = new JSONValue(slider->value);
	root[L"min"] = new JSONValue(slider->min);
	root[L"max"] = new JSONValue(slider->max);
	root[L"step"] = new JSONValue(slider->step);
	root[L"name"] = new JSONValue(slider->w_name);
	JSONValue *json = new JSONValue(root);
	// std::wcout << "constructed JSON: " << json->Stringify().c_str() << "\n";
	std::wstring wide = json->Stringify().c_str();
	std::string str( wide.begin(), wide.end() );
	ws_server->send(_addressControl.c_str(), str.c_str());
}
void Gui::sendSelect(GuiSelect* select)
{
	JSONObject root;
	root[L"event"] = new JSONValue(L"set-select");
	root[L"select"] = new JSONValue(select->index);
	root[L"value"] = new JSONValue(select->value);
	root[L"options"] = new JSONValue(select->options.data());
	root[L"name"] = new JSONValue(select->w_name);
	JSONValue *json = new JSONValue(root);
	// std::wcout << "constructed JSON: " << json->Stringify().c_str() << "\n";
	std::wstring wide = json->Stringify().c_str();
	std::string str( wide.begin(), wide.end() );
	ws_server->send(_addressControl.c_str(), str.c_str());
}


void Gui::setSliderValue(int index, float value)
{
	sliders.at(index).value = value;
	sendSliderValue(index);
}

void Gui::setSelectValue(int index, unsigned int valueIndex)
{
	if(valueIndex < selects.at(index).options.size())
	{
		selects.at(index).value = valueIndex;
		sendSelectValue(index);
	}
}

void Gui::sendSliderValue(int index)
{
	JSONObject root;
	root[L"event"] = new JSONValue(L"set-slider");
	root[L"slider"] = new JSONValue(sliders[index].index);
	root[L"value"] = new JSONValue(sliders[index].value);
	JSONValue *json = new JSONValue(root);
	// std::wcout << "constructed JSON: " << json->Stringify().c_str() << "\n";
	std::wstring wide = json->Stringify().c_str();
	std::string str( wide.begin(), wide.end() );
	
}
void Gui::sendSelectValue(int index)
{
	JSONObject root;
	root[L"event"] = new JSONValue(L"set-select");
	root[L"select"] = new JSONValue(selects[index].index);
	root[L"value"] = new JSONValue(selects[index].value);
	JSONValue *json = new JSONValue(root);
	// std::wcout << "constructed JSON: " << json->Stringify().c_str() << "\n";
	std::wstring wide = json->Stringify().c_str();
	std::string str( wide.begin(), wide.end() );
	ws_server->send(_addressControl.c_str(), str.c_str());
}

void Gui::addSlider(std::string name, float min, float max, float step, float value)
{
	GuiSlider newSlider;
	newSlider.index = sliders.size();
	sliders.push_back(newSlider);
	setSlider(newSlider.index, min, max, step, value, name);

	if(isConnected())
	{
		sendSlider(&newSlider);
	}
}

void Gui::addSelect(std::string name, const std::vector<std::string>& options, unsigned int selectedIndex)
{
	GuiSelect newSelect;
	newSelect.index = selects.size();
	selects.push_back(newSelect);
	setSelect(newSelect.index, options, selectedIndex, name);
	
	if(isConnected())
	{
		sendSelect(&newSelect);
	}
}

Gui::~Gui()
{
	cleanup();
}
void Gui::cleanup()
{
}
