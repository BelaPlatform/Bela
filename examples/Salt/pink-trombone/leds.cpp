/***** leds.cpp *****/
#include <Bela.h>
#include <Utilities.h>
void setLed(BelaContext* context, int ledPin,  int color)
{
	if(color == 0)
	{
		pinMode(context, 0, ledPin, INPUT);
		return;
	}
	pinMode(context, 0, ledPin, OUTPUT);
	digitalWrite(context, 0, ledPin, color - 1);
}

void drivePwm(BelaContext* context, int pwmPin)
{
	static unsigned int count = 0;
	pinMode(context, 0, pwmPin, OUTPUT);
	for(unsigned int n = 0; n < context->digitalFrames; ++n)
	{
		digitalWriteOnce(context, n, pwmPin, count & 1);
		count++;
	}
}