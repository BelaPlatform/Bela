#include <Bela.h>
#include <cstdlib>
#include <cmath>
#include <cstring>
#include "SampleLoader.h"

#define NUM_CHANNELS 8

enum {
    kStateSignalOn = 0,
    kStateTurningOff,
    kStateSignalOff,
    kStateTurningOn
};


int gChannelState[NUM_CHANNELS];   // State of each channel...
unsigned int gSamplesInState[NUM_CHANNELS]; // ...and how long we have been there

// Whether the channel passed the test with and without signal
bool gChannelOKWhenOn[NUM_CHANNELS];     
bool gChannelOKWhenOff[NUM_CHANNELS];

unsigned int gHighSamples[NUM_CHANNELS]; 
unsigned int gLowSamples[NUM_CHANNELS];

// How long to spend in each state
const unsigned int kSamplesInSignalState = 10000;
const unsigned int kSamplesInTransitionState = 1000;

// How many out-of-range samples to require (minimum) for a "pass" in the on state
// Require 5% of samples to be above or below the thresholds
const unsigned int kSignalOnHighCount = kSamplesInSignalState / 20;
const unsigned int kSignalOnLowCount =  kSamplesInSignalState / 20;

// How many out-of-range samples to allow (maximum) for a "pass" in the off state
// Require no more than 0.5% of samples to be above or below the thresholds
const unsigned int kSignalOffHighCount = kSamplesInSignalState / 200;
const unsigned int kSignalOffLowCount =  kSamplesInSignalState / 200;

const float kFrequency = 1000.0;          // Frequency for testing
const float kAmplitude = 0.2;
float gPhase = 0;

// Thresholds for signal detection

const float kSignalOnHighThreshold = ((1.8 + 0.9) / 4.096); // Make sure the signal is at least 1.8V p-p
const float kSignalOnLowThreshold =  ((1.8 - 0.9) / 4.096);
const float kSignalOffHighThreshold = (1.8 / 4.096) * 1.08; // Allow 8% variance around expected value
const float kSignalOffLowThreshold = (1.8 / 4.096) / 1.08;

// Audio generation state

float gAudioPhase = 0;
uint32_t gEnvelopeSampleCount = 0;
float gEnvelopeValue = 0.5;
float gEnvelopeDecayRate = 0.9995;

float *gAudioChannelBuffers[NUM_CHANNELS] = { 0 };
unsigned int gAudioChannelBufferLengths[NUM_CHANNELS] = { 0 };
int gAudioChannelBufferNumber = -1;             // Which buffer we are playing
unsigned int gAudioChannelBufferPointer = 0;    // and where we are in it

bool setup(BelaContext *context, void *userData)
{
    if(context->analogInChannels != NUM_CHANNELS || context->analogOutChannels != NUM_CHANNELS) {
        printf("Error: this example needs analog enabled with 8 channels to run.\n");
        return false;
    }
    
    // Load sound file
    for(unsigned int i = 0; i < NUM_CHANNELS; i++) {
        char filename[32];
        snprintf(filename, 32, "number%d.wav", i);
        
        gAudioChannelBufferLengths[i] = getNumFrames(std::string(filename));
        gAudioChannelBuffers[i] = (float *)malloc(gAudioChannelBufferLengths[i] * sizeof(float));
        if(getSamples(std::string(filename), gAudioChannelBuffers[i], 0, 0, 
                      gAudioChannelBufferLengths[i] - 1) != 0)
            return false;
    }
  
    // Set up initial state
    for(unsigned int i = 0; i < NUM_CHANNELS; i++) {
        gChannelOKWhenOn[i] = gChannelOKWhenOff[i] = false;
        
        // Set up channels in different states that will
        // switch at different times
        if(i % 2)
            gChannelState[i] = kStateSignalOn;
        else
            gChannelState[i] = kStateSignalOff;
        gSamplesInState[i] = kSamplesInSignalState * i / 8;
        gHighSamples[i] = gLowSamples[i] = 0;
    }
    
	return true;
}

