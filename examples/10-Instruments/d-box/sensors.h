/*
 * sensors.h
 *
 *  Created on: May 28, 2014
 *      Author: Victor Zappi
 */

#ifndef SENSORS_H_
#define SENSORS_H_

#include "config.h"

int initSensorLoop(int sensorAddress0, int sensorAddress1, int sensorType);

void sensorLoop(void *);
void *keyboardLoop(void *);


#endif /* SENSORS_H_ */
