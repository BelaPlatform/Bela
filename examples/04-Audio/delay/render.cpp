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

// Buffer holding previous samples per channel
float gDelayBuffer_l[DELAY_BUFFER_SIZE] = {0};
float gDelayBuffer_r[DELAY_BUFFER_SIZE] = {0};
// Write pointer
int gDelayBufWritePtr = 0;
// Amount of delay
float gDelayAmount = 1.0;
// Amount of feedback
float gDelayFeedbackAmount = 0.999;
// Level of pre-delay input
float gDelayAmountPre = 0.75;
// Amount of delay in samples (needs to be smaller than or equal to the buffer size defined above)
int gDelayInSamples = 22050;

// Butterworth coefficients for low-pass filter @ 8000Hz
float gDel_a0 = 0.1772443606634904;
float gDel_a1 = 0.3544887213269808;
float gDel_a2 = 0.1772443606634904;
float gDel_a3 = -0.5087156198145868;
float gDel_a4 = 0.2176930624685485;

// Previous two input and output values for each channel (required for applying the filter)
float gDel_x1_l = 0;
float gDel_x2_l = 0;
float gDel_y1_l = 0;
float gDel_y2_l = 0;
float gDel_x1_r = 0;
float gDel_x2_r = 0;
float gDel_y1_r = 0;
float gDel_y2_r = 0;

bool setup(BelaContext *context, void *userData)
{
    
    return true;
}

void render(BelaContext *context, void *userData)
{

    for(unsigned int n = 0; n < context->audioFrames; n++) {
        
        float out_l = 0;
        float out_r = 0;
        
        // Read audio inputs
        out_l = audioRead(context,n,0);
        out_r = audioRead(context,n,1);
        
        // Increment delay buffer write pointer
        if(++gDelayBufWritePtr>DELAY_BUFFER_SIZE)
            gDelayBufWritePtr = 0;
        
        // Calculate the sample that will be written into the delay buffer...
        // 1. Multiply the current (dry) sample by the pre-delay gain level (set above)
        // 2. Get the previously delayed sample from the buffer, multiply it by the feedback gain and add it to the current sample
        float del_input_l = (gDelayAmountPre * out_l + gDelayBuffer_l[(gDelayBufWritePtr-gDelayInSamples+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE] * gDelayFeedbackAmount);
        float del_input_r = (gDelayAmountPre * out_r + gDelayBuffer_r[(gDelayBufWritePtr-gDelayInSamples+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE] * gDelayFeedbackAmount);
        
        // ...but let's not write it into the buffer yet! First we need to apply the low-pass filter!
        
        // Remember these values so that we can update the filter later, as we're about to overwrite it
        float temp_x_l = del_input_l;
        float temp_x_r = del_input_r;
        
        // Apply the butterworth filter (y = a0*x0 + a1*x1 + a2*x2 + a3*y1 + a4*y2)
        del_input_l = gDel_a0*del_input_l
                    + gDel_a1*gDel_x1_l
                    + gDel_a2*gDel_x2_l
                    + gDel_a3*gDelayBuffer_l[(gDelayBufWritePtr-1+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE]
                    + gDel_a4*gDelayBuffer_l[(gDelayBufWritePtr-2+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE];
        
        // Update previous values for next iteration of filter processing
        gDel_x2_l = gDel_x1_l;
        gDel_x1_l = temp_x_l;
        gDel_y2_l = gDel_y1_l;
        gDel_y1_l = del_input_l;
        
        // Repeat process for the right channel
        del_input_r = gDel_a0*del_input_r
                    + gDel_a1*gDel_x1_r
                    + gDel_a2*gDel_x2_r
                    + gDel_a3*gDelayBuffer_r[(gDelayBufWritePtr-1+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE]
                    + gDel_a4*gDelayBuffer_r[(gDelayBufWritePtr-2+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE];
    
        gDel_x2_r = gDel_x1_r;
        gDel_x1_r = temp_x_r;
        gDel_y2_r = gDel_y1_r;
        gDel_y1_r = del_input_r;
        
        //  Now we can write it into the delay buffer
        gDelayBuffer_l[gDelayBufWritePtr] = del_input_l;
        gDelayBuffer_r[gDelayBufWritePtr] = del_input_r;
        
        // Get the delayed sample (by reading `gDelayInSamples` many samples behind our current write pointer) and add it to our output sample
        out_l += gDelayBuffer_l[(gDelayBufWritePtr-gDelayInSamples+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE] * gDelayAmount;
        out_r += gDelayBuffer_r[(gDelayBufWritePtr-gDelayInSamples+DELAY_BUFFER_SIZE)%DELAY_BUFFER_SIZE] * gDelayAmount;
        
        // Write the sample into the output buffer -- done!
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

This example demonstrates how to apply a feedback delay with an incorporated low-pass filter to an audio signal.

In order to create a delay effect we need to allocate a buffer (i.e. an array of samples) that holds previous samples.
Every time we output a sample we need to go back in time and retrieve the sample that occurred `n` samples ago, where
`n` is our delay in samples. The buffer allows us to do just this. For every incoming sample we write its value into
the buffer. We use a so-called write pointer (`gDelayBufWritePtr`) in order to keep track of the index of the buffer
we need to write into. This write pointer is incremented on every sample and wrapped back around to 0 when its reached
the last index of the buffer size (this technique is commonly referred to as a `circular buffer` or a `ring buffer`).

We go a bit further by applying feedback and filtering to the delay in order to make the effect more interesting. To
apply feedback to the delay, we take the sample that occurred `gDelayInSamples` ago, multiply it by our
`gDelayFeedbackAmount` parameter and add it to the dry input signal that we will write into the buffer. This way, there
will always be a trace of the previously delayed sample in the output that will slowly fade away over time.

Next, we apply a low-pass filter. We have pre-calculated the coefficients that are required to apply a Butterworth
(or `biquad`) filter, which is expressed as follows: y = a0*x0 + a1*x1 + a2*x2 + a3*y1 + a4*y2, where x0 and x1 are
the previous *input* (i.e. unfiltered) samples and y0 and y1 are the previous *output* (i.e. filtered) samples.
We keep track of these previous input and output samples for each channel using global variables in order to apply
the filter.

Finally we take the processed sample for each channel and write it into the corresponding delay buffer (`gDelayBuffer_l`
and `gDelayBuffer_r`), so that in the future (after `gDelayInSamples` samples) we can retrieve it again! Last but not
least, we read the sample from the buffer that was written `gDelayInSamples` ago and add it to the output.

Note that we have to ways of changing the volume of the delay effect. One way is to change the overall gain using
the `gDelayAmount` parameter: this will immediately raise or lower the volume of the delayed signal. The other option
is to use the `gDelayAmountPre` parameter, which will apply gain to the *input* of the delay line. The advantage of
using this parameter is that when turning down the gain we can let the delay ring out while not letting any new
input into the effect. Conversely, we can introduce the delay effect naturally without fading in previous output
of the effect.

*/