void render(BelaContext *context, void *userData)
{
    for(unsigned int n = 0; n < context->analogFrames; n++) {
        float signal = 0.5 + kAmplitude * sinf(gPhase);
        gPhase += 2.0 * M_PI * kFrequency / context->analogSampleRate;
        if(gPhase >= 2.0 * M_PI)
            gPhase -= 2.0 * M_PI;
            
        for(unsigned int ch = 0; ch < context->analogOutChannels; ch++) {
            float input = analogRead(context, n, ch);
            gSamplesInState[ch]++;
            
            // State machine: turn each signal on and off
            if(gChannelState[ch] == kStateSignalOn) {
                analogWriteOnce(context, n, ch, signal);
                
                // Check for inputs that are outside of range
                // (this is good here)
                if(input > kSignalOnHighThreshold)
                    gHighSamples[ch]++;
                if(input < kSignalOnLowThreshold)
                    gLowSamples[ch]++;
                
                if(gSamplesInState[ch] >= kSamplesInSignalState) {
                    // Here we evaluate whether the channel has passed
                    // or failed, based on the number of out-of-range
                    // samples, which should be above the thresholds
                    
                    if(gHighSamples[ch] >= kSignalOnHighCount &&
                       gLowSamples[ch] >= kSignalOnLowCount) {
                        gChannelOKWhenOn[ch] = true;
                    }
                    else {
                        rt_printf("Channel %d FAIL (on): high %d (should be >= %d), low %d (should be >= %d)\n",
                                    ch, gHighSamples[ch], kSignalOnHighCount, gLowSamples[ch], kSignalOnLowCount);
                        gChannelOKWhenOn[ch] = false;
                    }
                    
                   gSamplesInState[ch] = 0;
                   gChannelState[ch] = kStateTurningOff;
                   gHighSamples[ch] = gLowSamples[ch] = 0;
                } 
            }
            else if(gChannelState[ch] == kStateSignalOff) {
                analogWrite(context, n, ch, 0.5);
                
                // Check for inputs that are outside of range
                // (this is bad here)
                if(input > kSignalOffHighThreshold)
                    gHighSamples[ch]++;
                if(input < kSignalOffLowThreshold)
                    gLowSamples[ch]++;
                
                if(gSamplesInState[ch] >= kSamplesInSignalState) {
                    // Here we evaluate whether the channel has passed
                    // or failed, based on the number of out-of-range
                    // samples, which should be above the thresholds
                    
                    if(gHighSamples[ch] <= kSignalOffHighCount &&
                       gLowSamples[ch] <= kSignalOffLowCount) {
                        gChannelOKWhenOff[ch] = true;
                    }
                    else {
                        rt_printf("Channel %d FAIL (off): high %d (should be <= %d), low %d (should be <= %d)\n",
                                    ch, gHighSamples[ch], kSignalOffHighCount, gLowSamples[ch], kSignalOffLowCount);
                        gChannelOKWhenOff[ch] = false;
                    }
                    
                   gSamplesInState[ch] = 0;
                   gChannelState[ch] = kStateTurningOn;
                   gHighSamples[ch] = gLowSamples[ch] = 0;
                }
            }
            else if(gChannelState[ch] == kStateTurningOff) {
                analogWrite(context, n, ch, 0.5);
                
                if(gSamplesInState[ch] >= kSamplesInTransitionState) {
                   gSamplesInState[ch] = 0;
                   gChannelState[ch] = kStateSignalOff;
                   gHighSamples[ch] = gLowSamples[ch] = 0;
                }
            }
            else if(gChannelState[ch] == kStateTurningOn) {
                analogWriteOnce(context, n, ch, signal);
                
                if(gSamplesInState[ch] >= kSamplesInTransitionState) {
                   gSamplesInState[ch] = 0;
                   gChannelState[ch] = kStateSignalOn;
                   gHighSamples[ch] = gLowSamples[ch] = 0;
                }
            }
        }    
    }
    
    bool passed = true;
    for(unsigned int ch = 0; ch < context->analogOutChannels; ch++) {
        if(!gChannelOKWhenOff[ch] || !gChannelOKWhenOn[ch])
            passed = false;
    }
    
    // Play a signal out the audio output to indicate whether the
    // channels have passed or failed
    for(unsigned int n = 0; n < context->audioFrames; n++) {
        float sample = gEnvelopeValue * sinf(gAudioPhase);
        float frequency;
        
		// If one second has gone by with no error, play one sound, else
		// play another
		if(passed) {
			gEnvelopeValue *= gEnvelopeDecayRate;
			gEnvelopeSampleCount++;
			if(gEnvelopeSampleCount > 22050) {
				gEnvelopeValue = 0.5;
				gEnvelopeSampleCount = 0;
			}
			frequency = 880.0;
			gAudioChannelBufferNumber = -1;
		}
		else {
		    // Fail: play a low tone and sound files indicating which channel failed
			gEnvelopeValue = 0.2;
			frequency = 220.0;
		
			if(gAudioChannelBufferNumber >= 0) {
			    sample += gAudioChannelBuffers[gAudioChannelBufferNumber][gAudioChannelBufferPointer] * 0.8;
			    gAudioChannelBufferPointer++;
			    if(gAudioChannelBufferPointer >= gAudioChannelBufferLengths[gAudioChannelBufferNumber]) {
			        // Got to the end of one sample; play the next
			        gAudioChannelBufferPointer = 0;
			        
			        while(++gAudioChannelBufferNumber < NUM_CHANNELS) {
			            // Loop until we either get to the end or find
			            // a failed channel
			            if(!gChannelOKWhenOn[gAudioChannelBufferNumber] ||
			               !gChannelOKWhenOff[gAudioChannelBufferNumber]) {
			                break;
			            }
			        }
			        if(gAudioChannelBufferNumber >= NUM_CHANNELS) {
			            gAudioChannelBufferNumber = -1;
			        }
			    }
			}
			else {
			    // No buffer to play, but delay 2 seconds and then start the loop over again
			    gAudioChannelBufferPointer++;
			    if(gAudioChannelBufferPointer >= 2 * context->audioSampleRate) {
			        gAudioChannelBufferNumber = -1;
			        gAudioChannelBufferPointer = 0;
			        while(++gAudioChannelBufferNumber < NUM_CHANNELS) {
			            // Loop until we either get to the end or find
			            // a failed channel
			            if(!gChannelOKWhenOn[gAudioChannelBufferNumber] ||
			               !gChannelOKWhenOff[gAudioChannelBufferNumber]) {
			                break;
			            }
			        }
			        if(gAudioChannelBufferNumber >= NUM_CHANNELS) {
			            gAudioChannelBufferNumber = -1;
			        }
			    }
			}
		}

        audioWrite(context, n, 0, sample);
        audioWrite(context, n, 1, sample);
        
		gAudioPhase += 2.0 * M_PI * frequency / context->audioSampleRate;
		if(gAudioPhase >= 2.0 * M_PI)
			gAudioPhase -= 2.0 * M_PI;        
    }
}

void cleanup(BelaContext *context, void *userData)
{
    for(int i = 0; i < NUM_CHANNELS; i++) {
        if(gAudioChannelBuffers[i] != 0)
            free(gAudioChannelBuffers[i]);
    }
}
