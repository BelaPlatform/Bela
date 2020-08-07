#include "Encoder.h"
#include <Bela.h>

void Encoder::setup(unsigned int debounce, Polarity polarity)
{
	debounce_ = debounce;
	reset();
	polarity_ = polarity;
	debouncing_ = 0;
	primed_ = false;
}

void Encoder::reset(int position)
{
	position_ = position;
}

bool Encoder::validEdge(bool a)
{
	return (
		ANY == polarity_
		|| (ACTIVE_LOW == polarity_ && !a)
		|| (ACTIVE_HIGH == polarity_ && a)
       );
}

Encoder::Rotation Encoder::process(bool a, bool b)
{
	Rotation ret = NONE;
	if(!primed_) {
		lastA_ = a_ = a;
		primed_ = true;
	}
	if(a != lastA_) {
		if(validEdge(a))
			debouncing_ = debounce_ + 1;
		else
			a_ = a;
	}

	// wait for the data to be stable long enough
	// before checking for an updated value
	if(1 == debouncing_ && a_ != a)
	{
		a_ = a;
		if(validEdge(a))
		{
			if(b == a)
				ret = CCW;
			else
				ret = CW;
			if(ACTIVE_LOW == polarity_)
				ret = CCW == ret ? CW : CCW;
			position_ += ret;
		}
	}
	if(debouncing_)
		--debouncing_;
	lastA_ = a;
	return ret;
}

int Encoder::get()
{
	return position_;
}


