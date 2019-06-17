/*
 * FeedbackOscillator.h
 *
 *  Created on: June 8, 2014
 *      Author: Andrew McPherson
 */

#ifndef FEEDBACKOSCILLATOR_H
#define FEEDBACKOSCILLATOR_H

class FeedbackOscillator
{
public:
	FeedbackOscillator();
	~FeedbackOscillator();

	// Initialise the settings for the feedback oscillator
	void initialise(int maxTableSize, float hpfCutoffFrequency, float matrixSampleRate);

	// Process one sample and store the output value
	// Returns the length of table to interpolate; or 0 if nothing to process further
	int process(float input, float *output);

	float *wavetable() { return wavetableRead; }

private:
	float coeffs[3];			// Coefficients of first-order high-pass filter
	float lastInput;			// last input sample for HPF
	float lastOutput;			// last output sample of HPF
	bool triggered;				// whether we are currently saving samples
	bool canTrigger;			// whether we are able to begin saving samples
	int wavetableMaxLength;		// how long the stored wavetable can be
	int sampleCount;			// how many samples have elapsed
	int lastTriggerCount;		// sample count when we last triggered

	float *wavetable1, *wavetable2;			// Two wavetables where we record samples
	float *wavetableRead, *wavetableWrite;	// Pointers to the above wavetables
	int wavetableWritePointer;				// Where we are currently writing
};

#endif
