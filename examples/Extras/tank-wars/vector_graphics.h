/*
 * vector_graphics.h
 *
 *  Created on: Nov 10, 2014
 *      Author: parallels
 */

#ifndef VECTOR_GRAPHICS_H_
#define VECTOR_GRAPHICS_H_

int renderLine(float x1, float y1, float x2, float y2, float speed,
			   float *buffer, int maxLength);
int renderArc(float x, float y, float radius, float thetaMin, float thetaMax,
			  float speed, float *buffer, int maxLength);
void renderPoint(float x, float y, float *buffer, float length);


#endif /* VECTOR_GRAPHICS_H_ */
