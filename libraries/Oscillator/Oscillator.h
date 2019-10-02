/***** Oscillator.h *****/
#pragma once
#include <cmath>
class Oscillator {
	public:
		Oscillator(){};
		Oscillator(unsigned int fs, float frequency, unsigned int type = sine, float initialPhase = 0)
		{
			setup(fs, frequency, type, initialPhase);
		}
		~Oscillator(){};
		
		void setup(unsigned int fs, float frequency, unsigned int type = sine, float initialPhase = 0)
		{
			fs_ = fs;
			invSampleRate_ = 1.0 / fs_;
			setFrequency(frequency);
			setType(type);	
			phase_ = (-M_PI < initialPhase < M_PI) ? initialPhase : 0;
		}

		float process()
		{
			float out;
			switch(type_) {
				default:
				// SINEWAVE
				case sine:
					out = sinf(phase_);
					break;
				// TRIANGLE WAVE
				case triangle:
					if (phase_ > 0) {
					      out = -1 + (2 * phase_ / (float)M_PI);
					} else {
					      out = -1 - (2 * phase_/ (float)M_PI);
					}
					break;
				// SQUARE WAVE
				case square:
					if (phase_ > 0) {
					      out = 1;
					} else {
					      out = -1;
					}
					break;
				// SAWTOOTH
				case sawtooth:
					out = 1 - (1 / (float)M_PI * phase_);
					break;
			}
			computePhase();
			return out;
		}
		
		unsigned int setType(unsigned int type) {
			type_ = (type < numOscTypes) ? type : sawtooth;
			return type_;
		}
		void setFrequency(float frequency) {
			frequency_ = (frequency < 0.5*fs_) ? frequency : 0.5*fs_;
		}
		
		float getPhase() { return phase_; }	
		float getFrequency() { return frequency_; }
		int getType() { return type_; }
		
		enum osc_type
		{
			sine,		// 0
			triangle,	// 1
			square,		// 2
			sawtooth,	// 3
			numOscTypes
		};

	private:
		float phase_ = 0;
		float frequency_;
		unsigned int fs_;
		float invSampleRate_;
		unsigned int type_ = sine;

		void computePhase() {
			// Compute phase
			phase_ += 2.0f * (float)M_PI * frequency_ * invSampleRate_;
			if(phase_ > M_PI)
				phase_ -= 2.0f * (float)M_PI;
		}
};
