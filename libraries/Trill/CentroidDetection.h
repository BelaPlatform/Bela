#pragma once
#include <stdint.h>
#include <vector>
#include <memory>

class CentroidDetection
{
public:
	typedef float DATA_T;
	CentroidDetection() {};
	CentroidDetection(unsigned int numReadings, unsigned int maxNumCentroids, float sizeScale);
	CentroidDetection(const std::vector<unsigned int>& order, unsigned int maxNumCentroids, float sizeScale);
	int setup(unsigned int numReadings, unsigned int maxNumCentroids, float sizeScale);
	int setup(const std::vector<unsigned int>& order, unsigned int maxNumCentroids, float sizeScale);
	void process(const DATA_T* rawData);
	void setSizeScale(float sizeScale);
	void setMinimumTouchSize(DATA_T minSize);
	void setNoiseThreshold(DATA_T threshold);
	/**
	 * Set how many of the values at the beginning of `rawData` can be
	 * joined in a single centroid with those at the end of `rawData` if a
	 * centroid is detected across them.
	 * Useful for ring-like devices.
	 */
	void setWrapAround(unsigned int n);
	/**
	 * How many extra bits to use during the fixed-point multiplication
	 * that computes the centroids position. Defaults to 7.
	 */
	void setMultiplierBits(unsigned int n);
	unsigned int getNumTouches();
	DATA_T touchLocation(unsigned int touch_num);
	DATA_T touchSize(unsigned int touch_num);
	DATA_T compoundTouchLocation();
	DATA_T compoundTouchSize();
private:
	typedef uint16_t WORD;
	class CalculateCentroids;
	std::vector<DATA_T> centroids;
	std::vector<DATA_T> sizes;
	std::vector<WORD> centroidBuffer;
	std::vector<WORD> sizeBuffer;
	unsigned int maxNumCentroids;
	std::vector<unsigned int> order;
	unsigned int num_sensors;
	std::vector<WORD> data;
	float sizeScale;
	float locationScale;
	std::shared_ptr<CalculateCentroids> cc;
	unsigned int num_touches;
	DATA_T noiseThreshold;
};
