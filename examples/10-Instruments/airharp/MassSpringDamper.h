/*
 *
 * Simple 1-Dimensional Mass Spring Damper
 *
 * Christian Heinrichs 04/2015
 *
 */

#ifndef MASSSPRINGDAMPER_H_
#define MASSSPRINGDAMPER_H_

class MassSpringDamper
{

public:

	MassSpringDamper(float mass, float spring, float damp);
	void setup();
	double update(float inForce);

private:

	double _dt;
	float _mass;
	float _spring;
	float _damp;
	double _position;
	double _velocity;

};

#endif
