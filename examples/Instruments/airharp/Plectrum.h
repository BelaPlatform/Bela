/*
 *
 * Plectrum model for touching and plucking strings
 *
 * [inspired by E. Berdahl's pluck~ abstraction for the FireFader]
 *
 */

#pragma once

class Plectrum
{

public:

	Plectrum();
	void setup(float spring, float damp, float hyst);
	float update(float position, float stringPosition);

private:

	float _spring;
	float _damp;
	float _hyst;
	float _lastDistance;
	int _contact;

};
