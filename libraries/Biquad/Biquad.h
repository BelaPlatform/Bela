// This code is based on the code credited below, but it has been modified further
//
//  Biquad.h
//
//  Created by Nigel Redmon on 11/24/12
//  EarLevel Engineering: earlevel.com
//  Copyright 2012 Nigel Redmon
//
//  For a complete explanation of the Biquad code:
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

/**
 * A class to compute Biquad filter coefficents and process biquad filters.
 */
class Biquad {
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
		Biquad();
		Biquad(const Settings& settings);
		~Biquad();
		int setup(const Settings& settings);

		/**
		 * Process one input sample and return one output sample.
		 */
		float process(float in);

		/**
		 * Reset the internal state of the filter to 0.
		 */
		void clean();

		void setType(Type type);
		void setQ(double Q);
		void setFc(double Fc);
		void setPeakGain(double peakGainDB);

		Type getType();
		double getQ();
		double getFc();
		double getPeakGain();

		double getStartingQ();
		double getStartingFc();
		double getStartingPeakGain();

	protected:
		void calcBiquad(void);

		Type type;
		double a0, a1, a2, b1, b2;
		double Fc, Q, peakGain;
		double Fs;
		double startFc, startQ, startPeakGain;
		double z1, z2;
};

inline float Biquad::process(float in) {
	double out = in * a0 + z1;
	z1 = in * a1 + z2 - b1 * out;
	z2 = in * a2 - b2 * out;
	return out;
}
