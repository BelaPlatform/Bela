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

#define ANALOG_LOW	(2048.0 / 65536.0)
#define ANALOG_HIGH (50000.0 / 65536.0)

enum {
	kStateTestingAudioLeft = 0,
	kStateTestingAudioRight,
	kStateTestingAudioDone,
	kStateTestingNone
};

uint64_t gLastErrorFrame = 0;
uint32_t gEnvelopeSampleCount = 0;
float gEnvelopeValueL = 0.5, gEnvelopeValueR = 0.5;
float gEnvelopeDecayRate = 0.9995;
int gEnvelopeLastChannel = 0;

float gPositivePeakLevels[2] = {0, 0};
float gNegativePeakLevels[2] = {0, 0};
float gPeakLevelDecayRate = 0.999;
int gAnalogTestSuccessCounter = 0;
const float gPeakLevelLowThreshold = 0.02;
const float gPeakLevelHighThreshold = 0.2;
const float gDCOffsetThreshold = 0.1;
int gAudioTestState = kStateTestingNone;
int gAudioTestStateSampleCount = 0;
int gAudioTestSuccessCounter = 0;
const int gAudioTestSuccessCounterThreshold = 64;
const int gAudioTestStateSampleThreshold = 16384;

bool setup(BelaContext *context, void *userData)
{
	printf("To prepare for this test you should physically connect each audio and analog output back to its respective input\n");
	return true;
}

