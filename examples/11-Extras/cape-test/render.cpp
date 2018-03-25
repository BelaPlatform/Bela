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
#include <Gpio.h>

float ANALOG_OUT_LOW;
float ANALOG_OUT_HIGH;
float ANALOG_IN_LOW;
float ANALOG_IN_HIGH;

enum {
	kStateTestingAudioLeft = 0,
	kStateTestingAudioRight,
	kStateTestingAudioDone,
	kStateTestingAnalog,
	kStateTestingAnalogDone,
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

Gpio* led1;
Gpio* led2;

bool setup(BelaContext *context, void *userData)
{
	printf("To prepare for this test you should physically connect each audio and analog output back to its respective input\n");
	if(context->analogOutChannels == 0)
	{
		printf("On Bela Mini, feed back the line out L to audio in L and analogs 0, 2, 4, 6, and a feed the line out R to audio in L and analogs 1, 3, 5 ,7\n");
		// Bela Mini: it has no analog outs, so we feed the
		// analog inputs from the line out (DC-coupled).
		ANALOG_OUT_LOW = -1; // 0.19V
		ANALOG_OUT_HIGH = 1; // 2.6V
		ANALOG_IN_LOW = 0.15;
		ANALOG_IN_HIGH = 0.5;
		// also init the LEDs as outputs
		led1 = new Gpio;
		led1->open(87, OUTPUT);
		led2 = new Gpio;
		led2->open(89, OUTPUT);
	} else {
		ANALOG_OUT_LOW = 0;
		ANALOG_OUT_HIGH = 50000.0 / 65536.0;
		ANALOG_IN_LOW = 2048.0 / 65536.0;
		ANALOG_IN_HIGH = 50000.0 / 65536.0;
	}
	return true;
}

void render(BelaContext *context, void *userData)
{
	
	// float* aoc = (float*)&context->analogOutChannels;
	// *aoc = 0; // simulate Bela Mini. Should also change the condition in setup() accordingly
	static float phase = 0.0;
	static int sampleCounter = 0;
	static int invertChannel = 0;
	float frequency = 0;

	if(gAudioTestState == kStateTestingNone){
		gAudioTestState = kStateTestingAudioLeft;
		rt_printf("Testing audio left\n");
	}

	if(gAudioTestState == kStateTestingAudioDone)
	{
		gAudioTestState = kStateTestingAnalog;
		rt_printf("Testing analog\n");
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
		
		int enabledChannel;
		int disabledChannel;
		const char* enabledChannelLabel;
		const char* disabledChannelLabel;
		if(gAudioTestState == kStateTestingAudioLeft) {
			enabledChannel = 0;
			disabledChannel = 1;
			enabledChannelLabel = "Left";
			disabledChannelLabel = "Right";
		} else if (gAudioTestState == kStateTestingAudioRight) {
			enabledChannel = 1;
			disabledChannel = 0;
			enabledChannelLabel = "Right";
			disabledChannelLabel = "Left";
		}
		if(gAudioTestState == kStateTestingAudioLeft || gAudioTestState  == kStateTestingAudioRight)
		{
			audioWrite(context, n, enabledChannel, 0.2f * sinf(phase));
			audioWrite(context, n, disabledChannel, 0);
			
			frequency = 3000.0;
			phase += 2.0f * (float)M_PI * frequency / context->audioSampleRate;
			if(phase >= M_PI)
				phase -= 2.0f * (float)M_PI;
			
			gAudioTestStateSampleCount++;
			if(gAudioTestStateSampleCount >= gAudioTestStateSampleThreshold) {
				// Check if we have the expected input: signal on the enabledChannel but not
				// on the disabledChannel. Also check that there is not too much DC offset on the
				// inactive channel
				if((gPositivePeakLevels[enabledChannel] - gNegativePeakLevels[enabledChannel]) >= gPeakLevelHighThreshold 
					&& (gPositivePeakLevels[disabledChannel] -  gNegativePeakLevels[disabledChannel]) <= gPeakLevelLowThreshold &&
					fabsf(gPositivePeakLevels[disabledChannel]) < gDCOffsetThreshold &&
					fabsf(gNegativePeakLevels[disabledChannel]) < gDCOffsetThreshold) {
					// Successful test: increment counter
					gAudioTestSuccessCounter++;
					if(gAudioTestSuccessCounter >= gAudioTestSuccessCounterThreshold) {
						rt_printf("Audio %s test successful\n", enabledChannelLabel);
						if(gAudioTestState == kStateTestingAudioLeft)
						{
							gAudioTestState = kStateTestingAudioRight;
							rt_printf("Testing audio Right\n");
						} else if(gAudioTestState == kStateTestingAudioRight)
						{
							gAudioTestState = kStateTestingAudioDone;
						}

						gAudioTestStateSampleCount = 0;
						gAudioTestSuccessCounter = 0;
					}

				}
				else {
					if(!((context->audioFramesElapsed + n) % 22050)) {
						// Debugging print messages
						if((gPositivePeakLevels[enabledChannel] - gNegativePeakLevels[enabledChannel]) < gPeakLevelHighThreshold)
							rt_printf("%s Audio In FAIL: insufficient signal: %f\n", enabledChannelLabel,
										gPositivePeakLevels[enabledChannel] - gNegativePeakLevels[enabledChannel]);
						else if(gPositivePeakLevels[disabledChannel] -  gNegativePeakLevels[disabledChannel] > gPeakLevelLowThreshold)
							rt_printf("%s Audio In FAIL: signal present when it should not be: %f\n", disabledChannelLabel,
										gPositivePeakLevels[disabledChannel] -  gNegativePeakLevels[disabledChannel]);
						else if(fabsf(gPositivePeakLevels[disabledChannel]) >= gDCOffsetThreshold ||
								fabsf(gNegativePeakLevels[disabledChannel]) >= gDCOffsetThreshold)
							rt_printf("%s Audio In FAIL: DC offset: (%f, %f)\n", disabledChannelLabel,
										gPositivePeakLevels[disabledChannel], gNegativePeakLevels[disabledChannel]);
					}
					gAudioTestSuccessCounter--;
					if(gAudioTestSuccessCounter <= 0)
						gAudioTestSuccessCounter = 0;
				}
			}
		}
		if(
			gAudioTestState == kStateTestingAnalogDone || // Bela Mini: the audio outs are used also for testing analogs, so we only play the tone at the end of all tests
			(gAudioTestState >= kStateTestingAudioDone && context->analogOutChannels) // Bela: we play as soon as testing audio ends, while live-testing the analogs.
		)
		{
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
				if(led1)
				{
					led1->write(gEnvelopeValueL > 0.2);
				}
				if(led2)
				{
					led2->write(gEnvelopeValueR > 0.2);
				}
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

	unsigned int outChannels = context->analogOutChannels ? context->analogOutChannels : context->audioOutChannels;
	unsigned int outFrames = context->analogOutChannels ? context->analogFrames : context->audioFrames;
	if(gAudioTestState == kStateTestingAnalog)
	{
		for(unsigned int n = 0; n < outFrames; n++) {
			// Change outputs every 512 samples
			for(int k = 0; k < outChannels; k++) {
				float outValue;
				if((k % outChannels) == (invertChannel % outChannels))
					outValue = sampleCounter < 512 ? ANALOG_OUT_HIGH : ANALOG_OUT_LOW;
				else
					outValue = sampleCounter < 512 ? ANALOG_OUT_LOW : ANALOG_OUT_HIGH;
				if(context->analogOutChannels == 0)
					audioWrite(context, n, k%2, outValue); // Bela Mini, using audio outs instead
				else
					analogWriteOnce(context, n, k, outValue); // Bela
			}
		}

		for(unsigned int n = 0; n < context->analogFrames; n++) {
			// Read after 256 samples: input should be low (high for inverted)
			// Read after 768 samples: input should be high (low for inverted)
			if(sampleCounter == 256 || sampleCounter == 768) {
				for(int k = 0; k < context->analogInChannels; k++) {
					float inValue = analogRead(context, n, k);
					bool inverted = ((k % outChannels) == (invertChannel % outChannels));
					if(
						(
							inverted &&
							(
								(sampleCounter == 256 && inValue < ANALOG_IN_HIGH) ||
								(sampleCounter == 768 && inValue > ANALOG_IN_LOW)
							)
						) || (
							!inverted &&
							(
								(sampleCounter == 256 && inValue > ANALOG_IN_LOW) ||
								(sampleCounter == 768 && inValue < ANALOG_IN_HIGH)
							)
						)
					)
					{
						rt_printf("Analog FAIL [output %d, input %d] -- output %s input %f %s\n", 
							k % outChannels, 
							k,
							(sampleCounter == 256 && inverted) || (sampleCounter == 768 && !inverted) ? "HIGH" : "LOW",
							inValue,
							inverted ? "(inverted channel)" : "");
						gLastErrorFrame = context->audioFramesElapsed + n;
						gAnalogTestSuccessCounter = 0;
					} else {
						++gAnalogTestSuccessCounter;
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
				{
					rt_printf("Analog test successful\n");
					gAudioTestState = kStateTestingAnalogDone;

				}
				notified = true;
			}
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{
	delete led1;
	delete led2;
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
