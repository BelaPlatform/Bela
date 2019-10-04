#include <Bela.h>
#include <libraries/Scope/Scope.h>
#include <math_neon.h>

#define NUM_OSC 12
#define FREQ 50.0f

Scope scope;

float gPhases[NUM_OSC];
float gFrequencies[NUM_OSC];
float gAmplitudes[NUM_OSC];
float gOutput[NUM_OSC+1];

float deltaFreqs[NUM_OSC];
float deltaAmps[NUM_OSC];
float gInverseSampleRate;
float avg;

bool setup(BelaContext *context, void *userData)
{
	scope.setup(NUM_OSC+1, context->audioSampleRate);
	
	srand(time(NULL));
	for (int i=0; i<NUM_OSC; i++){
		deltaFreqs[i] = FREQ * (rand() % 100 - 50) / 10000.0f;
		deltaAmps[i] = -(rand() % 100) / 100.0f;
		gFrequencies[i] = FREQ + deltaFreqs[i];
		gPhases[i] = 0.0f;
		gAmplitudes[i] = 1.0f + deltaAmps[i];
	}
	
	gInverseSampleRate = 1.0f/context->audioSampleRate;

	return true;
}

void render(BelaContext *context, void *userData)
{
	
	for (int i=0; i<NUM_OSC; i++){
		gFrequencies[i] = FREQ + deltaFreqs[i] * 0.1;
	}
	for (int i=0; i<NUM_OSC; i++){
		gAmplitudes[i] = 1.0f + deltaAmps[i] * 0.1;
	}

	for (int n=0; n<context->audioFrames; n++){
		
		avg = 0.0f;
		for (int i=0; i<NUM_OSC; i++){
			gOutput[i+1] = gAmplitudes[i] * sinf_neon(gPhases[i]);
			gPhases[i] += 2.0f * M_PI * gFrequencies[i] * gInverseSampleRate;
			if (gPhases[i] > 2.0f * M_PI)
				gPhases[i] -= 2.0f * M_PI;
			avg += gOutput[i+1];
		}
		gOutput[0] = avg / NUM_OSC;

		scope.log(gOutput);
		
	}
}

void cleanup(BelaContext *context, void *userData)
{

}
