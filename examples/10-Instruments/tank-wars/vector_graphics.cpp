/*
 * vector_graphics.cpp
 *
 *  Created on: Nov 10, 2014
 *      Author: parallels
 */

#include <cmath>

// Draw a line between two points at a specified rate in
// pixels per buffer sample. Indicate maximum available space.
// Returns space used
int renderLine(float x1, float y1, float x2, float y2, float speed,
			   float *buffer, int maxLength) {
	// Figure out length of line and therefore how many samples
	// are needed to represent it based on the speed (rounded to nearest int)
	float totalLineLength = sqrtf((x2 - x1)*(x2 - x1) + (y2 - y1)*(y2 - y1));
	int samplesNeeded = floorf(totalLineLength / speed + 0.5);

	// Now render into the buffer
	int length = 0;
	float scaleFactor = 1.0f / samplesNeeded;
	for(int n = 0; n < samplesNeeded; n++) {
		if(length >= maxLength - 1)
			return length;
		// X coordinate
		*buffer++ = x1 + (float)n * scaleFactor * (x2 - x1);
		// Y coordinate
		*buffer++ = y1 + (float)n * scaleFactor * (y2 - y1);
		length += 2;
	}

	return length;
}

// Draw an arc around a centre point at a specified rate of pixels
// per buffer sample. Indicate maximum available space.
// Returns space used
int renderArc(float x, float y, float radius, float thetaMin, float thetaMax,
			  float speed, float *buffer, int maxLength) {
	// Figure out circumference of arc and therefore how many samples
	// are needed to represent it based on the speed (rounded to nearest int)
	float circumference = (thetaMax - thetaMin) * radius;
	int samplesNeeded = floorf(circumference / speed + 0.5);

	// Now render into the buffer
	int length = 0;
	float scaleFactor = 1.0f / samplesNeeded;
	for(int n = 0; n < samplesNeeded; n++) {
		if(length >= maxLength - 1)
			return length;
		// Get current angle
		float theta = thetaMin + (float)n * scaleFactor * (thetaMax - thetaMin);

		// Convert polar to cartesian coordinates
		*buffer++ = x + radius * cosf(theta);
		*buffer++ = y + radius * sinf(theta);

		length += 2;
	}

	return length;
}

// Draw a single point for a specified number of frames
void renderPoint(float x, float y, float *buffer, float length) {
	while(length > 0) {
		*buffer++ = x;
		*buffer++ = y;
		length--;
	}
}
