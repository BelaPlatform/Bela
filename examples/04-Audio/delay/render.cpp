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

// Simple Delay on Audio Input with Low Pass Filter

#include <Bela.h>

#define DELAY_BUFFER_SIZE 44100

float delayBuffer_l[DELAY_BUFFER_SIZE] = {0};
float delayBuffer_r[DELAY_BUFFER_SIZE] = {0};
int delayBufWritePtr = 0;
float delayAmount = 1.0;
float delayFeedbackAmount = 0.99999;
float delayAmountPre = 0.5;
int delayInSamples = 22025;

// DELAY LOP BUTTERWORTH

float del_a0 = 0.1772443606634904;
float del_a1 = 0.3544887213269808;
float del_a2 = 0.1772443606634904;
float del_a3 = -0.5087156198145868;
float del_a4 = 0.2176930624685485;

float del_x1_l = 0;
float del_x2_l = 0;
float del_y1_l = 0;
float del_y2_l = 0;
float del_x1_r = 0;
float del_x2_r = 0;
float del_y1_r = 0;
float del_y2_r = 0;

bool setup(BelaContext *context, void *userData)
{
    
	return true;
}

void render(BelaContext *context, void *userData)
{

    for(int n = 0; n < context->audioFrames; n++) {
        
        float out_l = 0;
		float out_r = 0;
		
		// Read audio inputs
        out_l = audioRead(context,n,0);
    	out_r = audioRead(context,n,0);
    	
        /*
    	 *
    	 * DELAY
    	 *
    	 */
    
    	if(++delayBufWritePtr>DELAY_BUFFER_SIZE)
    		delayBufWritePtr = 0;
    
    	float del_input_l = (delayAmountPre * out_l + delayBuffer_l[(delayBufWritePtr-delayInSamples+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE] * delayFeedbackAmount);
    	float del_input_r = (delayAmountPre * out_r + delayBuffer_r[(delayBufWritePtr-delayInSamples+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE] * delayFeedbackAmount);
    
    	float temp_x_l = del_input_l;
    	float temp_x_r = del_input_r;
    
    	del_input_l = del_a0*del_input_l
    				+ del_a1*del_x1_l
    				+ del_a2*del_x2_l;
    				+ del_a3*delayBuffer_l[(delayBufWritePtr-1+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE]
    				+ del_a4*delayBuffer_l[(delayBufWritePtr-2+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE];
    
    	del_x2_l = del_x1_l;
    	del_x1_l = temp_x_l;
    	del_y2_l = del_y1_l;
    	del_y1_l = del_input_l;
    
    	del_input_r = del_a0*del_input_r
    				+ del_a1*del_x1_r
    				+ del_a2*del_x2_r;
    				+ del_a3*delayBuffer_r[(delayBufWritePtr-1+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE]
    				+ del_a4*delayBuffer_r[(delayBufWritePtr-2+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE];
    
    	del_x2_r = del_x1_r;
    	del_x1_r = temp_x_r;
    	del_y2_r = del_y1_r;
    	del_y1_r = del_input_r;
    
    	delayBuffer_l[delayBufWritePtr] = del_input_l;
    	delayBuffer_r[delayBufWritePtr] = del_input_r;
    
    	out_l += delayBuffer_l[(delayBufWritePtr-delayInSamples+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE] * delayAmount;
    	out_r += delayBuffer_r[(delayBufWritePtr-delayInSamples+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE] * delayAmount;
    	
		audioWrite(context, n, 0, out_l);
		audioWrite(context, n, 1, out_r);
    }
    
}

void cleanup(BelaContext *context, void *userData)
{

}

/**
\example delay/render.cpp

Simple delay 
------------

This is an example of a stereo delay which needs documented.
*/