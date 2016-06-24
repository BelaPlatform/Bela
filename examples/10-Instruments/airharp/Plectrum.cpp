/*
 *
 * Plectrum model for touching and plucking strings
 *
 * Christian Heinrichs 04/2015
 *
 * [inspired by E. Berdahl's pluck~ abstraction for the FireFader]
 *
 */

#include "Plectrum.h"

#include "../include/Utilities.h"
#include <cmath>
#include <stdio.h>
#include <cstdlib>

Plectrum::Plectrum()	{

	_contact = 0;
	_lastDistance = 0;

}

void Plectrum::setup(float spring, float damp, float hyst)	{

	_spring = spring;
	_damp = damp;
	_hyst = hyst;

}

float Plectrum::update(float position, float stringPosition)	{

	float distance = position - stringPosition;

	// Calculate spring/damp forces based on distance to string

	float springOut = distance * _spring;

	float dampOut = (distance - _lastDistance) * 44100;

	float out = springOut+dampOut;

	// If distance crosses zero, enable contact

	if((distance>0 && _lastDistance<=0)||(distance<0 && _lastDistance>=0))
		_contact = 1;

	// If distance exceeds hysteresis threshold, jump to zero (i.e. 'pluck')

	if(fabs(distance)>_hyst)
		_contact = 0;

	// FIXME: contact doesn't switch back to zero if distance goes back in original direction

	_lastDistance = distance;

	return out * _contact;

}