void render(BelaContext *context, void *userData)
{
	static float phase = 0.0;
	static int sampleCounter = 0;
	static int invertChannel = 0;
	float frequency = 0;

	if(gAudioTestState == kStateTestingNone){
		gAudioTestState = kStateTestingAudioLeft;
		rt_printf("Testing audio left\n");
	}

	// Play a sine wave on the audio output
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		
		// Peak detection on the audio inputs, with offset to catch
		// DC errors
		for(int ch = 0; ch < context->audioInChannels; ch++) {
			float value = audioRead(context, n, ch);
			if(value > gPositivePeakLevels[ch])
				gPositivePeakLevels[ch] = value;
			gPositivePeakLevels[ch] += 0.1f;
			gPositivePeakLevels[ch] *= gPeakLevelDecayRate;
			gPositivePeakLevels[ch] -= 0.1f;
			if(value < gNegativePeakLevels[ch])
				gNegativePeakLevels[ch] = value;
			gNegativePeakLevels[ch] -= 0.1f;
			gNegativePeakLevels[ch] *= gPeakLevelDecayRate;
			gNegativePeakLevels[ch] += 0.1f;
		}
		
		if(gAudioTestState == kStateTestingAudioLeft) {
			audioWrite(context, n, 0, 0.2f * sinf(phase));
			audioWrite(context, n, 1, 0);
			
			frequency = 3000.0;
			phase += 2.0f * (float)M_PI * frequency / context->audioSampleRate;
			if(phase >= M_PI)
				phase -= 2.0f * (float)M_PI;
			
			gAudioTestStateSampleCount++;
			if(gAudioTestStateSampleCount >= gAudioTestStateSampleThreshold) {
				// Check if we have the expected input: signal on the left but not
				// on the right. Also check that there is not too much DC offset on the
				// inactive signal
				if((gPositivePeakLevels[0] - gNegativePeakLevels[0]) >= gPeakLevelHighThreshold 
					&& (gPositivePeakLevels[1] -  gNegativePeakLevels[1]) <= gPeakLevelLowThreshold &&
					fabsf(gPositivePeakLevels[1]) < gDCOffsetThreshold &&
					fabsf(gNegativePeakLevels[1]) < gDCOffsetThreshold) {
					// Successful test: increment counter
					gAudioTestSuccessCounter++;
					if(gAudioTestSuccessCounter >= gAudioTestSuccessCounterThreshold) {
						rt_printf("Audio Left test succesful\n");
						rt_printf("Testing audio Right\n");
						gAudioTestState = kStateTestingAudioRight;
						gAudioTestStateSampleCount = 0;
						gAudioTestSuccessCounter = 0;
					}

				}
				else {
					if(!((context->audioFramesElapsed + n) % 22050)) {
						// Debugging print messages
						if((gPositivePeakLevels[0] - gNegativePeakLevels[0]) < gPeakLevelHighThreshold)
							rt_printf("Left Audio In FAIL: insufficient signal: %f\n", 
										gPositivePeakLevels[0] - gNegativePeakLevels[0]);
						else if(gPositivePeakLevels[1] -  gNegativePeakLevels[1] > gPeakLevelLowThreshold)
							rt_printf("Right Audio In FAIL: signal present when it should not be: %f\n",
										gPositivePeakLevels[1] -  gNegativePeakLevels[1]);
						else if(fabsf(gPositivePeakLevels[1]) >= gDCOffsetThreshold ||
								fabsf(gNegativePeakLevels[1]) >= gDCOffsetThreshold)
							rt_printf("Right Audio In FAIL: DC offset: (%f, %f)\n",
										gPositivePeakLevels[1], gNegativePeakLevels[1]);						
					}
					gAudioTestSuccessCounter--;
					if(gAudioTestSuccessCounter <= 0)
						gAudioTestSuccessCounter = 0;
				}
			}
		}
		else if(gAudioTestState == kStateTestingAudioRight) {
			audioWrite(context, n, 0, 0);
			audioWrite(context, n, 1, 0.2f * sinf(phase));
			
			frequency = 3000.0;
			phase += 2.0f * (float)M_PI * frequency / context->audioSampleRate;
			if(phase >= M_PI)
				phase -= 2.0f * (float)M_PI;
			
			gAudioTestStateSampleCount++;
			if(gAudioTestStateSampleCount >= gAudioTestStateSampleThreshold) {
				// Check if we have the expected input: signal on the left but not
				// on the right
				if((gPositivePeakLevels[1] - gNegativePeakLevels[1]) >= gPeakLevelHighThreshold 
					&& (gPositivePeakLevels[0] -  gNegativePeakLevels[0]) <= gPeakLevelLowThreshold &&
					fabsf(gPositivePeakLevels[0]) < gDCOffsetThreshold &&
					fabsf(gNegativePeakLevels[0]) < gDCOffsetThreshold) {
					// Successful test: increment counter
					gAudioTestSuccessCounter++;
					if(gAudioTestSuccessCounter >= gAudioTestSuccessCounterThreshold) {
						gAudioTestSuccessCounter = 0;							
						gAudioTestStateSampleCount = 0;
						rt_printf("Audio Right test succesful\n");
						rt_printf("Testing analog\n");
						gAudioTestState = kStateTestingAudioDone;
					}
				}
				else {
					if(!((context->audioFramesElapsed + n) % 22050)) {
						// Debugging print messages
						if((gPositivePeakLevels[1] - gNegativePeakLevels[1]) < gPeakLevelHighThreshold)
							rt_printf("Right Audio In FAIL: insufficient signal: %f\n", 
										gPositivePeakLevels[1] - gNegativePeakLevels[1]);
						else if(gPositivePeakLevels[0] -  gNegativePeakLevels[0] > gPeakLevelLowThreshold)
							rt_printf("Left Audio In FAIL: signal present when it should not be: %f\n",
										gPositivePeakLevels[0] -  gNegativePeakLevels[0]);
						else if(fabsf(gPositivePeakLevels[0]) >= gDCOffsetThreshold ||
								fabsf(gNegativePeakLevels[0]) >= gDCOffsetThreshold)
							rt_printf("Left Audio In FAIL: DC offset: (%f, %f)\n",
										gPositivePeakLevels[0], gNegativePeakLevels[0]);						
					}
					gAudioTestSuccessCounter--;
					if(gAudioTestSuccessCounter <= 0)
						gAudioTestSuccessCounter = 0;
				}
			}			
		}
		else {
			// Audio input testing finished. Play tones depending on status of
			// analog testing
			audioWrite(context, n, 0, gEnvelopeValueL * sinf(phase));
			audioWrite(context, n, 1, gEnvelopeValueR * sinf(phase));

			// If one second has gone by with no error, play one sound, else
			// play another
			if(context->audioFramesElapsed + n - gLastErrorFrame > context->audioSampleRate)
			{
				gEnvelopeValueL *= gEnvelopeDecayRate;
				gEnvelopeValueR *= gEnvelopeDecayRate;
				gEnvelopeSampleCount++;
				if(gEnvelopeSampleCount > 22050) {
					if(gEnvelopeLastChannel == 0)
						gEnvelopeValueR = 0.5;
					else
						gEnvelopeValueL = 0.5;
					gEnvelopeLastChannel = !gEnvelopeLastChannel;
					gEnvelopeSampleCount = 0;
				}
				frequency = 880.0;
			} else {
				gEnvelopeValueL = gEnvelopeValueR = 0.5;
				gEnvelopeLastChannel = 0;
				frequency = 220.0;
			}

			phase += 2.0f * (float)M_PI * frequency / context->audioSampleRate;
			if(phase >= M_PI)
				phase -= 2.0f * (float)M_PI;
		}
	}

	for(unsigned int n = 0; n < context->analogFrames; n++) {
		// Change outputs every 512 samples
		if(sampleCounter < 512) {
			for(int k = 0; k < context->analogOutChannels; k++) {
				float outValue;
				if(k == invertChannel)
					outValue = ANALOG_HIGH;
				else
					outValue = 0;
				analogWriteOnce(context, n, k, outValue);
			}
		}
		else {
			for(int k = 0; k < context->analogOutChannels; k++) {
				float outValue;
				if(k == invertChannel)
					outValue = 0;
				else
					outValue = ANALOG_HIGH;
				analogWriteOnce(context, n, k, outValue);
			}
		}

		// Read after 256 samples: input should be low
		if(sampleCounter == 256) {
			for(int k = 0; k < context->analogInChannels; k++) {
				float inValue = analogRead(context, n, k);
				if(k == invertChannel) {
					if(inValue < ANALOG_HIGH) {
						rt_printf("Analog FAIL [output %d, input %d] -- output HIGH input %f (inverted)\n", k, k, inValue);
						gLastErrorFrame = context->audioFramesElapsed + n;
					} else {
						++gAnalogTestSuccessCounter;
					}
				}
				else {
					if(inValue > ANALOG_LOW) {
						rt_printf("Analog FAIL [output %d, input %d] -- output LOW --> input %f\n", k, k, inValue);
						gLastErrorFrame = context->audioFramesElapsed + n;
					} else {
						++gAnalogTestSuccessCounter;
					}
				}
			}
		}
		else if(sampleCounter == 768) {
			for(int k = 0; k < context->analogInChannels; k++) {
				float inValue = analogRead(context, n, k);
				if(k == invertChannel) {
					if(inValue > ANALOG_LOW) {
						rt_printf("Analog FAIL [output %d, input %d] -- output LOW input %f (inverted)\n", k, k, inValue);
						gLastErrorFrame = context->audioFramesElapsed + n;
					} else {
						++gAnalogTestSuccessCounter;
					}
				}
				else {
					if(inValue < ANALOG_HIGH) {
						rt_printf("Analog FAIL [output %d, input %d] -- output HIGH input %f\n", k, k, inValue);
						gLastErrorFrame = context->audioFramesElapsed + n;
					} else {
						++gAnalogTestSuccessCounter;
					}
				}
			}
		}

		if(++sampleCounter >= 1024) {
			sampleCounter = 0;
			invertChannel++;
			if(invertChannel >= 8)
				invertChannel = 0;
		}
		if(gAnalogTestSuccessCounter >= 500) {
			static bool notified = false;
			if(!notified)
				rt_printf("Analog test successful\n");
			notified = true;
		}
	}

}

void cleanup(BelaContext *context, void *userData)
{

}

/**
 * \example cape-test/render.cpp
 *
 * Testing the functionalities of the Bela cape
 * -----------------------------------------
 *
 *  This program checks that audio and analog I/O work properly.
 *  You should physically connect each audio and analog output back to its
 *  respective input.
 */
