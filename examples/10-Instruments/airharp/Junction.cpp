/*
 *
 * Excitation Junction for two waveguides
 *
 * Christian Heinrichs 04/2015
 *
 */

#include "Junction.h"
#include "../include/Utilities.h"

Junction::Junction()	{

	setFrequency(440);
	_dt = 1.0/44100.0;

	// initialize variables
	for(int i=0;i<WG_BUFFER_SIZE;i++)	{
		_buffer_l[i] = 0;
		_buffer_r[i] = 0;
	}
	_excitation = 0;
	_lastPlectrumDisplacement = 0;
	_readPtr = 0;

}

void Junction::update(float excitation, float left, float right)	{

	// 1. advance delay buffer read pointer

	if(++_readPtr>=WG_BUFFER_SIZE)
		_readPtr=0;

	// 2. add excitation sample into buffer

	_buffer_l[(_readPtr+_delay_l+WG_BUFFER_SIZE)%WG_BUFFER_SIZE] = excitation;
	_buffer_r[(_readPtr+_delay_r+WG_BUFFER_SIZE)%WG_BUFFER_SIZE] = excitation;

	// 3. feed right input to left output and vice versa

	_buffer_l[_readPtr] += right;
	_buffer_r[_readPtr] += left;

	// 4. store excitation value for later use
	_excitation = excitation;

}

float Junction::getOutput(int direction)	{

	if(direction = 0)
		return _buffer_l[_readPtr];
	else
		return _buffer_r[_readPtr];

}

float Junction::getExcitationDisplacement()	{

	// string displacement and excitation force
	// use delayed value to account for excitation position
	float in = _buffer_l[(_readPtr+_delay_l+WG_BUFFER_SIZE)%WG_BUFFER_SIZE] + _excitation;

	// integrate total force
	float out = 0.00001 * in + 0.99999 * _lastPlectrumDisplacement;

	// store variable for next iteration
	_lastPlectrumDisplacement = out;

	// multiply by delta time
	return out * _dt;

}

void Junction::setPluckPosition(float pluckPos){

	pluckPos = constrain(pluckPos,0,1);
	_delay_l = pluckPos * _periodInSamples;
	_delay_r = (1-pluckPos) * _periodInSamples;

}

void Junction::setPeriod(float period)	{

	_periodInMilliseconds = period;

}

void Junction::setFrequency(float frequency)	{

	_periodInMilliseconds = 1000.0/frequency;
	_periodInSamples = (int)(_periodInMilliseconds * 44.1);

}
