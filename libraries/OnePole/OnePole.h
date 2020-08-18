/*
 * Adapted from: http://www.earlevel.com/main/2012/12/15/a-one-pole-filter/
 *
 *	by: Adán L. Benito
 *	on: November 2018
 *	original code by Nigel Redmon
 *
 */
#pragma once

class OnePole
{
public:
	typedef enum {
		LOWPASS,
		HIGHPASS,
	} Type;
	OnePole();
	OnePole(float cutoff, float samplingRate, Type type = LOWPASS);
	int setup(float cutoff, float samplingRate, Type type = LOWPASS);
	void setFilter(float cutoff, Type type = LOWPASS);
	float process(float input);
private:
	float _samplingRate;
	int _type;
	float a0, b1, ym1;
	void setFc(float cutoff);
};
