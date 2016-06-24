/*
 *
 * Simple 1-Dimensional Waveguide
 *
 */

#include "Waveguide.h"
#include "../include/Utilities.h"
#include <rtdk.h>
#include <cmath>
#include <stdio.h>
#include <cstdlib>

#define DECAY 0.995//0.999
#define DAMPING 0.01//0.05

// TODO: make damping and decay parametrisable

Waveguide::Waveguide()	{

	// initialize variables
	a1_lp = 0;
	a2_lp = 0;
	b0_lp = 0;
	b1_lp = 0;
	b2_lp = 0;
	_dt = 1.0/44100.0;
	setFrequency(440);
	updateFilterCoeffs(8000);
	_filterReadPtr=0;
	for(int i=0;i<FILTER_BUFFER_SIZE;i++)	{
		_filterBuffer_x[i] = 0;
		_filterBuffer_y[i] = 0;
	}
	for(int i=0;i<WG_BUFFER_SIZE;i++)	{
		_buffer[i] = 0;
	}
	_lastX = 0;
	_lastY = 0;
	_readPtr = 0;

}

void Waveguide::setup()	{

}

float Waveguide::update(float in)	{

	// 1. advance delay buffer read pointer

	if(++_readPtr>=WG_BUFFER_SIZE)
		_readPtr=0;

	// 2. write input into buffer

	_buffer[_readPtr] = in;

	// 3. read delayed sample from buffer

	float out = _buffer[(_readPtr-_periodInSamples+WG_BUFFER_SIZE)%WG_BUFFER_SIZE];

	// 4. apply damping (low-pass) filter to output

	if(++_filterReadPtr>=FILTER_BUFFER_SIZE)
			_filterReadPtr=0;

	out = b0_lp*out +
					b1_lp*_filterBuffer_x[(_filterReadPtr-1+FILTER_BUFFER_SIZE)%FILTER_BUFFER_SIZE] +
					b2_lp*_filterBuffer_x[(_filterReadPtr-2+FILTER_BUFFER_SIZE)%FILTER_BUFFER_SIZE] -
					a1_lp*_filterBuffer_y[(_filterReadPtr-1+FILTER_BUFFER_SIZE)%FILTER_BUFFER_SIZE] -
					a2_lp*_filterBuffer_y[(_filterReadPtr-2+FILTER_BUFFER_SIZE)%FILTER_BUFFER_SIZE];

	// 5. Simple high-pass filter to block DC-offset
	// y[n] = x[n] - x[n-1] + a * y[n-1]
	float gain = 0.9999;
	float temp = out;
	out = out - _lastX + gain * _lastY;
	_lastY = out;
	_lastX = temp;

	// 6. Apply intensity damping
	out *= DECAY;

	_filterBuffer_x[_filterReadPtr] = in;
	_filterBuffer_y[_filterReadPtr] = out;

	return out;

}

void Waveguide::setFrequency(float frequency)	{

	// NB: currently no interpolation, so may not be ideal for dynamically changing waveguide frequency
	_periodInMilliseconds = 1000.0/frequency;
	_periodInSamples = (int)(_periodInMilliseconds * 44.1);

}

void Waveguide::updateFilterCoeffs(float frequency)	{

	// FIXME: Butterworth filter doesn't work very well,
	//		  using simple FIR in the meantime

	a1_lp = 0;
	a2_lp = 0;
	b0_lp = 1.0 - DAMPING;
	b1_lp = DAMPING;
	b2_lp = 0;

	/*
	// 'w' for sake of resembling lower-case 'omega'
	float w = 2.0 * M_PI * frequency;
	float t = _dt;
	// The Q for a 2nd-order Butterworth is sqrt(2)/2
	float q = 0.707;//sqrt(2.0)/2.0;

	// low-pass filter coefficients
	float a0_lp = w*w*t*t + 2*(w/q)*t + 4.0;
	float k = 1.0/a0_lp;
	a1_lp = (2.0*w*w*t*t - 8.0) * k;
	a2_lp = (4.0 - (w/q)*2.0*t + w*w*t*t) * k;
	b0_lp = (w*w*t*t) * k;
	b1_lp = (2.0*w*w*t*t) * k;
	b2_lp = (w*w*t*t) * k;
	*/

}
