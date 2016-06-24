/*
 * SimpleSynth.h
 *
 *  Created on: Oct 22, 2013
 *      Author: Victor Zappi
 */

#ifndef DBOXSYNTH_H_
#define DBOXSYNTH_H_

#include <iostream>
#include <string>
#include <stdio.h>
#include <stdlib.h>

#include "Synth.h"


class DBoxSynth : public Synth
{
public:
	DBoxSynth(unsigned int rate, unsigned long buffer_size);
	double getSample();
	double *getBlock(int block_size);


private:
	Sampler *smp;

};




#endif /* DBOXSYNTH_H_ */
