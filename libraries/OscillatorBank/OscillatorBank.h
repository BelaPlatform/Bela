#pragma once
#include <string.h>
#include <stdio.h>

extern "C" {
	// Function prototype for ARM assembly implementation of oscillator bank
	void oscillator_bank_neon(int numAudioFrames, float *audioOut,
							  int activePartialNum, int lookupTableSize,
							  float *phases, float *frequencies, float *amplitudes,
							  float *freqDerivatives, float *ampDerivatives,
							  float *lookupTable);
}

/**
 * A class for computing a table-lookup oscillator bank.
 * The internal routine is highly optimized, written in NEON assembly.
 * All oscillators in the bank share the same wavetable. Linear interpolation
 * is used.
 */
class OscillatorBank{
public:
	OscillatorBank():
	sampleRate(1),
	wavetable(NULL),
	phases(NULL),
	frequencies(NULL),
	amplitudes(NULL),
	dFrequencies(NULL),
	dAmplitudes(NULL)
	{}

	~OscillatorBank(){
		free(wavetable);
		free(phases);
		free(frequencies);
		free(amplitudes);
		free(dFrequencies);
		free(dAmplitudes);
	}

	/**
	 * Initialize the oscillator bank, allocating the memory
	 * with the appropriate alignment required by the NEON code.
	 *
	 * @param newSampleRate the sampling rate of the output samples. This affects the
	 * internal scaling of the oscillator frequencies.
	 * @param newWavetableLength the length of the wavetable. The internal wavetable
	 * will have length *(newWavetableLength + 1)*.
	 * @param newNumOscillators the number of oscillators to use. The class will internally
	 * increment and store the frequency, amplitude and phase of each oscillator.
	 *
	 * @return 0 upon success, a negative value otherwise.
	 */
	int setup(float newSampleRate, unsigned int newWavetableLength, unsigned int newNumOscillators){
		wavetableLength = newWavetableLength;
		numOscillators = newNumOscillators;
		sampleRate = newSampleRate;
		// Initialise the sine wavetable
		if(posix_memalign((void **)&wavetable, 16, (wavetableLength + 1) * sizeof(float))) {
			fprintf(stderr, "Error allocating wavetable\n");
			return -1;
		}

		// Allocate the other buffers
		if(posix_memalign((void **)&phases, 16, numOscillators * sizeof(float))) {
			fprintf(stderr, "Error allocating phase buffer\n");
			return -1;
		}
		if(posix_memalign((void **)&frequencies, 16, numOscillators * sizeof(float))) {
			fprintf(stderr, "Error allocating frequency buffer\n");
			return -1;
		}
		if(posix_memalign((void **)&amplitudes, 16, numOscillators * sizeof(float))) {
			fprintf(stderr, "Error allocating amplitude buffer\n");
			return -1;
		}
		if(posix_memalign((void **)&dFrequencies, 16, numOscillators * sizeof(float))) {
			fprintf(stderr, "Error allocating frequency derivative buffer\n");
			return -1;
		}
		if(posix_memalign((void **)&dAmplitudes, 16, numOscillators * sizeof(float))) {
			fprintf(stderr, "Error allocating amplitude derivative buffer\n");
			return -1;
		}
		clearArrays();
			return 0;
	}

	/**
	 * Get the wavetable. It is the responsibilty of the user to
	 * fill it with the waveform that will be played by the oscillators.
	 * The internally stored wavetable will have length `(getWavetableLength() + 1)`
	 * The user should fill the last sample with the same value as the first sample.
	 *
	 * @return a pointer to the wavetable array, of length `(getWavetableLength() + 1)`
	 */
	float* getWavetable(){
		return wavetable;
	}

	/**
	 * Get the length of the wavetable. The internally allocated array
	 * is actually of size `getWavetableLength() + 1`.
	 *
	 * @return the length of the wavtable.
	 */
	int getWavetableLength(){
		return wavetableLength;
	}

	/**
	 * Get the number of oscillators.
	 *
	 * @return the number of oscillators.
	 */
	int getNumOscillators(){
		return numOscillators;
	}

	/**
	 * Get the array of amplitudes. This array
	 * has length `getNumOscillators()`
	 *
	 * @return a pointer to the array of amplitudes.
	 */
	float* getAmplitudes(){
		return amplitudes;
	}

	/**
	 * Get the internal array of phases which hold the state of
	 * the oscillators. This array has length `getNumOscillators()`
	 *
	 * @return a pointer to the arrat of phases.
	 */
	float* getPhases(){
		return phases;
	}

	/**
	 * Sets the amplitude of a given oscillator.
	 *
	 * @param n the oscillator to set
	 * @param amplitude the amplitude of the oscillator
	 */
	void setAmplitude(int n, float amplitude){
		amplitudes[n] = amplitude;
	}

	/**
	 * Sets the frequency for a given oscillator.
	 *
	 * @param n the oscillator to set
	 * @param frequency the frequency of the oscillator
	 */
	void setFrequency(int n, float frequency){
	// For efficiency, frequency is internally stored in change in wavetable position per sample, not Hz or radians
		frequencies[n] = frequency * (float)wavetableLength / sampleRate;
	}

	/**
	 * Clears the internal arrays which hold the states of the
	 * oscillator bank.
	 */
	void clearArrays(){
		memset(phases, 0, sizeof(float)*numOscillators);
		memset(dFrequencies, 0, sizeof(float)*numOscillators);
		memset(dAmplitudes, 0, sizeof(float)*numOscillators);
	}

	/**
	 * Process the oscillator bank, update the internal states
	 * and return the output values .
	 *
	 * @param frames the number of frames to process
	 * @param output the array where the \p frames output values will be stored.
	 */
	void process(unsigned int frames, float* output){
		// Initialise buffer to 0
		memset(output, 0, frames * sizeof(float));
		oscillator_bank_neon(frames, output,
				numOscillators, wavetableLength,
				phases, frequencies, amplitudes,
				dFrequencies, dAmplitudes,
				wavetable);
	}

private:
	float sampleRate;
	int numOscillators;
	int wavetableLength;
	float *wavetable;		// Buffer holding the precalculated sine lookup table
	float *phases;			// Buffer holding the phase of each oscillator
	float *frequencies;	// Buffer holding the frequencies of each oscillator
	float *amplitudes;		// Buffer holding the amplitudes of each oscillator
	float *dFrequencies;	// Buffer holding the derivatives of frequency
	float *dAmplitudes;	// Buffer holding the derivatives of amplitude
};
