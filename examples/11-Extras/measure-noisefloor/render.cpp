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
#include <algorithm>

int gAnalogChannelNum; // number of analog channels to iterate over

int gBufferSize = 8192;

// Double buffers to hold samples for noise analysis
float *gReadBuffers[10], *gWriteBuffers[10];
float *gBuffers0[10], *gBuffers1[10];

int gWriteBufferPointers[10], gReadBufferPointers[10];
bool gIsStdoutTty;

// Task to analyse and print results which would otherwise be too slow for render()
AuxiliaryTask gAnalysisTask;

void analyseResults(void*);

bool setup(BelaContext *context, void *userData)
{	
	gIsStdoutTty = isatty(1); // Check if stdout is a terminal

	
	// If the amout of audio and analog input and output channels is not the same
	// we will use the minimum between input and output
	gAnalogChannelNum = std::min(context->analogInChannels, context->analogOutChannels);
	
	// Check that we have the same number of inputs and outputs.
	if(context->analogInChannels != context-> analogOutChannels)
		printf("Different number of analog outputs and inputs available. Using %d analog channels.\n", gAnalogChannelNum);
	
	// Clear the filter data structures
	for(int i = 0; i < 10; i++) {
		gReadBufferPointers[i] = gWriteBufferPointers[i] = 0;
		gBuffers0[i] = new float[gBufferSize];
		gBuffers1[i] = new float[gBufferSize];		
		gWriteBuffers[i] = gBuffers0[i];
		gReadBuffers[i] = gBuffers1[i];
		if(gBuffers0[i] == 0 || gBuffers1[i] == 0) {
			rt_printf("Error allocating buffer %d\n", i);
			return false;
		}
	}
	
	gAnalysisTask = Bela_createAuxiliaryTask(analyseResults, 50, "bela-analyse-results");

	return true;
}

void render(BelaContext *context, void *userData)
{
	bool bufferIsFull = false;	// Whether at least one buffer has filled
	
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		// Store audio inputs in buffer
		for(unsigned int ch = 0; ch < context->audioInChannels; ch++) {
			if(gWriteBufferPointers[ch] < gBufferSize) {
				gWriteBuffers[ch][gWriteBufferPointers[ch]] = 
					context->audioIn[n * context->audioInChannels + ch];
				gWriteBufferPointers[ch]++;
				if(gWriteBufferPointers[ch] >= gBufferSize)
					bufferIsFull = true;
			}
		}
	}
	
	if(context->analogOutChannels != 0) {
		for(unsigned int n = 0; n < context->analogFrames; n++) {
			// Store analog inputs in buffer, starting at channel 2
			for(unsigned int ch = 0; ch < gAnalogChannelNum; ch++) {
				if(gWriteBufferPointers[ch + 2] < gBufferSize) {
					gWriteBuffers[ch + 2][gWriteBufferPointers[ch + 2]] = 
						context->analogIn[n * context->analogInChannels + ch];
					gWriteBufferPointers[ch + 2]++;
					if(gWriteBufferPointers[ch + 2] >= gBufferSize)
						bufferIsFull = true;
				}
				
				// Set all analog outputs to halfway point so they can be more
				// easily measured for noise
				context->analogOut[n * context->analogOutChannels + ch] = 0.5;
			}
		}	
	}
	

	if(bufferIsFull) {
		// Swap buffers and reset write pointers
		for(int ch = 0; ch < 10; ch++) {
			gReadBufferPointers[ch] = gWriteBufferPointers[ch];
			gWriteBufferPointers[ch] = 0;
			
			if(gReadBuffers[ch] == gBuffers0[ch]) {
				gReadBuffers[ch] = gBuffers1[ch];
				gWriteBuffers[ch] = gBuffers0[ch];
			}
			else {
				gReadBuffers[ch] = gBuffers0[ch];
				gWriteBuffers[ch] = gBuffers1[ch];				
			}
		}
		
		Bela_scheduleAuxiliaryTask(gAnalysisTask);
	}
}

void analyseResults(void*)
{
	if(gIsStdoutTty)
		rt_printf("\e[1;1H\e[2J");	// Command to clear the screen

	// Print the analysis results. channels 0-1 are audio, channels 2-9 are analog
	for(int ch = 0; ch < 10; ch++) {
		// Skip unused channels
		if(gReadBufferPointers[ch] == 0)
			continue;
		
		float mean = 0;
		for(int n = 0; n < gReadBufferPointers[ch]; n++) {
			mean += gReadBuffers[ch][n];
		}
		mean /= (float)gReadBufferPointers[ch];
		
		float rms = 0;
		for(int n = 0; n < gReadBufferPointers[ch]; n++) {
			rms += (gReadBuffers[ch][n] - mean) * (gReadBuffers[ch][n] - mean);
		}				
		rms = sqrtf(rms / (float)gReadBufferPointers[ch]);
		
		if(ch == 0)
			rt_printf("Audio In L:  ");
		else if(ch == 1)
			rt_printf("Audio In R:  ");
		else
			rt_printf("Analog In %d: ", ch - 2);
		
		rt_printf("Noise %6.1fdB    DC offset %6.4f (%6.1fdB)    window size: %d\n", 
					20.0f * log10f(rms),
					mean, 
					20.0f * log10f(fabsf(mean)),
					gReadBufferPointers[ch]);
	}
}

void cleanup(BelaContext *context, void *userData)
{
	for(int i = 0; i < 10; i++) {
		delete gBuffers0[i];
		delete gBuffers1[i];
	}
}
