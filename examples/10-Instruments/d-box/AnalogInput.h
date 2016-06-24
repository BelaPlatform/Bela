/*
 * AnalogInput.h
 *
 *  Created on: Oct 17, 2013
 *      Author: Victor Zappi
 */

#ifndef ANALOGINPUT_H_
#define ANALOGINPUT_H_

#include <iostream>
#include <sstream>
#include <stdio.h>
#include <stdlib.h>
#include <glob.h>

using namespace std;

class AnalogInput
{
private:
	FILE *ActivateAnalogHnd;
	string activateAnalogPath;
	bool analogIsSet;

	FILE *AnalogInHnd;
	string analogInPath;
	bool helperNumFound;

	// suport var for init
	string startPath;
	string readPath;

	glob_t  globbuf;

	// support vars for pin reading
	long lSize;
	char * buffer;
	size_t result;

	bool verbose;

public:
	AnalogInput();
	~AnalogInput();

	int initAnalogInputs();
	int read(int index);

};




#endif /* ANALOGINPUT_H_ */
