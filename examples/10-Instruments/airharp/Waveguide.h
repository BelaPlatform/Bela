/*
 *
 * Simple 1-Dimensional Waveguide
 *
 * Christian Heinrichs 04/2015
 *
 */

#ifndef WAVEGUIDE_H_
#define WAVEGUIDE_H_

#include <cmath>

#ifndef WG_BUFFER_SIZE
#define WG_BUFFER_SIZE 4096
#endif

#ifndef FILTER_BUFFER_SIZE
#define FILTER_BUFFER_SIZE 4
#endif

#ifndef		M_PI
#define		M_PI		3.14159265358979323846264338
#endif

class Waveguide
{

public:

	Waveguide();
	void setup();
	float update(float in);
	void updateFilterCoeffs(float frequency);
	void setFrequency(float frequency);

private:

	double _dt;
	float _periodInMilliseconds;
	int _periodInSamples;

	float _buffer[WG_BUFFER_SIZE];
	int _readPtr;

	float _filterBuffer_x[FILTER_BUFFER_SIZE];
	float _filterBuffer_y[FILTER_BUFFER_SIZE];
	float _hipBuffer_x[FILTER_BUFFER_SIZE];
	float _hipBuffer_y[FILTER_BUFFER_SIZE];
	int _filterReadPtr;

	float b0_lp,b1_lp,b2_lp,a1_lp, a2_lp;
	float _lastY,_lastX;

};

#endif
