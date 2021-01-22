// returns a WORD packing two signed chars. The high bytes is the last active sensor in the last centroid,
// while the low byte is the first active sensor of the last centroid
WORD calculateCentroids(WORD *centroidBuffer, WORD *sizeBuffer, BYTE maxNumCentroids, BYTE minSensor, BYTE maxSensor, BYTE numSensors) {
	signed char lastActiveSensor = -1;
	BYTE centroidIndex = 0, sensorIndex, actualHardwareIndex;
	BYTE wrappedAround = 0;
	BYTE inCentroid = 0;
	WORD peakValue = 0, troughDepth = 0;
	BYTE counter;
	long temp;

	WORD lastSensorVal, currentSensorVal, currentWeightedSum, currentUnweightedSum;
	BYTE currentStart, currentLength;

	for(sensorIndex = 0; sensorIndex < maxNumCentroids; sensorIndex++) {
		centroidBuffer[sensorIndex] = 0xFFFF;
		sizeBuffer[sensorIndex] = 0;
	}

	currentSensorVal = 0;

	for(sensorIndex = 0, actualHardwareIndex = minSensor; sensorIndex < numSensors; sensorIndex++)
	{
		lastSensorVal = currentSensorVal;

		currentSensorVal = CSD_waSnsDiff[actualHardwareIndex++];
		if(currentSensorVal > 0) {
			lastActiveSensor = sensorIndex;
		}
		// if we get to the end, and there is more to go, wrap around
		if(actualHardwareIndex == maxSensor)
		{
			actualHardwareIndex = minSensor;
			// once we wrap around, if we find ourselves out of a centroid,
			// any centroids detected after the then current point onwards
			// would be equal or worse than the ones we already got earlier for
			// the same sensors, so we will have to break
			wrappedAround = 1;
		}

		if(inCentroid) {
			// Currently in the middle of a group of sensors constituting a centroid.  Use a zero sample
			// or a spike above a certain magnitude to indicate the end of the centroid.

			if(currentSensorVal == 0) {
				if(currentUnweightedSum > wMinimumCentroidSize)
				{
					temp = ((long)currentWeightedSum << SLIDER_BITS) / currentUnweightedSum;
					centroidBuffer[centroidIndex] = (currentStart << SLIDER_BITS) + (WORD)temp;
					sizeBuffer[centroidIndex] = currentUnweightedSum;
					centroidIndex++;
				}

				inCentroid = 0;
				if(wrappedAround) {
					break;
				}
				if(centroidIndex >= maxNumCentroids)
					break;
				continue;
			}

			if(currentSensorVal > peakValue)  // Keep tabs on max and min values
				peakValue = currentSensorVal;
			if(peakValue - currentSensorVal > troughDepth)
				troughDepth = peakValue - currentSensorVal;

			// If this sensor value is a significant increase over the last one, AND the last one was decreasing, then start a new centroid.
			// In other words, identify a trough in the values and use it to segment into two centroids.

			if(sensorIndex >= 2) {
				if(troughDepth > wAdjacentCentroidNoiseThreshold && currentSensorVal > lastSensorVal + wAdjacentCentroidNoiseThreshold) {
					if(currentUnweightedSum > wMinimumCentroidSize)
					{
						temp = ((long)currentWeightedSum << SLIDER_BITS) / currentUnweightedSum;
						centroidBuffer[centroidIndex] = (currentStart << SLIDER_BITS) + (WORD)temp;
						sizeBuffer[centroidIndex] = currentUnweightedSum;
						centroidIndex++;
					}
					inCentroid = 0;
					if(wrappedAround){
						break;
					}
					if(centroidIndex >= maxNumCentroids)
						break;
					inCentroid = 1;
					currentStart = sensorIndex;
					currentUnweightedSum = peakValue = currentSensorVal;
					currentLength = 1;
					currentWeightedSum = 0;
					troughDepth = 0;
					continue;
				}
			}

			currentUnweightedSum += currentSensorVal;
			currentWeightedSum += currentLength * currentSensorVal;
			currentLength++;
		}
		else {
			// Currently not in a centroid (zeros between centroids).  Look for a new sample to initiate centroid.
			if(currentSensorVal > 0) {
				currentStart = sensorIndex;
				currentUnweightedSum = peakValue = currentSensorVal;
				currentLength = 1;
				currentWeightedSum = 0;
				troughDepth = 0;
				inCentroid = 1;
			}
		}
		if(!inCentroid && wrappedAround){
			break;
		}
  	}

	// Finish up the calculation on the last centroid, if necessary
	if(inCentroid && currentUnweightedSum > wMinimumCentroidSize)
	{
		temp = ((long)currentWeightedSum << SLIDER_BITS) / currentUnweightedSum;
		centroidBuffer[centroidIndex] = (currentStart << SLIDER_BITS) + (WORD)temp;
		sizeBuffer[centroidIndex] = currentUnweightedSum;
		centroidIndex++;
	}

	return (lastActiveSensor << 8) | currentStart;
}
