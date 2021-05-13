				temp = calculateCentroids(wVCentroid, wVCentroidSize, MAX_NUM_CENTROIDS, FIRST_SENSOR_V, LAST_SENSOR_V, numSensors); // Vertical centroids
				firstActiveSensor = temp & 0xFF;
				lastActiveSensor = temp >> 8;
				bActivityDetected = lastActiveSensor >= 0;

				temp = lastActiveSensor - (LAST_SENSOR_V - FIRST_SENSOR_V );// retrieve the (wrapped) index
				//check for activity in the wraparound area
				// IF the last centroid ended after wrapping around ...
				// AND the first centroid was located before the end of the last ...
				if(lastActiveSensor >= LAST_SENSOR_V - FIRST_SENSOR_V
					&& (((BYTE)temp) << SLIDER_BITS) >= wVCentroid[0] )
				{
					// THEN the last touch is used to replace the first one
					for(counter = MAX_NUM_CENTROIDS - 1; counter >= 1; counter--) {
						if(0xFFFF == wVCentroid[counter])
							continue;
						// replace the first centroid
						wVCentroidSize[0] = wVCentroidSize[counter];
						wVCentroid[0] = wVCentroid[counter];
						// wrap around the position if needed
						if(wVCentroid[0] >= posEndOfLoop)
							wVCentroid[0] -= posEndOfLoop;
						// discard the last centroid
						wVCentroid[counter] = 0xFFFF;
						wVCentroidSize[counter] = 0x0;
						break;
					}
				}
