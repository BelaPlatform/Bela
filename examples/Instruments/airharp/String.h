/*
 *
 * 1-D string consisting of two waveguides and junction
 *
 * Christian Heinrichs 04/2015
 *
 */

#ifndef STRING_H_
#define STRING_H_

#include <cmath>
#include "Junction.h"
#include "Waveguide.h"

class String
{

public:

	String();
	float update(float in);

	float getPlectrumDisplacement();
	void setMidinote(float midinote);
	void setFrequency(float frequency);
	void setPeriod(float periodInMs);
	void setPluckPosition(float pluckPos);
	void setGlobalPosition(float pos);
	float getGlobalPosition();

private:

	float _previous_l;
	float _previous_r;

	float _globalPosition;

	Waveguide wg_l;
	Waveguide wg_r;
	Junction junction;

};

#endif
