// This code is based on the code credited below, but it has been modified
// further by Adan L Benito Temprano and Giulio Moro
//
//  Created by Nigel Redmon on 11/24/12
//  EarLevel Engineering: earlevel.com
//  Copyright 2012 Nigel Redmon
//
//  For a complete explanation of the code
//  http://www.earlevel.com/main/2012/11/26/biquad-c-source-code/
//
//  License:
//
//  This source code is provided as is, without warranty.
//  You may copy and distribute verbatim copies of this document.
//  You may modify and use this source code to create binary code
//  for your own purposes, free or commercial.
//

#include "Biquad.h"
#include "QuadBiquad.h"

#include <math.h>
// this implementation lives here in order not to require math.h in the public header
template <typename T>
void BiquadCoeffT<T>::calc()
{
	sample_t norm;
	sample_t V = pow(10, fabs(peakGain) / 20.0);
	sample_t K = tan(M_PI * Fc);
	switch (this->type) {
	case lowpass:
		norm = 1 / (1 + K / Q + K * K);
		a0 = K * K * norm;
		a1 = 2 * a0;
		a2 = a0;
		b1 = 2 * (K * K - 1) * norm;
		b2 = (1 - K / Q + K * K) * norm;
		break;
	case highpass:
		norm = 1 / (1 + K / Q + K * K);
		a0 = 1 * norm;
		a1 = -2 * a0;
		a2 = a0;
		b1 = 2 * (K * K - 1) * norm;
		b2 = (1 - K / Q + K * K) * norm;
		break;
	case bandpass:
		norm = 1 / (1 + K / Q + K * K);
		a0 = K / Q * norm;
		a1 = 0;
		a2 = -a0;
		b1 = 2 * (K * K - 1) * norm;
		b2 = (1 - K / Q + K * K) * norm;
		break;
	case notch:
		norm = 1 / (1 + K / Q + K * K);
		a0 = (1 + K * K) * norm;
		a1 = 2 * (K * K - 1) * norm;
		a2 = a0;
		b1 = a1;
		b2 = (1 - K / Q + K * K) * norm;
		break;
	case peak:
		if (peakGain >= 0) { // boost
			norm = 1 / (1 + 1/Q * K + K * K);
			a0 = (1 + V/Q * K + K * K) * norm;
			a1 = 2 * (K * K - 1) * norm;
			a2 = (1 - V/Q * K + K * K) * norm;
			b1 = a1;
			b2 = (1 - 1/Q * K + K * K) * norm;
		}
		else { // cut
			norm = 1 / (1 + V/Q * K + K * K);
			a0 = (1 + 1/Q * K + K * K) * norm;
			a1 = 2 * (K * K - 1) * norm;
			a2 = (1 - 1/Q * K + K * K) * norm;
			b1 = a1;
			b2 = (1 - V/Q * K + K * K) * norm;
		}
		break;
	case lowshelf:
		if (peakGain >= 0) { // boost
			norm = 1 / (1 + sqrt(2) * K + K * K);
			a0 = (1 + sqrt(2*V) * K + V * K * K) * norm;
			a1 = 2 * (V * K * K - 1) * norm;
			a2 = (1 - sqrt(2*V) * K + V * K * K) * norm;
			b1 = 2 * (K * K - 1) * norm;
			b2 = (1 - sqrt(2) * K + K * K) * norm;
		}
		else { // cut
			norm = 1 / (1 + sqrt(2*V) * K + V * K * K);
			a0 = (1 + sqrt(2) * K + K * K) * norm;
			a1 = 2 * (K * K - 1) * norm;
			a2 = (1 - sqrt(2) * K + K * K) * norm;
			b1 = 2 * (V * K * K - 1) * norm;
			b2 = (1 - sqrt(2*V) * K + V * K * K) * norm;
		}
		break;
	case highshelf:
		if (peakGain >= 0) { // boost
			norm = 1 / (1 + sqrt(2) * K + K * K);
			a0 = (V + sqrt(2*V) * K + K * K) * norm;
			a1 = 2 * (K * K - V) * norm;
			a2 = (V - sqrt(2*V) * K + K * K) * norm;
			b1 = 2 * (K * K - 1) * norm;
			b2 = (1 - sqrt(2) * K + K * K) * norm;
		}
		else { // cut
			norm = 1 / (V + sqrt(2*V) * K + K * K);
			a0 = (1 + sqrt(2) * K + K * K) * norm;
			a1 = 2 * (K * K - 1) * norm;
			a2 = (1 - sqrt(2) * K + K * K) * norm;
			b1 = 2 * (K * K - V) * norm;
			b2 = (V - sqrt(2*V) * K + K * K) * norm;
		}
		break;
	}
	return;
}

#include <string.h>
int QuadBiquad::setup(const BiquadCoeff::Settings& settings)
{
	int ret = 0;
	for(auto & b : filters)
		ret |= b.setup(settings);
	update();
	z1 = vmovq_n_f32(0);
	z2 = vmovq_n_f32(0);
	return ret;
}
void QuadBiquad::update()
{
#define QUADBIQUAD_UPDATE(arg,sign) \
{ \
	float32_t data[4] = {sign float32_t(filters[0].arg), sign float32_t(filters[1].arg), sign float32_t(filters[2].arg), sign float32_t(filters[3].arg)}; \
	arg = vld1q_f32(data); \
}
	QUADBIQUAD_UPDATE(a0,+);
	QUADBIQUAD_UPDATE(a1,+);
	QUADBIQUAD_UPDATE(a2,+);
	QUADBIQUAD_UPDATE(b1,-);
	QUADBIQUAD_UPDATE(b2,-);
}

template class BiquadCoeffT<double>; // for Biquad
template class BiquadCoeffT<float>; // for QuadBiquad
