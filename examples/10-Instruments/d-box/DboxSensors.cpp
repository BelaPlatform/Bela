/*
 * DboxSensors.cpp
 *
 *  Created on: May 19, 2014
 *      Author: Victor Zappi
 */


#include "DboxSensors.h"
#include "config.h"

using namespace std;



int DboxSensors::initSensors(int tk0_bus, int tk0_address, int tk1_bus, int tk1_address, int tk_file, int fsr_pin, int fsrmax, int sensorTypeToUse, int gpio_0, int gpio_1)
{
	sensorType = sensorTypeToUse;
	// init first touch key on i2c bus
	if(tk0_address >= 0) {
		if(TK0.initI2C_RW(tk0_bus, tk0_address, tk_file)>0)
			return 1;
		if(TK0.initTouchKey(sensorType)>0)
			return 2;
	}

	// init second touch key on i2c bus
	if(tk1_address >= 0) {
		if(TK1.initI2C_RW(tk1_bus, tk1_address, tk_file)>0)
			return 1;
		if(TK1.initTouchKey(sensorType)>0)
			return 2;
	}

	// init fsr on analog input pin
	fsr_pinNum	= fsr_pin;
	fsr_max	  	= fsrmax;

	if(FSR.initAnalogInputs()>0)
		return 3;

	gpio[0] = gpio_0;
	if(gpio[0]!=-1)
	{
		fdDi[0] = gpio_export(gpio[0]);
		if(fdDi[0] == -1)
			return 4;
	}
	digitalIn[0] = 1;

	return 0;
}


int DboxSensors::readSensors()
{
	// write data into first touch key
	if(TK0.ready()) {
		if(TK0.readI2C()>0)
			return 1;

		// retrieve data from first touch key
		tk0_touchCnt = TK0.getTouchCount();
	}
	else
		tk0_touchCnt = 0;

	// write data into second touch key
	if(TK1.ready()) {
		if(TK1.readI2C()>0)
			return 1;
		// retrieve data from second touch key
		tk1_touchCnt = TK1.getTouchCount();
	}
	else
		tk1_touchCnt = 0;


	int max = 3;
	if(sensorType != kSensorTypeTouchKey)
		max = 5;
	// if touches detected on main touch key
	if(tk0_touchCnt == 0 && tk1_touchCnt == 0)
		resetSensorsData();
	else
	{
		for(int i=0; i<max; i++)
		{
			tk0_touchPosX[i] = TK0.getSliderPosition()[i];
			tk0_touchSize[i] = TK0.getSlidersize()[i];

			tk1_touchPosX[i] = TK1.getSliderPosition()[i];
			tk1_touchSize[i] = TK1.getSlidersize()[i];
		}
		tk0_touchPosY 	 = TK0.getSliderPositionH();
		tk1_touchPosY 	 = TK1.getSliderPositionH();
		fsr_read		 = (double)FSR.read(fsr_pinNum);
	}

	if(gpio[0]!=-1)
	{
		if(gpio_read(fdDi[0], &digitalIn[0])==-1)
			return 1;
	}

	return 0;
}



DboxSensors::DboxSensors()
{
	resetSensorsData();
}



DboxSensors::~DboxSensors()
{
	if(gpio[0]!=-1)
		gpio_dismiss(fdDi[0], gpio[0]);
}



//--------------------------------------------------------------------------------------------------------
// private methods
//--------------------------------------------------------------------------------------------------------

// idle values
void DboxSensors::resetSensorsData()
{
	int max = 3;
	if(sensorType != kSensorTypeTouchKey)
		max = 5;

	for(int i=0; i<max; i++)
	{
		tk0_touchPosX[i] = -1;
		tk0_touchPosY	 = -1;
		tk0_touchSize[i] = 0;

		tk1_touchPosX[i] = -1;
		tk1_touchPosY	 = -1;
		tk1_touchSize[i] = 0;

		fsr_read		 = 0;
	}

	return;
}






