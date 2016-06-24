/*
 * PinkNoise.cpp
 *
 *  Created on: Oct 15, 2013
 *      Author: Victor Zappi
 */

#include "PinkNoise.h"

// miserable definition to init static const array members...otherwise gets error when PinkNoise.h is included into another header file
const float PinkNoise::A[] = { 0.02109238, 0.07113478, 0.68873558 }; // rescaled by (1+P)/(1-P)
const float PinkNoise::P[] = { 0.3190,  0.7756,  0.9613  };




