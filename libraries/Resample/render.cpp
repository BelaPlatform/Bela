/*
* Play noise through loudspeaker and record at mic or record signal of two mics.
*/

#include <Bela.h>
#include <libraries/AudioFile/AudioFile.h>
#include <libraries/Scope/Scope.h>

#include <vector>
#include <string>
#include <algorithm>
#include <cmath>
#include <cassert>
#include <fstream>
#include <random>

#include "Resample.h"

// Parameters
const int decFac = 4;
const uint gInChannel = 0;

DecimatorChannel decimator;
InterpolatorChannel interpolator;

Scope scope;
// Scope scope_down;

float *x;
float *y;
float *xhat;

std::default_random_engine       generator;
std::normal_distribution<float>* distribution = new std::normal_distribution<float>(0, 0.01);

uint sr;
uint blockSize;
uint blockSizeResampled;

bool setup(BelaContext *context, void *userData)
{
	sr = context->audioSampleRate/decFac;
	blockSize = context->audioFrames;
	blockSizeResampled = blockSize/decFac;

	scope.setup(2, sr);
	// scope_down.setup(1, sr/decFac);
	decimator.setup(decFac, blockSize, FIR_HIGH, LINEAR);
	interpolator.setup(decFac, blockSizeResampled, FIR_HIGH, LINEAR);

	x = new float[blockSize]();
	y = new float[blockSizeResampled]();
	xhat = new float[blockSize]();

	return true;
}

float phase = 0;
float freq = 44100./100. * 2 * M_PI;
void render(BelaContext *context, void *userData)
{

	for (unsigned int n = 0; n < context->audioFrames; ++n) {
		// x[n] = audioRead(context, n, gInChannel);
		x[n] = sin(phase);
		phase += freq / sr;
	}
	if (phase > 2 * M_PI) phase -= 2 * M_PI;

	decimator.process(y, x);
	interpolator.process(xhat, y);

	for (unsigned int n = 0; n < blockSize; ++n) {
		scope.log(x[n], xhat[n]);
	}

	// for (int n = 0; n < blockSizeResampled; ++n)
	// {
	// 	scope_down.log(y[n]);
	// }

}

void cleanup(BelaContext *context, void *userData)
{
}