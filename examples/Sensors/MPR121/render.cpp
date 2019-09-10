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


#include <Bela.h>
#include <cmath>
#include "I2C_MPR121.h"

// How many pins there are
#define NUM_TOUCH_PINS 12

// Define this to print data to terminal
#undef DEBUG_MPR121

// Change this to change how often the MPR121 is read (in Hz)
int readInterval = 50;

// Change this threshold to set the minimum amount of touch
int threshold = 40;

// This array holds the continuous sensor values
int sensorValue[NUM_TOUCH_PINS];

// ---- test code stuff -- can be deleted for your example ----

// 12 notes of a C major scale...
float gFrequencies[NUM_TOUCH_PINS] = {261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.25, 783.99};

// This is internal stuff for the demo
float gNormFrequencies[NUM_TOUCH_PINS];
float gPhases[NUM_TOUCH_PINS] = {0};

// ---- internal stuff -- do not change -----

I2C_MPR121 mpr121;			// Object to handle MPR121 sensing
AuxiliaryTask i2cTask;		// Auxiliary task to read I2C

int readCount = 0;			// How long until we read again...
int readIntervalSamples = 0; // How many samples between reads

void readMPR121(void*);

bool setup(BelaContext *context, void *userData)
{
	if(!mpr121.begin(1, 0x5A)) {
		rt_printf("Error initialising MPR121\n");
		return false;
	}
	
	i2cTask = Bela_createAuxiliaryTask(readMPR121, 50, "bela-mpr121");
	readIntervalSamples = context->audioSampleRate / readInterval;
	
	for(int i = 0; i < NUM_TOUCH_PINS; i++) {
		gNormFrequencies[i] = 2.0 * M_PI * gFrequencies[i] / context->audioSampleRate;
	}
	
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		// Keep this code: it schedules the touch sensor readings
		if(++readCount >= readIntervalSamples) {
			readCount = 0;
			Bela_scheduleAuxiliaryTask(i2cTask);
		}
		
		float sample = 0.0;
		
		// This code can be replaced with your favourite audio code
		for(int i = 0; i < NUM_TOUCH_PINS; i++) {
			float amplitude = sensorValue[i] / 400.f;
			
			// Prevent clipping
			if(amplitude > 0.5)
				amplitude = 0.5;
			
			sample += amplitude * sinf(gPhases[i]);
			gPhases[i] += gNormFrequencies[i];
			if(gPhases[i] > M_PI)
				gPhases[i] -= 2.0f * (float)M_PI;
		}
		
		for(unsigned int ch = 0; ch < context->audioInChannels; ch++)
			context->audioOut[context->audioInChannels * n + ch] = sample;
	}
}

void cleanup(BelaContext *context, void *userData)
{ }

// Auxiliary task to read the I2C board
void readMPR121(void*)
{
	for(int i = 0; i < NUM_TOUCH_PINS; i++) {
		sensorValue[i] = -(mpr121.filteredData(i) - mpr121.baselineData(i));
		sensorValue[i] -= threshold;
		if(sensorValue[i] < 0)
			sensorValue[i] = 0;
#ifdef DEBUG_MPR121
		rt_printf("%d ", sensorValue[i]);
#endif
	}
#ifdef DEBUG_MPR121
	rt_printf("\n");
#endif
	
	// You can use this to read binary on/off touch state more easily
	//rt_printf("Touched: %x\n", mpr121.touched());
}


/**
\example MPR121/render.cpp

Capacitive touch sensing with MPR121
---------------------------

This sketch allows you to hook up an MPR121 capactive touch sensing device
to Bela, for example the SparkFun Capacitive Touch Sensor Breakout - MPR121.
The breakout board gives you 12 electrode connections.

To get this working with Bela you need to connect the breakout board to the I2C
terminal on the Bela board. See the Pin guide for details of which pin is which.

The sensor data will then be available for you to use in the array 
`sensorValue[NUM_TOUCH_PINS]`.
*/
