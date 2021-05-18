#include "CentroidDetection.h"

// a small helper class, whose main purpose is to wrap the #include
// and make all the variables related to it private and multi-instance safe
class CentroidDetection::CalculateCentroids
{
public:
	typedef CentroidDetection::WORD WORD;
	typedef uint8_t BYTE;
	typedef uint8_t BOOL;
	WORD* CSD_waSnsDiff;
	WORD wMinimumCentroidSize = 0;
	BYTE SLIDER_BITS = 7;
	WORD wAdjacentCentroidNoiseThreshold = 400; // Trough between peaks needed to identify two centroids
	// calculateCentroids is defined here:
#include "calculateCentroids.h"
	void processCentroids(WORD *wVCentroid, WORD *wVCentroidSize, BYTE MAX_NUM_CENTROIDS, BYTE FIRST_SENSOR_V, BYTE LAST_SENSOR_V, BYTE numSensors) {
		long temp;
		signed char firstActiveSensor;
		signed char lastActiveSensor;
		BOOL bActivityDetected;
		BYTE counter;
		WORD posEndOfLoop = (LAST_SENSOR_V - FIRST_SENSOR_V) << SLIDER_BITS;
#include "processCentroids.h"
	}
};

CentroidDetection::CentroidDetection(unsigned int numReadings, unsigned int maxNumCentroids, float sizeScale)
{
	setup(numReadings, maxNumCentroids, sizeScale);
}

CentroidDetection::CentroidDetection(const std::vector<unsigned int>& order, unsigned int maxNumCentroids, float sizeScale)
{
	setup(order, maxNumCentroids, sizeScale);
}

int CentroidDetection::setup(unsigned int numReadings, unsigned int maxNumCentroids, float sizeScale)
{
	std::vector<unsigned int> order;
	for(unsigned int n = 0; n < numReadings; ++n)
		order.push_back(n);
	return setup(order, maxNumCentroids, sizeScale);
}

int CentroidDetection::setup(const std::vector<unsigned int>& order, unsigned int maxNumCentroids, float sizeScale)
{
	this->order = order;
	setWrapAround(0);
	this->maxNumCentroids = maxNumCentroids;
	centroidBuffer.resize(maxNumCentroids);
	sizeBuffer.resize(maxNumCentroids);
	centroids.resize(maxNumCentroids);
	sizes.resize(maxNumCentroids);
	data.resize(order.size());
	setSizeScale(sizeScale);
	cc = std::shared_ptr<CalculateCentroids>(new CalculateCentroids());
	setMultiplierBits(cc->SLIDER_BITS);
	num_touches = 0;
	return 0;
}

void CentroidDetection::setWrapAround(unsigned int n)
{
	num_sensors = order.size() + n;
}

void CentroidDetection::setMultiplierBits(unsigned int n)
{
	cc->SLIDER_BITS = n;
	locationScale = order.size() * (1 << cc->SLIDER_BITS);
}

void CentroidDetection::process(const DATA_T* rawData)
{
	for(unsigned int n = 0; n < order.size(); ++n)
	{
		float val = rawData[order[n]] * (1 << 12);
		val -= noiseThreshold;
		if(val < 0)
			val = 0;
		data[n] = val;
	}
	cc->CSD_waSnsDiff = data.data();
	cc->processCentroids(centroidBuffer.data(), sizeBuffer.data(), maxNumCentroids, 0, order.size(), num_sensors);

	unsigned int locations = 0;
	// Look for 1st instance of 0xFFFF (no touch) in the buffer
	unsigned int i;
	for(i = 0; i < centroidBuffer.size(); ++i)
	{
		if(0xffff == centroidBuffer[i])
			break;// at the first non-touch, break
		centroids[i] = centroidBuffer[i] / locationScale;
		sizes[i] = sizeBuffer[i] / sizeScale;
	}
	num_touches = i;
}

void CentroidDetection::setSizeScale(float sizeScale)
{
	this->sizeScale = sizeScale;
}

void CentroidDetection::setMinimumTouchSize(DATA_T minSize)
{
	cc->wMinimumCentroidSize = minSize;
}

void CentroidDetection::setNoiseThreshold(DATA_T threshold)
{
	noiseThreshold = threshold;
}

unsigned int CentroidDetection::getNumTouches()
{
	return num_touches;
}

CentroidDetection::DATA_T CentroidDetection::touchLocation(unsigned int touch_num)
{
	if(touch_num < maxNumCentroids)
		return centroids[touch_num];
	else
		return 0;
}

CentroidDetection::DATA_T CentroidDetection::touchSize(unsigned int touch_num)
{
	if(touch_num < num_touches)
		return sizes[touch_num];
	else
		return 0;
}

// code below from Trill.cpp

#define compoundTouch(LOCATION, SIZE, TOUCHES) {\
	float avg = 0;\
	float totalSize = 0;\
	unsigned int numTouches = TOUCHES;\
	for(unsigned int i = 0; i < numTouches; i++) {\
		avg += LOCATION(i) * SIZE(i);\
		totalSize += SIZE(i);\
	}\
	if(numTouches)\
		avg = avg / totalSize;\
	return avg;\
	}

CentroidDetection::DATA_T CentroidDetection::compoundTouchLocation()
{
	compoundTouch(touchLocation, touchSize, getNumTouches());
}

CentroidDetection::DATA_T CentroidDetection::compoundTouchSize()
{
	float size = 0;
	for(unsigned int i = 0; i < getNumTouches(); i++)
		size += touchSize(i);
	return size;
}
