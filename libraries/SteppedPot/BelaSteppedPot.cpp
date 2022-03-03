#include "BelaSteppedPot.h"

BelaSteppedPot::BelaSteppedPot(BelaContext* context, unsigned int analogInCh, const std::vector<float>& levelsV, float toleranceV, float fullScale)
{
	setup(context, analogInCh, levelsV, toleranceV, fullScale);
}

void BelaSteppedPot::setup(BelaContext* context, unsigned int analogInCh, const std::vector<float>& levelsV, float toleranceV, float fullScale)
{
	SteppedPot::setup(levelsV, toleranceV, fullScale);
	filter.setup(1000, context->audioSampleRate);
	this->analogInCh = analogInCh;
}

bool BelaSteppedPot::process(BelaContext* context)
{
	float value;
	for(unsigned int n = 0; n < context->analogFrames; ++n)
		value = filter.process(analogRead(context, n, analogInCh));
	return SteppedPot::process(value);
}
