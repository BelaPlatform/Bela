#include "SteppedPot.h"
#include <stddef.h>

SteppedPot::SteppedPot(const std::vector<float>& levelsV, float toleranceV, float fullScale)
{
	setup(levelsV, toleranceV, fullScale);
}

void SteppedPot::setup(const std::vector<float>& levelsV, float toleranceV, float fullScale)
{
	tolerance = toleranceV / fullScale;
	levels.resize(0);
	for(auto& lv : levelsV)
		levels.push_back(lv / fullScale);
	position = 0;
	inited = false;
}

bool SteppedPot::process(float value)
{
	// quick check if we are still in current position (reasonable expectation)
	if(inited && isInState(value, position))
		return false;
	inited = true;
	// then check if we are in any other position
	for(size_t n = 0; n < levels.size(); ++n)
	{
		if(isInState(value, n))
		{
			position = n;
			return true;
		}
	}
	// otherwise we keep what we have (hysteresis)
	return false;
}

unsigned int SteppedPot::get()
{
	return position;
}

bool SteppedPot::isInState(float value, unsigned int p)
{
	float lowTh = levels[p] - tolerance;
	float highTh = levels[p] + tolerance;
	if(lowTh < value && value < highTh)
		return true;
	return false;
}
