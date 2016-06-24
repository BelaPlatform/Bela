/*
 * I2c_TouchKey.cpp
 *
 *  Created on: Oct 14, 2013
 *      Author: Victor Zappi
 */



#include "I2c_TouchKey.h"

#undef DEBUG_I2C_TOUCHKEY

I2c_TouchKey::I2c_TouchKey()
{
	isReady = false;
	sensorType = kSensorTypeTouchKey;
	touchCount = 0;
	sliderSize[0] = sliderSize[1] = sliderSize[2] = -1;
	sliderPosition[0] = sliderPosition[1] = sliderPosition[2] = -1;
	sliderPositionH = -1;
}

int I2c_TouchKey::initTouchKey(int sensorTypeToUse)
{
	sensorType = sensorTypeToUse;
	if(sensorType > 2 || sensorType < 0)
		sensorType = 2;

	numBytesToRead = kSensorBytes[sensorType];

	char buf[3] = { 0x00, 0x01, 0x00 }; // code for centroid mode
	if(write(i2C_file, buf, 3) !=3)
	{
		cout << "Failed to set TouchKey in \"Centroid Mode\" " << endl;
		return 1;
	}

	usleep(5000); // need to give TouchKey enough time to process command

	char buf4[4] = { 0x00, 0x07, 0x00, 0x64}; // code for change minimum touch area
	if(write(i2C_file, buf4, 4) !=4)
	{
		cout << "Failed to set TouchKey minimum touch size" << endl;
		return 1;
	}

	usleep(5000); // need to give TouchKey enough time to process command

	if(sensorType == kSensorTypeDBox2)
		buf[0] = 0x04; // code for data collection
	else
		buf[0] = 0x06; // code for data collection

	if(write(i2C_file, buf, 1) !=1)
	{
		cout << "Failed to prepare data collection " << endl;
		return 2;
	}

	usleep(5000); // need to give TouchKey enough time to process command

	isReady = true;

	return 0;
}


int I2c_TouchKey::readI2C()
{
	bytesRead = read(i2C_file, dataBuffer, numBytesToRead);
	if (bytesRead != numBytesToRead)
	{
		cout << "Failure to read Byte Stream" << endl;
		return 2;
	}
	/*cout << NUM_BYTES << " bytes read" << endl;
	for(int j=0; j<9; j++)
		cout << "\t" << (int)dataBuffer[j];
	cout << endl;
	*/

	touchCount = 0;

	// Old TouchKeys sensors have 3 touch locations plus horizontal positions
	// New D-Box sensors have 5 touch locations but no horizontal position
	// Later D-Box sensors have same data in a different format
	if(sensorType == kSensorTypeDBox1) {
		rawSliderPosition[0] = (((dataBuffer[0] & 0xF0) << 4) + dataBuffer[1]);
		rawSliderPosition[1] = (((dataBuffer[0] & 0x0F) << 8) + dataBuffer[2]);
		rawSliderPosition[2] = (((dataBuffer[3] & 0xF0) << 4) + dataBuffer[4]);
		rawSliderPosition[3] = (((dataBuffer[5] & 0xF0) << 4) + dataBuffer[6]);
		rawSliderPosition[4] = (((dataBuffer[5] & 0x0F) << 8) + dataBuffer[7]);
		rawSliderPositionH = 0x0FFF;
	}
	else if(sensorType == kSensorTypeDBox2) {
		rawSliderPosition[0] = ((dataBuffer[0] << 8) + dataBuffer[1]) & 0x0FFF;
		rawSliderPosition[1] = ((dataBuffer[2] << 8) + dataBuffer[3]) & 0x0FFF;
		rawSliderPosition[2] = ((dataBuffer[4] << 8) + dataBuffer[5]) & 0x0FFF;
		rawSliderPosition[3] = ((dataBuffer[6] << 8) + dataBuffer[7]) & 0x0FFF;
		rawSliderPosition[4] = ((dataBuffer[8] << 8) + dataBuffer[9]) & 0x0FFF;
		rawSliderPositionH = 0x0FFF;
	}
	else {
		rawSliderPosition[0] = (((dataBuffer[0] & 0xF0) << 4) + dataBuffer[1]);
		rawSliderPosition[1] = (((dataBuffer[0] & 0x0F) << 8) + dataBuffer[2]);
		rawSliderPosition[2] = (((dataBuffer[3] & 0xF0) << 4) + dataBuffer[4]);
		rawSliderPosition[3] = 0x0FFF;
		rawSliderPosition[4] = 0x0FFF;
		rawSliderPositionH   = (((dataBuffer[3] & 0x0F) << 8) + dataBuffer[5]);
	}

	for(int i = 0; i < 5; i++)
	{
		if(rawSliderPosition[i] != 0x0FFF) // 0x0FFF means no touch
		{
			if(sensorType != kSensorTypeTouchKey)
				sliderPosition[i] = (float)rawSliderPosition[i] / 3200.0;   // New sensors; 26 pads (128 * 25)
			else
				sliderPosition[i] = (float)rawSliderPosition[i] / 2432.0;	// White keys, vertical (128 * 19)

			if(sliderPosition[i] > 1.0)
				sliderPosition[i] = 1.0;

			if(sensorType == kSensorTypeDBox2) {
				sliderSize[i]     = (float)((dataBuffer[2*i + 10] << 8) + dataBuffer[2*i + 11]) / 5000.0;
				if(sliderSize[i] > 1.0)
					sliderSize[i] = 1.0;
			}
			else if(sensorType == kSensorTypeDBox1)
				sliderSize[i]     = (float)dataBuffer[i + 8] / 255.0;
			else {
				if(i < 3)
					sliderSize[i]     = (float)dataBuffer[i + 6] / 255.0;
				else
					sliderSize[i]     = 0.0;
			}
			touchCount++;
		}
		else {
			sliderPosition[i] = -1.0;
			sliderSize[i]     = 0.0;
		}
	}



	if(rawSliderPositionH != 0x0FFF)
	{
		sliderPositionH = (float)rawSliderPositionH / 256.0;			// White keys, horizontal (1 byte + 1 bit)
	}
	else
		sliderPositionH = -1.0;

#ifdef DEBUG_I2C_TOUCHKEY
	for(int i = 0; i < bytesRead; i++) {
		printf("%2X ", dataBuffer[i]);
	}
	cout << touchCount << " touches: ";
	for(int i = 0; i < touchCount; i++) {
		cout << "(" << sliderPosition[i] << ", " << sliderSize[i] << ") ";
	}
	cout << "H = " << sliderPositionH << endl;
#endif

	return 0;
}


I2c_TouchKey::~I2c_TouchKey()
{}

