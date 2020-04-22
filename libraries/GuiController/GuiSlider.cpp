#include "GuiSlider.h"

GuiSlider::GuiSlider(std::string name, float val, float min, float max, float step)
{
	setup(name, val, min, max, step);
}

int GuiSlider::setup(std::string name, float val, float min, float max, float step)
{
	_name = name;
	_wname = std::wstring(name.begin(), name.end());
	int ret;
	ret = setRange(min, max);
	if(ret != 0)
		return -1;
	ret = setStep(step);
	if(ret != 0)
		return -2;
	ret = setValue(val);
	if(ret != 0)
		return -3;

	_changed = false;

	return ret;
}

int GuiSlider::setValue(float val)
{
	if(val < _range[0])
	{
		_value = _range[0];
	}
	else if(val > _range[1])
	{
		_value = _range[1];
	}
	else
	{
		_value = val;
	}

	_changed = true;

	return 0;
}
int GuiSlider::setRange(float min, float max)
{
	if(max <= min)
	{
		return -1;
	}
	_range[0] = min;
	_range[1] = max;

	return 0;
}

int GuiSlider::setStep(float step)
{
	if(step > (_range[1] - _range[0]))
	{
		return -1;
	}
	_step = step;

	return 0;
}

JSONObject GuiSlider::getParametersAsJSON() const
{
	JSONObject obj;
	obj[L"name"] = new JSONValue(_wname);
	obj[L"index"] = new JSONValue(_index);
	obj[L"value"] = new JSONValue(_value);
	obj[L"min"] = new JSONValue(_range[0]);
	obj[L"max"] = new JSONValue(_range[1]);
	obj[L"step"] = new JSONValue(_step);

	return obj;
}

GuiSlider::~GuiSlider()
{
	cleanup();
}
