/*
 *
 * Excitation Junction for two waveguides
 *
 * Christian Heinrichs 04/2015
 *
 */

#ifndef JUNCTION_H_
#define JUNCTION_H_

#include <cmath>

#ifndef WG_BUFFER_SIZE
#define WG_BUFFER_SIZE 4096
#endif

#ifndef		M_PI
#define		M_PI		3.14159265358979323846264338
#endif

class Junction
{

public:

	Junction();
	void setup();
	void update(float excitation, float left, float right);
	float getOutput(int direction);
	float getExcitationDisplacement();
	void setFrequency(float frequency);
	void setPeriod(float periodInMs);
	void setPluckPosition(float pluckPos);

private:

	double _dt;
	float _periodInMilliseconds;
	int _periodInSamples;

	int _delay_l;
	int _delay_r;

	float _buffer_l[WG_BUFFER_SIZE];
	float _buffer_r[WG_BUFFER_SIZE];
	int _readPtr;

	float _excitation;
	float _lastPlectrumDisplacement;

};

#endif
