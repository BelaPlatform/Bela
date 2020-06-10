/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**

\example Sensors/rotary-encoder/render.cpp

Rotary Encoder
================

Connect a rotary encoder to Bela's digital inputs, detect the direction of the
rotation, and keep track of how far you've gone.

If your encoder has a built-in switch, you can use that to reset the current count.
*/

#include <Bela.h>
#include <libraries/Scope/Scope.h>
#include <libraries/Encoder/Encoder.h>

Encoder gEncoder;
Scope gScope;
// Bela digital input channels connected to the encoder and button
unsigned int kEncChA = 0;
unsigned int kEncChB = 1;
unsigned int kEncChBtn = 2;

// adjust the values below based on your encoder and wiring
unsigned int kDebouncingSamples = 15;
Encoder::Polarity polarity = Encoder::ANY; // could be ANY, ACTIVE_LOW, ACTIVE_HIGH

bool setup(BelaContext *context, void *userData)
{
	gScope.setup(3, context->audioSampleRate);
	gEncoder.setup(kDebouncingSamples, polarity);

	// Set the digital pins to inputs
	pinMode(context, 0, kEncChA, INPUT);
	pinMode(context, 0, kEncChB, INPUT);
	pinMode(context, 0, kEncChBtn, INPUT);
	return true;
}

bool gButton;
unsigned int holdoff;
void render(BelaContext *context, void *userData)
{
	for(unsigned int n=0; n<context->digitalFrames; n++){
		bool a = digitalRead(context, n, kEncChA);
		bool b = digitalRead(context, n, kEncChB);
		bool button = digitalRead(context, n, kEncChBtn);
		Encoder::Rotation ret = gEncoder.process(a, b);
		if(Encoder::NONE != ret)
		{
			rt_printf("%s : %3d\n", Encoder::CCW == ret ? "ccw" : "cw ", gEncoder.get());
		}
		if(gButton != button) {
			gButton = button;
			if(button) {
				gEncoder.reset();
				rt_printf("reset : %3d\n", gEncoder.get());
			}
		}
		if(1)
		{
			if(Encoder::CCW == ret)
				button = 1;
			else
				button = 0;

		}
		gScope.log( // log the values with a vertical offset to make them easier to see
			a * 0.5 + 0.333, 
			b * 0.5 - 0.333,
			button * 0.5 - 0.88
		);
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
