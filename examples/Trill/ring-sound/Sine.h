/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\

http://bela.io
*/
#pragma once
// Sine.h: header file for sine oscillator class

class Sine {
public:
	Sine(); // Default constructor
	Sine(float sampleRate); // Constructor with argument

	void setup(float rate); // Set the sample rate
	void setFrequency(float f); // Set the oscillator frequency
	float getFrequency(); // Get the oscillator frequency

	float nextSample(); // Get the next sample and update the phase

	~Sine(); // Destructor

private:
	float sampleRate_; // Sample rate of the audio
	float frequency_; // Frequency of the oscillator
	float phase_; // Phase of the oscillator
};
