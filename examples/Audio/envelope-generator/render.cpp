 /**
 * \example Audio/envelope-generator
 *
 * ADSR envelope generator
 * =======================
 *
 * This sketch demonstrates how to make a simple oscillator with different waveforms and how to use
 * the ADSR library to apply an envelope to an audio signal.
 *
 * The ADSR gate is controlled by a button connected to digital pin 0. When the button is pressed the
 * gate is turned ON and when it is released the gate is turned OFF.
 *
 * The oscillator has 4 different waveforms available: sinewave, square wave, triangle wave and sawtooth.
 * A button connected to digital pin 1. When the button is pressed the waveform of the oscillator changes.
 * Continuous presses of the button will cycle over the different waveforms.
 *
 * The frequency of the oscillator and the parameters of the ADSR are fixed to some predefined values in
 * global variables. You can explore how to change these at runtime.
 *
 * To learn more about ADSRs and how to use the ADSR library, make sure to check Nigel Redmon's fantastic blog:
 * https://www.earlevel.com/main/category/envelope-generators/
 *
 **/
#include <Bela.h>
#include <cmath>
#include <libraries/ADSR/ADSR.h>

ADSR envelope; // ADSR envelope

float gAttack = 0.1; // Envelope attack (seconds)
float gDecay = 0.25; // Envelope decay (seconds)
float gRelease = 0.5; // Envelope release (seconds)
float gSustain = 1.0; // Envelope sustain level

float gFrequency = 320.0; // Oscillator frequency (Hz)
float gPhase; // Oscillator phase
float gInverseSampleRate;

// Oscillator type
enum osc_type
{
	sine,		// 0
	triangle,	// 1
	square,		// 2
	sawtooth,	// 3
	numOscTypes
};

unsigned int gOscType = 0; // Selected oscillator type
float gAmplitude = 0.3f; // Amplitude scaling for oscillator's envelope

int gTriggerButtonPin = 0; // Digital pin to which gate button should be connected
int gTriggerButtonLastStatus = 0; // Last status of gate button

int gModeButtonPin = 1; // Digital pin to which oscillator selection button should be connected
int gModeButtonLastStatus = 0; // Last status of oscillator selection button

bool setup(BelaContext *context, void *userData)
{
	gInverseSampleRate = 1.0 / context->audioSampleRate;
	gPhase = 0.0;

	// Set ADSR parameters
	envelope.setAttackRate(gAttack * context->audioSampleRate);
	envelope.setDecayRate(gDecay * context->audioSampleRate);
	envelope.setReleaseRate(gRelease * context->audioSampleRate);
	envelope.setSustainLevel(gSustain);

	// Set buttons pins as inputs
	pinMode(context, 0, gTriggerButtonPin, INPUT);
	pinMode(context, 0, gModeButtonPin, INPUT);

	return true;
}

void render(BelaContext *context, void *userData)
{

	for(unsigned int n = 0; n < context->audioFrames; n++) {

		// Read status of gate button
		int triggerButtonStatus = digitalRead(context, n, gTriggerButtonPin);

		// If gate button has been pressed...
		if(triggerButtonStatus && !gTriggerButtonLastStatus) {
			// ...turn ON the envelope's gate
			envelope.gate(true);
			rt_printf("Gate on\n");
		// If button has been depressed...
		} else if (!triggerButtonStatus && gTriggerButtonLastStatus) {
			// ...turn OFF the envelope's gate
			envelope.gate(false);
			rt_printf("Gate off\n");
		}
		// Store last status
		gTriggerButtonLastStatus = triggerButtonStatus;

		// Read status of oscillator mode selector button
		int modeButtonStatus = digitalRead(context, 0, gModeButtonPin);

		// If button has been pressed...
		if(modeButtonStatus && !gModeButtonLastStatus) {
			// Change oscillator type
			gOscType += 1;
			// Wrap around number of different oscillator types if counter is out of bounds
			if(gOscType >= numOscTypes)
				gOscType = 0;
			rt_printf("Oscillator type: %d\n", gOscType);
		}
		// Store last status
		gModeButtonLastStatus = modeButtonStatus;

		float amp = gAmplitude * envelope.process();

		// Calculate output based on the selected oscillator mode
		float out;
		switch(gOscType) {
			default:
			// SINEWAVE
			case sine:
				out = sinf(gPhase);
				break;
			// TRIANGLE WAVE
			case triangle:
				if (gPhase > 0) {
				      out = -1 + (2 * gPhase / (float)M_PI);
				} else {
				      out = -1 - (2 * gPhase/ (float)M_PI);
				}
				break;
			// SQUARE WAVE
			case square:
				if (gPhase > 0) {
				      out = 1;
				} else {
				      out = -1;
				}
				break;
			// SAWTOOTH
			case sawtooth:
				out = 1 - (1 / (float)M_PI * gPhase);
				break;
		}
		out = amp * out;

		// Compute phase
		gPhase += 2.0f * (float)M_PI * gFrequency * gInverseSampleRate;
		if(gPhase > M_PI)
			gPhase -= 2.0f * (float)M_PI;

		// Write output to different channels
		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			audioWrite(context, n, channel, out);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
