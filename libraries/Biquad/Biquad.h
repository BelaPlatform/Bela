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

#ifndef Biquad_h
#define Biquad_h


class Biquad {
	public:
		Biquad();
		Biquad(double Fc, float Fs, int type, double Q = 0.707, double peakGainDB = 0.0);
		~Biquad();
		void setType(int type);
		void setQ(double Q);
		void setFc(double Fc);
		void setPeakGain(double peakGainDB);
		int setup(double Fc, float Fs, int type, double Q = 0.707, double peakGainDB = 0.0);
		float process(float in);

		double getQ();
		double getFc();
		double getPeakGain();

		double getStartingQ();
		double getStartingFc();
		double getStartingPeakGain();

		enum filter_type
		{
			lowpass = 0,
			highpass,
			bandpass,
			notch,
			peak,
			lowshelf,
			highshelf
		};

	protected:
		void calcBiquad(void);

		int type;
		double a0, a1, a2, b1, b2;
		double Fc, Q, peakGain;
		float Fs;
		double startFc, startQ, startPeakGain;
		double z1, z2;
};

inline double Biquad::getQ()
{
	return Q;
}

inline double Biquad::getFc()
{
	return Fc;
}

inline double Biquad::getPeakGain()
{
	return peakGain;
}

inline double Biquad::getStartingQ()
{
	return startQ;
}

inline double Biquad::getStartingFc()
{
	return startFc;
}

inline double Biquad::getStartingPeakGain()
{
	return startPeakGain;
}

inline float Biquad::process(float in) {
	double out = in * a0 + z1;
	z1 = in * a1 + z2 - b1 * out;
	z2 = in * a2 - b2 * out;
	return out;
}

#endif // Biquad_h
