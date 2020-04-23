#pragma once

class Oscillator {
public:
	typedef enum {
		sine,
		triangle,
		square,
		sawtooth,
		numOscTypes,
	} Type;

	Oscillator(){};
	Oscillator(float fs, Oscillator::Type type = sine)
	{
		setup(fs, type);
	}
	~Oscillator(){};

	void setup(float fs, Oscillator::Type type = sine);

	float process();
	float process(float frequency);
	void setType(Oscillator::Type type) {
		type_ = type;
	}
	void setFrequency(float frequency) {
		frequency_ = frequency;
	}
	void setPhase(float phase) {
		phase_ = phase;
	}

	float getPhase() { return phase_; }
	float getFrequency() { return frequency_; }
	int getType() { return type_; }

private:
	float phase_;
	float frequency_;
	float invSampleRate_;
	unsigned int type_ = sine;
	void computePhase();
};
