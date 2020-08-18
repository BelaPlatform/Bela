#include "OnePole.h"
#include <Bela.h>
#include <math.h>
#include <stdexcept>

OnePole::OnePole() {}

OnePole::OnePole(float cutoff, float samplingRate, Type type)
{
	int ret;
	if((ret = setup(cutoff, samplingRate, type)))
		throw std::runtime_error("OnePole: cutoff is above Nyquist");
}

int OnePole::setup(float cutoff, float samplingRate, Type type)
{
	if(cutoff > samplingRate / 2)
		return -1;
	ym1 = 0.0; // Reset filter state
	_samplingRate = samplingRate;
	setFilter(cutoff, type);
	return 0;
}

void OnePole::setFilter(float cutoff, Type type)
{
	_type = type;
	setFc(cutoff);
}

void OnePole::setFc(float cutoff)
{
	switch(_type) {
	case LOWPASS:
		b1 = expf(-2.0f * (float)M_PI * cutoff/_samplingRate);
		a0 = 1.0f - b1;
		break;
	case HIGHPASS:
		b1 = -expf(-2.0f * (float)M_PI * (0.5f - cutoff/_samplingRate));
		a0 = 1.0f + b1;
	}
}

float OnePole::process(float input)
{
	return ym1 = input * a0 + ym1 * b1;
}
