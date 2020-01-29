#pragma once

#include <vector>
#include <string>
#include <libraries/Gui/Gui.h>
#include "GuiSlider.h"
#include <JSON.h>

// Forward declarations
class Gui;

class GuiController {
	private:
		std::vector<GuiSlider> _sliders;
		Gui *_gui;
		std::string _name;
		std::wstring _wname;

		int sendController();
		int sendSlider(GuiSlider* slider);
		int sendSliderValue(int sliderIndex);

		friend class Gui;

	public:
		GuiController();
		~GuiController();

		GuiController(Gui *gui, std::string name);

		int setup(Gui *gui, std::string name);

		int setup();
		void cleanup();
		int addSlider(std::string name, float value = 0.5, float min = 0.0, float max = 0.1, float step = 0.001);
		float getSliderValue(int sliderIndex);
		int setSliderValue(int sliderIndex, float value);

		GuiSlider* getSlider(int sliderIndex) { return &_sliders.at(sliderIndex); };

		int getNumSliders() { return _sliders.size(); };

		static bool controlCallback(JSONObject &root, void* param);	
};
