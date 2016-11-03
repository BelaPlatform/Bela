#include <vector>
#include <string>

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
		};
		std::vector<GuiSlider> sliders;
		unsigned const int port ;
		
		void ws_connect();
		void ws_onData();
	public:
		Gui();
		~Gui();

		int setup();
		void cleanup();
}
