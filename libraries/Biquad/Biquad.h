// This code is based on the code credited below, but it has been modified
// further by Adan L Benito Temprano and Giulio Moro
//
//  Created by Nigel Redmon on 11/24/12
//  EarLevel Engineering: earlevel.com
//  Copyright 2012 Nigel Redmon
//
//  For a complete explanation of the code:
//  http://www.earlevel.com/main/2012/11/25/biquad-c-source-code/
//
//  License:
//
//  This source code is provided as is, without warranty.
//  You may copy and distribute verbatim copies of this document.
//  You may modify and use this source code to create binary code
//  for your own purposes, free or commercial.
//

#pragma once

class BiquadCoeff
{
public:
	typedef enum
	{
		lowpass,
		highpass,
		bandpass,
		notch,
		peak,
		lowshelf,
		highshelf
	} Type;
	struct Settings {
		double fs; ///< Sample rate in Hz
		Type type; ///< Filter type
		double cutoff; ///< Cutoff in Hz
		double q; ///< Quality factor
		double peakGainDb; ///< Maximum filter gain
	};
};

/**
 * A class to compute Biquad filter coefficents.
 */
template <typename T>
class BiquadCoeffT : public BiquadCoeff
{
public:
	typedef T sample_t;
	BiquadCoeffT() {}
	BiquadCoeffT(const Settings& settings) { setup(settings); }
	int setup(const Settings& settings)
	{
		type = settings.type;
		Fs = settings.fs;
		Fc = settings.cutoff / Fs;
		Q = settings.q;
		peakGain = settings.peakGainDb;
		calc();
		return 0;
	}

	void setType(Type type) {
		this->type = type;
		calc();
	}
	void setQ(sample_t Q) {
		this->Q = Q;
		calc();
	}
	void setFc(sample_t Fc) {
		this->Fc = Fc/this->Fs;
		calc();
	}
	void setPeakGain(sample_t peakGainDB) {
		this->peakGain = peakGainDB;
		calc();
	}

	Type getType() { return type; }
	sample_t getQ() { return Q; }
	sample_t getFc() { return Fc; }
	sample_t getPeakGain() { return peakGain; }

	sample_t a0, a1, a2, b1, b2;
private:
	sample_t Fc, Q, peakGain;
	sample_t Fs;
	Type type;
	void calc(void);
};

/**
 * A class to process biquad filters.
 *
 * These filters use `double` data types internally.
 */
class Biquad : public BiquadCoeffT<double> {
public:
	Biquad() {};
	Biquad(const Settings& s) {
		setup(s);
	}
	/**
	 * Process one input sample and return one output sample.
	 */
	sample_t process(sample_t in)
	{
		sample_t out = in * a0 + z1;
		z1 = in * a1 + z2 - b1 * out;
		z2 = in * a2 - b2 * out;
		return out;
	}

	/**
	 * Reset the internal state of the filter to 0;
	 */
	void clean()
	{
		z1 = z2 = 0.0;
	}
protected:
	sample_t z1 = 0;
	sample_t z2 = 0;
};
extern template class BiquadCoeffT<double>;
