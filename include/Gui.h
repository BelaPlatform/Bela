#include <vector>
#include <string>
#include <memory>
#include <WSServer.h>
#include <JSON.h>
#include <typeinfo> // for types in templates

// forward declarations
class WSServer;
class JSONValue;
class AuxTaskRT;

class Gui
{
	private:
		struct GuiSlider
		{
			int index;
			float value = 0.0;
			bool changed = false;
			float min = 0.0;
			float max = 1;
			float step = 0.001;
			std::string name;
			std::wstring w_name;
		};

		std::vector<GuiSlider> sliders;
		
		std::unique_ptr<WSServer> ws_server;

		bool wsIsConnected = false;

		void ws_connect();
		void ws_onData(const char* data);
		
		void sendSlider(GuiSlider* slider);
		
		unsigned int _port;
		std::string _addressControl;
		std::string _addressData;
	public:
		Gui();
		Gui(unsigned int port, std::string address);
		~Gui();

		int setup(unsigned int port, std::string address);
		void cleanup();
		
		bool isConnected()
	       	{
			return wsIsConnected;
		};
		
		bool sliderChanged(int slider);
		float getSliderValue(int slider);
		void setSliderValue(int slider);
		int getNumSliders()
		{
			return sliders.size();
		};
		void addSlider(std::string name, float min, float max, float step, float value);
		void setSlider(int index, float min, float max, float step, float value, std::string name);
		template<typename T, typename A>
		void sendBuffer(unsigned int bufferId, std::vector<T,A> & buffer);

		template<typename T>
		void sendBuffer(unsigned int bufferId, T buffer);
};

template<typename T, typename A>
void Gui::sendBuffer(unsigned int bufferId, std::vector<T,A> & buffer)
{
	std::string bufferStr = std::to_string(bufferId);
	ws_server->send(_addressData.c_str(), bufferStr.c_str());
	const char* type = typeid(T).name();
	ws_server->send(_addressData.c_str(), type);
	ws_server->send(_addressData.c_str(), buffer.data(), (int)(buffer.size()*sizeof(T)));
}
