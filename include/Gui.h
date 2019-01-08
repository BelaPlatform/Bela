#include <vector>
#include <string>
#include <memory>

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
	public:
		Gui();
		Gui(unsigned int port);
		~Gui();

		int setup(unsigned int port);
		void cleanup();
		
		bool isConnected()
	       	{
			return wsIsConnected;
		};
		
		bool sliderChanged(int slider);
		float getSliderValue(int slider);
		int getNumSliders()
		{
			return sliders.size();
		};
		void addSlider(std::string name, float min, float max, float step, float value);
		void setSlider(int index, float min, float max, float step, float value, std::string name);

};
