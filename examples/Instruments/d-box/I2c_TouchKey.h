/*
 * I2c.h
 *
 *  Created on: Oct 14, 2013
 *      Author: Victor Zappi
 */

#ifndef I2CTK_H_
#define I2CTK_H_

#include <I2c.h>

// #define NUM_BYTES_OLD 9
// #define NUM_BYTES_NEW 13

#define MAX_SENSOR_BYTES 20

enum {
	kSensorTypeTouchKey = 0,
	kSensorTypeDBox1 = 1,
	kSensorTypeDBox2 = 2
};

static const int kSensorBytes[3] = {9, 13, 20};

class I2c_TouchKey : public I2c
{
private:
	bool isReady;
	int sensorType;
	int numBytesToRead;

	// read NUM_BYTES bytes, which have to be properly parsed
	i2c_char_t dataBuffer[MAX_SENSOR_BYTES];

	int rawSliderPosition[5];
	int rawSliderPositionH;

	int touchCount;
	float sliderSize[5];
	float sliderPosition[5];
	float sliderPositionH;


public:
	int initTouchKey(int sensorTypeToUse = kSensorTypeTouchKey);
	int readI2C();
	int getTouchCount();
	float * getSlidersize();
	float * getSliderPosition();
	float getSliderPositionH();

	bool ready() { return isReady; }

	bool setup(int sensorType);
	void cleanup();

	I2c_TouchKey();
	I2c_TouchKey(int sensorType);
	~I2c_TouchKey();

};

inline int I2c_TouchKey::getTouchCount()
{
	return touchCount;
}

inline float * I2c_TouchKey::getSlidersize()
{
	return sliderSize;
}

inline float * I2c_TouchKey::getSliderPosition()
{
	return sliderPosition;
}

inline float I2c_TouchKey::getSliderPositionH()
{
	return sliderPositionH;
}





#endif /* I2CTK_H_ */
