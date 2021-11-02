#include "DelayLine.h"

DelayLine::DelayLine()
{
}

DelayLine::DelayLine(float maxDelayTime, float fs, unsigned int nTaps)
{
	setup(maxDelayTime, fs, nTaps);
}
int DelayLine::setup(float maxDelayTime, float fs, unsigned int nTaps)
{
	_fs = fs;
	unsigned int bufferLength = 1 + (unsigned int)(maxDelayTime * _fs / 1000.0);
	_delayBuffer.resize(bufferLength, 0);

	_nTaps = (nTaps < 1) ?  1 : nTaps;
	_readPtr = new float[_nTaps]();
	_delaySamples = new float[_nTaps]();
	return 0;
}

float DelayLine::process(float input)
{
	// Get main tap and set feedback send
	_feedbackSend = getTapOutput(0);

	// If no external feebdack is being used, scale feeback send and set return
	if(!_externalFeedback)
		_feedbackReturn = _feedbackGain * _feedbackSend;

	// Scale input by dry level
	float output =  _dryLevel * input;

	float wetLevel = _wetLevel;

	// If no separate taps are being used...
	if(!_separateTaps && _nTaps > 1)
	{
		// Scale wet level by number of taps
		wetLevel = wetLevel * (1.0/_nTaps);
		// Get output for each tap and sum to main tap
		// Read pointer for each tap will be updated
		for(unsigned int t=1; t<_nTaps; t++)
			output += wetLevel * getTapOutput(t);
	}
	// Add feedback send to ouput
	output += wetLevel * _feedbackSend;
	// Write input and feedback terturn to delay buffer
	_delayBuffer[_writePtr] = input + _feedbackReturn;
	// Update write pointer
	updateWritePointer();

	return output;
}

int DelayLine::cleanup()
{
	delete [] _readPtr;
	delete [] _delaySamples;
	return 0;
}

float DelayLine::lerp(float index, float pVal, float nVal)
{
	return pVal + index * (nVal - pVal);
}

float DelayLine::interpolatedRead(float index)
{
	while(index < 0)
		index += _delayBuffer.size();
	int pIndex = (int)index;
	int nIndex = pIndex + 1;
	while(nIndex >= _delayBuffer.size())
		nIndex -= _delayBuffer.size();
	float frac = index - pIndex;
	float pVal = _delayBuffer[pIndex];
	float nVal = _delayBuffer[nIndex];

	return lerp(frac, pVal, nVal);
}

void DelayLine::updateReadPointer(unsigned int tap)
{
	tap = this->constrain<unsigned int>(tap, 0, _nTaps-1);
	_readPtr[tap] = (_writePtr - _delaySamples[tap] + _delayBuffer.size());
	while(_readPtr[tap] >= _delayBuffer.size())
		_readPtr[tap]  -= _delayBuffer.size();
}

DelayLine::~DelayLine()
{
	cleanup();
}
