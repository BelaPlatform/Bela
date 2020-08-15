#include "BelaEncoder.h"
#include <stdexcept>

BelaEncoder::BelaEncoder() {}

BelaEncoder::BelaEncoder(const Settings& settings)
{
	if(setup(settings))
		throw std::runtime_error("Invalid parameter passed to BelaEncoder consructor");
}

int BelaEncoder::setup(const Settings& settings)
{
	BelaContext* context = settings.context;
	pins = settings.pins;
	unsigned int numChannels = context->digitalChannels;
	if(pins.a >= numChannels || pins.b >= numChannels)
		return 1;
	pinMode(context, 0, pins.a, INPUT);
	pinMode(context, 0, pins.b, INPUT);
	unsigned int debounce = (settings.debounceMs / 1000.f) * context->digitalSampleRate;
	Encoder::setup(debounce, settings.polarity);
	return 0;
}

Encoder::Rotation BelaEncoder::process(BelaContext* context)
{
	Rotation lastRotation = NONE;
	for(unsigned int n = 0; n < context->digitalFrames; ++n) {
		Rotation rotation = process(context, n);
		if(rotation)
			lastRotation = rotation;
	}
	return lastRotation;
}
