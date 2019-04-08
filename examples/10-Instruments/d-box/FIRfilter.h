/*
 * FIRfilter.h
 *
 *  Created on: Aug 5, 2014
 *      Author: Victor Zappi and Andrew McPherson
 */

#ifndef FIRFILTER_H_
#define FIRFILTER_H_

#define ENABLE_NE10_FIR_FLOAT_NEON	// Define needed for Ne10 library
#include <libraries/ne10/NE10.h>

//#define FILTER_TAP_NUM 21
//ne10_float32_t filterTaps[FILTER_TAP_NUM] = {
//	0.000350,
//	0.001133,
//	0.002407,
//	0.004203,
//	0.006468,
//	0.009057,
//	0.011748,
//	0.014265,
//	0.016323,
//	0.017671,
//	0.018141,
//	0.017671,
//	0.016323,
//	0.014265,
//	0.011748,
//	0.009057,
//	0.006468,
//	0.004203,
//	0.002407,
//	0.001133,
//	0.000350
//};
#define FILTER_TAP_NUM 31
ne10_float32_t filterTaps[FILTER_TAP_NUM] = {
		0.000018,
		0.000043,
		0.000078,
		0.000125,
		0.000183,
		0.000252,
		0.000330,
		0.000415,
		0.000504,
		0.000592,
		0.000677,
		0.000754,
		0.000818,
		0.000866,
		0.000897,
		0.000907,
		0.000897,
		0.000866,
		0.000818,
		0.000754,
		0.000677,
		0.000592,
		0.000504,
		0.000415,
		0.000330,
		0.000252,
		0.000183,
		0.000125,
		0.000078,
		0.000043,
		0.000018
};

#endif /* FIRFILTER_H_ */
