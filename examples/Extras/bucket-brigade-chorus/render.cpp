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

float feedback=0.3;
float lfoRate = 3;
float lfoAmplitude = 1;
float dry = 0.5;
float wet = 0.5;
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
		usleep(10);
	}
}

bool setup(BelaContext *context, void *userData)
{
	updatePll=Bela_createAuxiliaryTask(&updatePllFunction, 91, "update PLL");
	for(int n=0; n<delayLength; n++){
		delay[n]=0;
	}
	return true; 
}

void render(BelaContext *context, void *userData)
{
	static float lfoPhase = 0;
	float amplitude = lfoAmplitude * 4700; // range of variation around D. D has to be between [0 9999]
	lfoPhase+=lfoRate * 2.f * (float)M_PI * context->audioFrames/context->audioSampleRate;
	D=amplitude+amplitude * sinf(lfoPhase);
	Bela_scheduleAuxiliaryTask(updatePll);

	for(unsigned int n = 0; n < context->audioFrames; n++) {
		float input = 0.0;
		for(unsigned int ch = 0; ch < context->audioInChannels; ch++) {
			input += audioRead(context, n, ch);
		}
		input = input/(float)context->audioInChannels;
		delay[writePointer++] = input + delay[readPointer]*feedback;
		float output = dry * input + wet * delay[readPointer++];
		for(unsigned int ch = 0; ch < context->audioOutChannels; ch++)
			audioWrite(context, n, ch, output);
		if(writePointer>=delayLength)
			writePointer-=delayLength;
		if(readPointer>=delayLength)
			readPointer-=delayLength;
	}
}

// cleanup_render() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in initialise_render().

void cleanup(BelaContext *context, void *userData)
{
    
}
