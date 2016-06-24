/*
 * DboxSensors.h
 *
 *  Created on: May 19, 2014
 *      Author: Victor Zappi
 */

#ifndef DBOXSENSORS_H_
#define DBOXSENSORS_H_

#include <stdio.h>
#include <sys/mount.h>	// mount()
#include <string.h> 	// strerror()
#include <fstream> 		// fstream
#include <iostream>
#include <unistd.h> 	// usleep()
#include <glob.h>		// glob()
#include <sys/time.h>	// elapsed time
#include <sys/stat.h>	// mkdir()
#include <algorithm>	// reverse() [string...]

#include "I2c_TouchKey.h"
#include "AnalogInput.h"
#include <GPIOcontrol.h>	// TODO wrap this into a class

/*---------------------------------------------------------------------------------------------------------------------------------------------------
 * This class retrieves data from all the connected sensors,
 * logs them
 * and exposes to the main only the values needed to synthesize sound
 *
 * The simple instrument has:
 *
 *
 *
 *---------------------------------------------------------------------------------------------------------------------------------------------------
 */
class DboxSensors
{
public:
	int initSensors(int tk0_bus, int tk0_address, int tk1_bus, int tk1_address, int tk_file, int fsr_pin, int fsrmax, int sensorTypeToUse, int gpio0=-1, int gpio1=-1);
	int readSensors();
	int getTKTouchCount(int index);
	float *getTKXPositions(int index);
	float getTKYPosition(int index);
	float *getTKTouchSize(int index);
	double getFSRVAlue();
	int getDigitalIn(int index);

	DboxSensors();
	~DboxSensors();

private:
	int sensorType;

	I2c_TouchKey TK0;
	int tk0_touchCnt;
	float tk0_touchPosX[5];
	float tk0_touchPosY;
	float tk0_touchSize[5];

	I2c_TouchKey TK1;
	int tk1_touchCnt;
	float tk1_touchPosX[5];
	float tk1_touchPosY;
	float tk1_touchSize[5];

	AnalogInput FSR;
	int fsr_pinNum;
	double fsr_read;
	int fsr_max;

	unsigned int digitalIn[2];
	int fdDi[2];
	int gpio[2];

	void resetSensorsData();

};



//--------------------------------------------------------------------------------
// read interface
inline int DboxSensors::getTKTouchCount(int index)
{
	if(index==0)
		return tk0_touchCnt;
	else
		return tk1_touchCnt;
}

inline float *DboxSensors::getTKXPositions(int index)
{
	if(index==0)
		return tk0_touchPosX;
	else
		return tk1_touchPosX;
}

inline float DboxSensors::getTKYPosition(int index)
{
	if(index==0)
		return tk0_touchPosY;
	else
		return tk1_touchPosY;
}

inline float *DboxSensors::getTKTouchSize(int index)
{
	if(index==0)
		return tk0_touchSize;
	else
		return tk1_touchSize;
}

inline double DboxSensors::getFSRVAlue()
{
	return fsr_read;
}

inline int DboxSensors::getDigitalIn(int index)
{
	return digitalIn[index];
}
//--------------------------------------------------------------------------------


#endif /* DBOXSENSORS_H_ */
