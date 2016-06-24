/*
 * FeedbackOscillator.cpp
 *
 * Recursive phase-shift oscillator implemented
 * on the matrix
 *
 * Andrew McPherson 2014
 */

#include "FeedbackOscillator.h"
#include <cstdlib>
#include <cmath>

#define COEFF_B0 	0
#define COEFF_B1	1
#define COEFF_A1	2

FeedbackOscillator::FeedbackOscillator()
: wavetable1(0), wavetable2(0)
{

}

FeedbackOscillator::~FeedbackOscillator() {
	if(wavetable1 != 0)
		free(wavetable1);
	if(wavetable2 != 0)
		free(wavetable2);

}

// Initialise the settings for the feedback oscillator
void FeedbackOscillator::initialise(int maxTableSize, float hpfCutoffFrequency, float matrixSampleRate) {
	wavetableMaxLength = maxTableSize;
	if(wavetable1 != 0)
		free(wavetable1);
	if(wavetable2 != 0)
		free(wavetable2);

	wavetable1 = (float *)malloc(maxTableSize * sizeof(float));
	wavetable2 = (float *)malloc(maxTableSize * sizeof(float));

	float omega = tan(M_PI * hpfCutoffFrequency / matrixSampleRate);
	float n = 1.0f / (1.0f + omega);

	coeffs[COEFF_A1] = (omega - 1.0f) * n;
	coeffs[COEFF_B0] = n;
	coeffs[COEFF_B1] = -n;

	for(int n = 0; n < maxTableSize; n++)
		wavetable1[n] = wavetable2[n] = 0;

	wavetableRead = wavetable1;
	wavetableWrite = wavetable2;
	wavetableWritePointer = 0;
	sampleCount = lastTriggerCount = 0;
}

// Process one sample and store the output value
// Returns true if the wavetable needs rendering
int FeedbackOscillator::process(float input, float *output) {
	float outFloat = coeffs[COEFF_B0] * input + coeffs[COEFF_B1] * lastInput - coeffs[COEFF_A1] * lastOutput;
	int requestRenderLength = 0;

	if(outFloat < -0.5)
		*output = 0;
	else if(outFloat > 0.5)
		*output = 1;
	else
		*output = outFloat + 0.5;

	if(canTrigger && outFloat > 0 && lastOutput <= 0) {
		triggered = true;
		requestRenderLength = wavetableWritePointer;	// How many samples stored thus far?
		if(requestRenderLength < 4)
			requestRenderLength = 0;	// Ignore anything with fewer than 4 points

		lastTriggerCount = sampleCount;
		canTrigger = false;
		wavetableWritePointer = 0;

		// Swap buffers
		float *temp = wavetableWrite;
		wavetableWrite = wavetableRead;
		wavetableRead = temp;
	}

	if(triggered) {
		wavetableWrite[wavetableWritePointer] = outFloat;
		if(++wavetableWritePointer >= wavetableMaxLength) {
			triggered = false;
			wavetableWritePointer = 0;
		}
	}

	if(sampleCount - lastTriggerCount > 40)
		canTrigger = true;

	sampleCount++;

	lastOutput = outFloat;
	lastInput = input;

	return requestRenderLength;
}
