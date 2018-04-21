/*
 ____  _____ _        _    
| __ )| ____| |      / \   
|  _ \|  _| | |     / _ \  
| |_) | |___| |___ / ___ \ 
|____/|_____|_____/_/   \_\

The platform for ultra-low latency audio and sensor processing

http://bela.io

A project of the Augmented Instruments Laboratory within the
Centre for Digital Music at Queen Mary University of London.
http://www.eecs.qmul.ac.uk/~andrewm

(c) 2016 Augmented Instruments Laboratory: Andrew McPherson,
	Astrid Bin, Liam Donovan, Christian Heinrichs, Robert Jack,
	Giulio Moro, Laurel Pardue, Victor Zappi. All rights reserved.

The Bela software is distributed under the GNU Lesser General Public License
(LGPL 3.0), available here: https://www.gnu.org/licenses/lgpl-3.0.txt
*/

#include "MassSpringDamper.h"
#include "String.h"
#include "Plectrum.h"

#include <Bela.h>
#include <cmath>
#include <stdio.h>
#include <cstdlib>

#define ACCEL_BUF_SIZE 8
#define NUMBER_OF_STRINGS 9

// PENTATONIC SCALE
float gMidinotes[NUMBER_OF_STRINGS] = {40,45,50,55,57,60,62,64,67};

float gInverseSampleRate;

float out_gain = 5.0;

int accelPin_x = 0;
int accelPin_y = 1;
int accelPin_z = 2;

MassSpringDamper msd = MassSpringDamper(1,0.1,10);// (10,0.001,10);
String strings[NUMBER_OF_STRINGS];
Plectrum plectrums[NUMBER_OF_STRINGS];

float gPlectrumDisplacement = 0;

float gAccel_x[ACCEL_BUF_SIZE] = {0};
int gAccelReadPtr = 0;

// DC BLOCK BUTTERWORTH

// Coefficients for 100hz high-pass centre frequency
float a0_l = 0.9899759179893742;
float a1_l = -1.9799518359787485;
float a2_l = 0.9899759179893742;
float a3_l = -1.979851353142371;
float a4_l = 0.9800523188151258;

float a0_r = a0_l;
float a1_r = a1_l;
float a2_r = a2_l;
float a3_r = a3_l;
float a4_r = a4_l;

float x1_l = 0;
float x2_l = 0;
float y1_l = 0;
float y2_l = 0;

float x1_r = 0;
float x2_r = 0;
float y1_r = 0;
float y2_r = 0;


bool setup(BelaContext *context, void *userData)
{

	gInverseSampleRate = 1.0 / context->audioSampleRate;

	// initialise strings & plectrums
	for(int i=0;i<NUMBER_OF_STRINGS;i++)	{

		plectrums[i] = Plectrum();
		plectrums[i].setup(250,0.25,0.05);

		strings[i] = String();
		strings[i].setMidinote(gMidinotes[i]);

		float spacing = 2.0 / (NUMBER_OF_STRINGS+1);

		strings[i].setGlobalPosition( -1 + spacing*(i+1) );

		rt_printf("STRING %d // midinote: %f position: %f\n",i,gMidinotes[i],( -1 + spacing*(i+1) ));

	}

	return true;
}

void render(BelaContext *context, void *userData)
{

	float lastAccel = 0;

	for(unsigned int n = 0; n < context->audioFrames; ++n) {

		/*
		 *
		 * ACCELEROMETER DATA
		 *
		 */

		// Read accelerometer data from analog input
		float accel_x = 0;
		if(n%2)	{
			accel_x = (float)context->analogIn[(n/2)*8+accelPin_x] * 2 - 1;	// 15800 - 28300 - 41500
			lastAccel = accel_x;
		} else {
			// grab previous value if !n%2
			accel_x = lastAccel;
		}

		// Dead-zone avoids noise when box is lying horizontally on a surface

		float accelDeadZone = 0.1;

		if(accel_x <= accelDeadZone && accel_x >= -accelDeadZone)
			accel_x = 0;

		// Perform smoothing (moving average) on acceleration value
		if(++gAccelReadPtr >= ACCEL_BUF_SIZE)
			gAccelReadPtr = 0;
		gAccel_x[gAccelReadPtr] = accel_x;
		float gravity = 0;
		for(int i=0;i<ACCEL_BUF_SIZE;i++)	{
			gravity = gAccel_x[(gAccelReadPtr-i+ACCEL_BUF_SIZE)%ACCEL_BUF_SIZE];
		}
		gravity /= ACCEL_BUF_SIZE;

		/*
		 *
		 * PHYSICS SIMULATION
		 *
		 */

		// The horizontal force (which can be gravity if box is tipped on its side)
		// is used as the input to a Mass-Spring-Damper model
		// Plectrum displacement (i.e. when interacting with string) is included
		float massPosition = (float)msd.update(gravity - gPlectrumDisplacement);

		float out_l = 0;
		float out_r = 0;
		// Use this parameter to quickly adjust output gain
		float gain = 0.0015;	// 0.0015 is a good value or 12 strings
		gPlectrumDisplacement = 0;

		for(int s=0;s<NUMBER_OF_STRINGS;s++)	{

			float stringPosition = strings[s].getGlobalPosition();

			float plectrumForce = plectrums[s].update(massPosition, stringPosition);
			gPlectrumDisplacement += strings[s].getPlectrumDisplacement();

			// calculate panning based on string position (-1->left / 1->right)
			float panRight = map(stringPosition,1,-1,0.1,1);
			float panLeft = map(stringPosition,-1,1,0.1,1);
			panRight *= panRight;
			panLeft *= panLeft;

			float out = strings[s].update(plectrumForce)*gain;

			out_l += out*panLeft;
			out_r += out*panRight;

		}

		// APPLY DC-BLOCK FILTER TO OUTPUTS

		// LEFT CHANNEL
		float temp_in = out_l;
		/* compute result */
    	out_l = a0_l * out_l + a1_l * x1_l + a2_l * x2_l - a3_l * y1_l - a4_l * y2_l;
    	/* shift x1 to x2, sample to x1 */
    	x2_l = x1_l;
    	x1_l = temp_in;
    	/* shift y1 to y2, result to y1 */
    	y2_l = y1_l;
   	 	y1_l = out_l;

   	 	// RIGHT CHANNEL
		temp_in = out_r;
		/* compute result */
    	out_r = a0_r * out_r + a1_r * x1_r + a2_r * x2_r - a3_r * y1_r - a4_r * y2_r;
    	/* shift x1 to x2, sample to x1 */
    	x2_r = x1_r;
    	x1_r = temp_in;
    	/* shift y1 to y2, result to y1 */
    	y2_r = y1_r;
   	 	y1_r = out_r;

		context->audioOut[n * context->audioOutChannels + 1] = out_l * out_gain;
		context->audioOut[n * context->audioOutChannels + 0] = out_r * out_gain;

	}

}


void cleanup(BelaContext *context, void *userData)
{}

/**
\example airharp/render.cpp

 * Physically modelled strings using waveguide junctions and mass-spring-dampers
 * controllable using an accelerometer
 *
 */
