#include "BelaDebounce.h"
#include <stdexcept>

BelaDebounce::BelaDebounce() {};
BelaDebounce::BelaDebounce(const Settings& settings)
{
	if(setup(settings))
		throw std::runtime_error("Invalid parameter passed to BelaDebounce consructor");
}

int BelaDebounce::setup(const Settings& settings)
{
	BelaContext* context = settings.context;
	channel = settings.channel;
	if(channel >= context->digitalChannels)
		return 1;
	pinMode(context, 0, settings.channel, INPUT);
	unsigned int debounceInterval = (settings.debounceMs / 1000.f) * context->digitalSampleRate;
	debounce.setup(debounceInterval);
	return 0;
}

bool BelaDebounce::process(BelaContext* context)
{
	bool ret;
	for(unsigned int n = 0; n < context->digitalFrames; ++n)
		ret = process(context, n);
	return ret;
}

bool BelaDebounce::process(BelaContext* context, unsigned int frame)
{
	return debounce.process(digitalRead(context, frame, channel));
}
