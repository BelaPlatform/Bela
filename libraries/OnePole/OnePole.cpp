#include "OnePole.h"
#include <Bela.h>
#include <math.h>
#include <stdio.h>

OnePole::OnePole() {}

OnePole::OnePole(float fc, float fs, int type)
{
	setup(fc, fs, type);
}

int OnePole::setup(float fc, float fs, int type)
{
	ym1 = 0.0; // Reset filter state
	_fs = fs;
	setFilter(fc, _fs,  type);
	return 0;
}

void OnePole::setFilter(float fc, float fs, int type)
{
	_fs= fs;
	setType(type);
	setFc(fc);
}

void OnePole::setFc(float fc)
{
	if(_type == LP)
	{
		b1 = expf(-2.0f * (float)M_PI * fc/_fs);
		a0 = 1.0f - b1;
	}
	else if(_type == HP)
	{
		b1 = -expf(-2.0f * (float)M_PI * (0.5f - fc/_fs));
		a0 = 1.0f + b1;
	}
	_fc = fc;
}

void OnePole::setType(int type)
{
	if(type == LP || type == HP)
	{
		_type = type;
	}	
	else
	{
		fprintf(stderr, "Invalid type\n");
	}
}	

float OnePole::process(float input)
{
	return ym1 = input * a0 + ym1 * b1;
}

OnePole::~OnePole()
{
	cleanup();
}

void OnePole::cleanup() { }
