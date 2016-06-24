/*
 *
 * 1-D string consisting of two waveguides and junction
 *
 * Christian Heinrichs 04/2015
 *
 */

#include "String.h"
#include "Junction.h"
#include "Waveguide.h"

#include "../include/Utilities.h"
#include <rtdk.h>
#include <cmath>
#include <stdio.h>
#include <cstdlib>

String::String(){

	wg_l = Waveguide();
	wg_r = Waveguide();
	junction = Junction();

	junction.setPluckPosition(0.5);

	_previous_l = 0;
	_previous_r = 0;

}

float String::update(float in)	{

	// 1. send excitation signal and previous waveguide outputs into junction

	junction.update(in,_previous_l,_previous_r);

	// 2. save new waveguide outputs for next iteration

	_previous_l = wg_l.update(junction.getOutput(0));
	_previous_r = wg_r.update(junction.getOutput(1));

	// 3. use right waveguide as output

	return _previous_r;
}

float String::getPlectrumDisplacement()	{

	return junction.getExcitationDisplacement();

}

void String::setPluckPosition(float pluckPos){

	junction.setPluckPosition(pluckPos);

}

void String::setGlobalPosition(float pos)	{

	_globalPosition = pos;

}

float String::getGlobalPosition()	{

	return _globalPosition;

}

void String::setMidinote(float midinote)	{

	float frequency = 440.0f*(float)powf(2,(midinote-57)/12.0f);

	junction.setFrequency(frequency);
	wg_l.setFrequency(frequency);
	wg_r.setFrequency(frequency);

}

void String::setFrequency(float frequency)	{

	junction.setFrequency(frequency);
	wg_l.setFrequency(frequency);
	wg_r.setFrequency(frequency);

}
