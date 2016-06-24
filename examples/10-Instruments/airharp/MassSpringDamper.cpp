/*
 *
 * Simple 1-Dimensional Mass Spring Damper
 *
 * Christian Heinrichs 04/2015
 *
 */

#include "MassSpringDamper.h"

MassSpringDamper::MassSpringDamper(float mass, float spring, float damp)	{

	_dt = 1.0/44100.0;
	_mass = mass;
	_spring = spring;
	_damp = damp;
	_position = 0;
	_velocity = 0;

}

void MassSpringDamper::setup()	{

}

double MassSpringDamper::update(float inForce)	{

	// 1. calculate spring/damper forces using current position and velocity

	double out = (_position * (double)_spring * -1) + (_velocity * (double)_damp * -1);

	// 2. apply external force

	out += inForce;

	// 3. derive acceleration (a = f/m)

	out /= (double)_mass;

	// 4. derive velocity (v = a*dt)

	out *= _dt;

	// 5. apply previous velocity

	out += _velocity;

	// 6. save current velocity state for next iteration

	_velocity = out;

	// 7. derive new position (x[n] = x[n-1] + v[n]) and save for next iteration

	out += _position;
	_position = out;

	return out;

}
