#include "GuiController.h"
#include <iostream>

GuiController::GuiController()
{
}

GuiController::GuiController(Gui *gui, std::string name)
{
	setup(gui, name);
}

int GuiController::setup(Gui* gui, std::string name)
{
	_gui = gui;
	_name = name;
	_wname = std::wstring(name.begin(), name.end());
	_gui->setControlDataCallback(controlCallback, this);
	int ret = sendController();
	return ret;
}

int GuiController::sendController()
{
	JSONObject root;
	root[L"event"] = new JSONValue(L"set-controller");
	root[L"name"] = new JSONValue(_wname);
	JSONValue json(root);
	return _gui->sendControl(&json);
}

void GuiController::cleanup()
{
}

GuiController::~GuiController()
{
	cleanup();
}

bool GuiController::controlCallback(JSONObject &root, void* param)
{
	GuiController* controller = (GuiController*)param;
	if (root.find(L"event") != root.end() && root[L"event"]->IsString())
	{
		std::wstring event = root[L"event"]->AsString();
		if (event.compare(L"connection-reply") == 0)
		{
			controller->sendController();
			if(controller->getNumSliders() != 0)
			{
				for (auto& slider : controller->_sliders)
					controller->sendSlider(slider);
			}
		}
		else if (event.compare(L"slider") == 0)
		{
			int sliderIndex = -1;
			float sliderValue = 0.0f;
			if (root.find(L"slider") != root.end() && root[L"slider"]->IsNumber())
				sliderIndex = (int)root[L"slider"]->AsNumber();
			if (root.find(L"value") != root.end() && root[L"value"]->IsNumber())
			{
				sliderValue = (float)root[L"value"]->AsNumber();
				controller->_sliders.at(sliderIndex).setValue(sliderValue);
			}
		}
	}

	return true;
}

int GuiController::sendSlider(const GuiSlider& slider)
{
	JSONObject root = slider.getParametersAsJSON();
	root[L"event"] = new JSONValue(L"set-slider");
	root[L"controller"] = new JSONValue(_wname);
	JSONValue json(root);
	return _gui->sendControl(&json);
}

int GuiController::sendSliderValue(int sliderIndex)
{
	auto& slider = _sliders.at(sliderIndex);
	JSONObject root;
	root[L"event"] = new JSONValue(L"set-slider-value");
	root[L"controller"] = new JSONValue(_wname);
	root[L"index"] = new JSONValue(slider.getIndex());
	root[L"name"] = new JSONValue(slider.getNameW());
	root[L"value"] = new JSONValue(slider.getValue());
	JSONValue json = JSONValue(root);
	return _gui->sendControl(&json);
}

int GuiController::addSlider(std::string name, float value, float min, float max, float step)
{
	_sliders.push_back(GuiSlider(name, value, min, max, step));
	_sliders.back().setIndex(getNumSliders() - 1);
	return _sliders.back().getIndex();
}

float GuiController::getSliderValue(int sliderIndex)
{
	return _sliders.at(sliderIndex).getValue();
}

int GuiController::setSliderValue(int sliderIndex, float value)
{
	auto& s = _sliders.at(sliderIndex);
	s.setValue(value);
	return sendSliderValue(sliderIndex);
}
