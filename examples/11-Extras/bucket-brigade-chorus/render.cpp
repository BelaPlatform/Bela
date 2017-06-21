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
#include <I2c_Codec.h>

float feedback=0.1;
float lfoRate = 1;
float lfoAmplitude = 1;
#define delayLength 2048

extern I2c_Codec *gAudioCodec;
float D=5264;
float delay[delayLength];
int writePointer=0;
int readPointer=writePointer+1;
AuxiliaryTask updatePll;

void updatePllFunction(void*){
	static int count = 0;
	while(!gShouldStop){
		gAudioCodec->setPllD(D);
		count++;
		if((count&4095)==0)
			printf("sampling rate: %f\n",gAudioCodec->getAudioSamplingRate());
		usleep(1);
	}
}

bool setup(BelaContext *context, void *userData)
{
    // Check that we have the same number of inputs and outputs.
	if(context->audioInChannels != context->audioOutChannels ||
			context->analogInChannels != context-> analogOutChannels){
		printf("Error: for this project, you need the same number of input and output channels.\n");
		return false;
	}
	updatePll=Bela_createAuxiliaryTask(&updatePllFunction, 91, "update PLL");
	for(int n=0; n<delayLength; n++){
		delay[n]=0;
	}
	Bela_scheduleAuxiliaryTask(updatePll);
	return true; 
}

void render(BelaContext *context, void *userData)
{
	static float lfoPhase=0;
	float amplitude = lfoAmplitude * 4700.f; // range of variation around D. D has to be between [0 9999]
	lfoPhase += lfoRate * 2.f * (float)M_PI * context->audioFrames / context->audioSampleRate;
	D = amplitude + amplitude*sinf(lfoPhase);

	for(unsigned int n = 0; n < context->audioFrames; n++) {
		float input = audioRead(context, n, 0) + audioRead(context, n, 1);
	    delay[writePointer++] = input + delay[readPointer]*feedback;
	    float output = (input + 0.9f*delay[readPointer++] ) * 0.5f;
		audioWrite(context, n, 0, output);
		audioWrite(context, n, 1, output);
		if(writePointer>=delayLength)
			writePointer-=delayLength;
		if(readPointer>=delayLength)
			readPointer-=delayLength;
	}
}

void cleanup(BelaContext *context, void *userData)
{
    
}

/**

\example bucket-brigate-chorus/render.cpp

This example shows how the master clock driving the audio converter can be
modulated in order to achieve what in principle is a perfect virtual-analog
emulation of a Bucket-Brigade based chorus effect, of the likes of those found
on string machines and analog chorus and flanger effects. Read more on BBDs
[here](http://dafx10.iem.at/papers/RaffelSmith_DAFx10_P42.pdf).

In practice in this example you get some distortion due to the PLL of the clock
being adjusted over time. Disabling the analog I/O should allow for wider variations (larger values of `lfoAmplitude`).
*
*/

