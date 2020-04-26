#pragma once

#include <string>
#include <JSON.h>

class GuiSlider {
	private:
		int _index = -1;
		float _value;
		float _range[2];
		float _step;
		bool _changed = false;
		std::string _name;
		std::wstring _wname;

	public:
		GuiSlider() {};
		GuiSlider(std::string name, float val = 0.5, float min = 0.0, float max = 0.1, float step = 0.001);
		int setup(std::string name, float val, float min, float max, float step);
		void cleanup() {};
		~GuiSlider();

		/* Getters */
		float getValue() {
			_changed = false;
			return _value;
		};
		float getStep() { return _step; };
		std::string& getName() { return _name; };
		std::wstring& getNameW() { return _wname; }
		float getMin() { return _range[0]; };
		float getMax() { return _range[1]; };
		float getIndex() { return _index; };
		bool hasChanged() { return _changed; };

		/* Setters */
		int setValue(float val);
		int setStep(float step);
		int setRange(float min, float max);
		int setIndex(int index) { return (index < 0) ? -1 : _index=index; };

		JSONObject getParametersAsJSON() const;
};
