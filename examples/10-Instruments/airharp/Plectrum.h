/*
 *
 * Plectrum model for touching and plucking strings
 *
 * [inspired by E. Berdahl's pluck~ abstraction for the FireFader]
 *
 */

#ifndef PLECTRUM_H_
#define PLECTRUM_H_

class Plectrum
{

public:

	Plectrum();
	void setup(float spring, float damp, float hyst);
	float update(float position, float stringPosition);

private:

	double _dt;
	float _spring;
	float _damp;
	double _position;
	double _velocity;
	float _hyst;
	float _lastDistance;
	int _contact;

};

#endif

