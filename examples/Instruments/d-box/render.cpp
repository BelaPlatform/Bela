/*
 * render.cpp
 *
 *  Created on: May 28, 2014
 *      Author: Victor Zappi
 */

#include <Bela.h>
#include <PRU.h>

#include "StatusLED.h"
#include "config.h"
#include <DboxOscillatorBank.h>
#include "FeedbackOscillator.h"
#include "ADSR.h"
#include "FIRfilter.h"
#include <assert.h>
#include <cmath>
#include <algorithm>
#include <vector>

#ifdef XENOMAI_SKIN_native
#include <native/timer.h>
// xenomai timer
SRTIME prevChangeNs = 0;
#endif
#ifdef XENOMAI_SKIN_posix
// xenomai timer
long long int prevChangeNs = 0;
#endif

#undef DBOX_CAPE_TEST

// Mappings from pin numbers on PCB to actual DAC channels
// This gives the DAC and ADC connectors the same effective pinout
// Update June 2016: this is no longer needed in the latest Bela
// release, but is kept here for convenience: it used to be 
// 6 4 2 0 1 3 5 7 for the DAC pins
#define DAC_PIN0	0
#define DAC_PIN1	1
#define DAC_PIN2	2
#define DAC_PIN3	3
#define DAC_PIN4	4
#define DAC_PIN5	5
#define DAC_PIN6	6
#define DAC_PIN7	7

#define ADC_PIN0	0
#define ADC_PIN1	1
#define ADC_PIN2	2
#define ADC_PIN3	3
#define ADC_PIN4	4
#define ADC_PIN5	5
#define ADC_PIN6	6
#define ADC_PIN7	7

#define N_OCT		4.0	// maximum number of octaves on sensor 1

extern vector<DboxOscillatorBank*> gOscBanks;
extern int gCurrentOscBank;
extern int gNextOscBank;
extern PRU *gPRU;
extern StatusLED gStatusLED;
extern bool gIsLoading;
extern bool gAudioIn;

int gAudioChannelNum; // number of audio channels to iterate over
int gAnalogChannelNum; // number of analog channels to iterate over


float *gOscillatorBuffer1, *gOscillatorBuffer2;
float *gOscillatorBufferRead, *gOscillatorBufferWrite;
int gOscillatorBufferReadPointer		= 0;
int gOscillatorBufferReadCurrentSize	= 0;
int gOscillatorBufferWriteCurrentSize	= 0;
bool gOscillatorNeedsRender				= false;

int gMatrixSampleCount = 0;		// How many samples have elapsed on the matrix

// Wavetable which changes in response to an oscillator
float *gDynamicWavetable;
int gDynamicWavetableLength;
bool gDynamicWavetableNeedsRender = false;

// These variables handle the hysteresis oscillator used for setting the playback speed
bool gSpeedHysteresisOscillatorRising	= false;
int gSpeedHysteresisLastTrigger			= 0;

// These variables handle the feedback oscillator used for controlling the wavetable
FeedbackOscillator gFeedbackOscillator;
float *gFeedbackOscillatorTable;
int gFeedbackOscillatorTableLength;

// This comes from sensor.cpp where it records the most recent touch location on
// sensor 0.
extern float gSensor0LatestTouchPos;
extern int gSensor0LatestTouchNum;
float gPitchLatestInput = 0;

extern float gSensor1LatestTouchPos[];
//extern float gSensor1LatestTouchSizes[];
extern int gSensor1LatestTouchCount;
extern int gSensor1LatestTouchIndex;
int gSensor1LastTouchIndex		= -1;
int gSensor1InputDelayCounter	= -1;
int gSensor1InputIndex			= 0;
float gSensor1MatrixTouchPos[5]	= {0};

// FSR value from matrix input
extern int gLastFSRValue;

// Loop points from matrix input 4
const int gLoopPointsInputBufferSize	= 256;
float gLoopPointsInputBuffer[gLoopPointsInputBufferSize];
int gLoopPointsInputBufferPointer		= 0;
float gLoopPointMin = 0, gLoopPointMax	= 0;

// multiplier to activate or mute audio in
int audioInStatus = 0;

// pitch vars
float octaveSplitter;
float semitones[((int)N_OCT*12)+1];
float deltaTouch	= 0;
float deltaWeightP	= 0.5 / 65536.0;
float deltaWeightI	= 0.0005 / 65536.0;

// filter vars
ne10_fir_instance_f32_t filter[2];
ne10_float32_t *filterIn[2];
ne10_float32_t *filterOut[2];
ne10_uint32_t blockSize;
ne10_float32_t *filterState[2];
ne10_float32_t prevFiltered[2];
int filterGain = 80;
ADSR PeakBurst[2];
float peak[2];
float peakThresh = 0.2;

// Tasks for lower-priority calculation
AuxiliaryTask gMediumPriorityRender, gLowPriorityRender;


extern "C" {
	// Function prototype for ARM assembly implementation of oscillator bank
	void dbox_oscillator_bank_neon(int numAudioFrames, float *audioOut,
							  int activePartialNum, int lookupTableSize,
							  float *phases, float *frequencies, float *amplitudes,
							  float *freqDerivatives, float *ampDerivatives,
							  float *lookupTable);

	void wavetable_interpolate_neon(int numSamplesIn, int numSamplesOut,
	                              float *tableIn, float *tableOut);
}

void wavetable_interpolate(int numSamplesIn, int numSamplesOut,
                              float *tableIn, float *tableOut,
                              float *sineTable, float sineMix);

inline float hysteresis_oscillator(float input, float risingThreshold,
									float fallingThreshold, bool *rising);

void render_medium_prio(void*);
void render_low_prio(void*);

#ifdef DBOX_CAPE_TEST
void render_capetest(int numMatrixFrames, int numAudioFrames, float *audioIn, float *audioOut,
			uint16_t *matrixIn, uint16_t *matrixOut);
#endif

bool setup(BelaContext *context, void *userData) {
	int oscBankHopSize = *(int *)userData;

	if(context->analogOutChannels < 8 || context->analogInChannels < 8) {
		printf("Error: D-Box needs at least 8 analog IO channels.\n");
		return false;
	}

	// If the amout of  analog input and output channels is not the same
	// we will use the minimum between input and output
	gAnalogChannelNum = std::min(context->analogInChannels, context->analogOutChannels);

	// Check that we have the same number of inputs and outputs.
	if(context->analogInChannels != context-> analogOutChannels){
			printf("Different number of analog outputs and inputs available. Using %d channels.\n", gAnalogChannelNum);
	}

	// The number of analog channels has to be set to 2 for this example 
	gAudioChannelNum = 2;

	// Allocate two buffers for rendering oscillator bank samples
	// One will be used for writing in the background while the other is used for reading
	// on the audio thread. 8-byte alignment needed for the NEON code.
	if(posix_memalign((void **)&gOscillatorBuffer1, 8, oscBankHopSize * gAudioChannelNum * sizeof(float))) {
		printf("Error allocating render buffers\n");
		return false;
	}
	if(posix_memalign((void **)&gOscillatorBuffer2, 8, oscBankHopSize * gAudioChannelNum * sizeof(float))) {
		printf("Error allocating render buffers\n");
		return false;
	}
	gOscillatorBufferWrite	= gOscillatorBuffer1;
	gOscillatorBufferRead	= gOscillatorBuffer2;

	memset(gOscillatorBuffer1, 0, oscBankHopSize * gAudioChannelNum * sizeof(float));
	memset(gOscillatorBuffer2, 0, oscBankHopSize * gAudioChannelNum * sizeof(float));

	// Initialise the dynamic wavetable used by the oscillator bank
	// It should match the size of the static one already allocated in the DboxOscillatorBank object
	// Don't forget a guard point at the end of the table
	gDynamicWavetableLength = gOscBanks[gCurrentOscBank]->lookupTableSize;
	if(posix_memalign((void **)&gDynamicWavetable, 8, (gDynamicWavetableLength + 1) * sizeof(float))) {
		printf("Error allocating wavetable\n");
		return false;
	}

	gFeedbackOscillator.initialise(8192, 10.0, context->analogSampleRate);

	for(int n = 0; n < gDynamicWavetableLength + 1; n++)
		gDynamicWavetable[n] = 0;

	// pitch
	float midPos		= 0.5;
	octaveSplitter		= 1.0 / N_OCT;
	int numOfSemi		= 12*N_OCT;
	int middleSemitone	= 12*N_OCT/2;
	int lastSemitone	= middleSemitone+numOfSemi/2;
	float inc 			= 1.0 / (N_OCT*12.0);
	int i 				= -1;
	for(int semi=middleSemitone; semi<=lastSemitone; semi++)
		semitones[semi] = ( midPos + (++i)*inc) + 0.5;
	i 					= 0;
	for(int semi=middleSemitone-1; semi>=0; semi--)
		semitones[semi] = ( midPos - (++i)*inc) + 0.5;

	if(gAudioIn)
		audioInStatus = 1;

	// filter
	blockSize		= context->audioFrames;
	filterState[0]	= (ne10_float32_t *) NE10_MALLOC ((FILTER_TAP_NUM+blockSize-1) * sizeof (ne10_float32_t));
	filterState[1]	= (ne10_float32_t *) NE10_MALLOC ((FILTER_TAP_NUM+blockSize-1) * sizeof (ne10_float32_t));
	filterIn[0]		= (ne10_float32_t *) NE10_MALLOC (blockSize * sizeof (ne10_float32_t));
	filterIn[1]		= (ne10_float32_t *) NE10_MALLOC (blockSize * sizeof (ne10_float32_t));
	filterOut[0]	= (ne10_float32_t *) NE10_MALLOC (blockSize * sizeof (ne10_float32_t));
	filterOut[1]	= (ne10_float32_t *) NE10_MALLOC (blockSize * sizeof (ne10_float32_t));
	ne10_fir_init_float(&filter[0], FILTER_TAP_NUM, filterTaps, filterState[0], blockSize);
	ne10_fir_init_float(&filter[1], FILTER_TAP_NUM, filterTaps, filterState[1], blockSize);

	// peak outputs
	PeakBurst[0].setAttackRate(.00001 * context->analogSampleRate);
	PeakBurst[1].setAttackRate(.00001 * context->analogSampleRate);
	PeakBurst[0].setDecayRate(.5 * context->analogSampleRate);
	PeakBurst[1].setDecayRate(.5 * context->analogSampleRate);
	PeakBurst[0].setSustainLevel(0.0);
	PeakBurst[1].setSustainLevel(0.0);

	// Initialise auxiliary tasks
	if((gMediumPriorityRender = Bela_createAuxiliaryTask(&render_medium_prio, BELA_AUDIO_PRIORITY - 10, "dbox-calculation-medium")) == 0)
		return false;
	if((gLowPriorityRender = Bela_createAuxiliaryTask(&render_low_prio, BELA_AUDIO_PRIORITY - 15, "dbox-calculation-low")) == 0)
		return false;

	return true;
}

void render(BelaContext *context, void *userData)
{
#ifdef DBOX_CAPE_TEST
	render_capetest(numMatrixFrames, numAudioFrames, audioIn, audioOut, matrixIn, matrixOut);
#else
	if(gOscBanks[gCurrentOscBank]->state==bank_toreset)
		gOscBanks[gCurrentOscBank]->resetOscillators();

	if(gOscBanks[gCurrentOscBank]->state==bank_playing)
	{
		assert(gAudioChannelNum == 2);

#ifdef OLD_OSCBANK
		memset(audioOut, 0, numAudioFrames *  * sizeof(float));

		/* Render the oscillator bank. The oscillator bank function is written in NEON assembly
		 * and it strips out all extra checks, so find out in advance whether we can render a whole
		 * block or whether the frame will increment in the middle of this buffer.
		 */

		int framesRemaining = numAudioFrames;
		float *audioOutWithOffset = audioOut;

		while(framesRemaining > 0) {
			if(gOscBanks[gCurrentOscBank]->hopCounter >= framesRemaining) {
				/* More frames left in this hop than we need this time. Render and finish */
				dbox_oscillator_bank_neon(framesRemaining, audioOutWithOffset,
									 gOscBanks[gCurrentOscBank]->actPartNum, gOscBanks[gCurrentOscBank]->lookupTableSize,
									 gOscBanks[gCurrentOscBank]->oscillatorPhases, gOscBanks[gCurrentOscBank]->oscillatorNormFrequencies,
									 gOscBanks[gCurrentOscBank]->oscillatorAmplitudes,
									 gOscBanks[gCurrentOscBank]->oscillatorNormFreqDerivatives,
									 gOscBanks[gCurrentOscBank]->oscillatorAmplitudeDerivatives,
									 gDynamicWavetable/*gOscBanks[gCurrentOscBank]->lookupTable*/);
				gOscBanks[gCurrentOscBank]->hopCounter -= framesRemaining;
				if(gOscBanks[gCurrentOscBank]->hopCounter <= 0)
					gOscBanks[gCurrentOscBank]->nextHop();
				framesRemaining = 0;
			}
			else {
				/* More frames to render than are left in this hop. Render and decrement the
				 * number of remaining frames; then advance to the next oscillator frame.
				 */
				dbox_oscillator_bank_neon(gOscBanks[gCurrentOscBank]->hopCounter, audioOutWithOffset,
									 gOscBanks[gCurrentOscBank]->actPartNum, gOscBanks[gCurrentOscBank]->lookupTableSize,
									 gOscBanks[gCurrentOscBank]->oscillatorPhases, gOscBanks[gCurrentOscBank]->oscillatorNormFrequencies,
									 gOscBanks[gCurrentOscBank]->oscillatorAmplitudes,
									 gOscBanks[gCurrentOscBank]->oscillatorNormFreqDerivatives,
									 gOscBanks[gCurrentOscBank]->oscillatorAmplitudeDerivatives,
									 gDynamicWavetable/*gOscBanks[gCurrentOscBank]->lookupTable*/);
				framesRemaining -= gOscBanks[gCurrentOscBank]->hopCounter;
				audioOutWithOffset +=  * gOscBanks[gCurrentOscBank]->hopCounter;
				gOscBanks[gCurrentOscBank]->sampleCount += gOscBanks[gCurrentOscBank]->hopCounter;
				gOscBanks[gCurrentOscBank]->nextHop();
			}
		}
#else
		for(unsigned int n = 0; n < context->audioFrames; n++) {
			context->audioOut[2*n] 	  = gOscillatorBufferRead[gOscillatorBufferReadPointer++]+context->audioIn[2*n]*audioInStatus;
			context->audioOut[2*n + 1] = gOscillatorBufferRead[gOscillatorBufferReadPointer++]+context->audioIn[2*n+1]*audioInStatus;

			filterIn[0][n] = fabs(context->audioIn[2*n]);	// rectify for peak detection in 1
			filterIn[1][n] = fabs(context->audioIn[2*n+1]);	// rectify for peak detection in 2

			/* FIXME why doesn't this work? */
			/*
			if(gOscillatorBufferReadPointer == gOscillatorBufferCurrentSize/2) {
				gOscillatorNeedsRender = true;
				scheduleAuxiliaryTask(gLowPriorityRender);
			} */

			if(gOscillatorBufferReadPointer >= gOscillatorBufferReadCurrentSize) {
				// Finished reading from the buffer: swap to the next buffer
				if(gOscillatorBufferRead == gOscillatorBuffer1) {
					gOscillatorBufferRead = gOscillatorBuffer2;
					gOscillatorBufferWrite = gOscillatorBuffer1;
				}
				else {
					gOscillatorBufferRead = gOscillatorBuffer1;
					gOscillatorBufferWrite = gOscillatorBuffer2;
				}

				// New buffer size is whatever finished writing last hop
				gOscillatorBufferReadCurrentSize = gOscillatorBufferWriteCurrentSize;
				gOscillatorBufferReadPointer = 0;

				gOscillatorNeedsRender = true;
				Bela_scheduleAuxiliaryTask(gMediumPriorityRender);
			}
		}
#endif
	}
	else
	{
		for(unsigned int n = 0; n < context->audioFrames; n++) {
			context->audioOut[2*n] 	  = context->audioIn[2*n]*audioInStatus;
			context->audioOut[2*n + 1] = context->audioIn[2*n+1]*audioInStatus;

			filterIn[0][n] = fabs(context->audioIn[2*n]);	// rectify for peak detection in 1
			filterIn[1][n] = fabs(context->audioIn[2*n+1]);	// rectify for peak detection in 2
		}
	}

	// low pass filter audio in 1 and 2 for peak detection
	ne10_fir_float_neon(&filter[0], filterIn[0], filterOut[0], blockSize);
	ne10_fir_float_neon(&filter[1], filterIn[1], filterOut[1], blockSize);

	for(unsigned int n = 0; n < context->analogFrames; n++) {


		/* Matrix Out 0, In 0
		 *
		 * CV loop
		 * Controls pitch of sound
		 */
		float touchPosInt = gSensor0LatestTouchPos;
		if(touchPosInt < 0) touchPosInt = 0;
		if(touchPosInt > 1.0) touchPosInt = 1.0;
		context->analogOut[n*8 + DAC_PIN0] = touchPosInt;

		gPitchLatestInput = context->analogIn[n*8 + ADC_PIN0];


		/* Matrix Out 7
		 *
		 * Loop feedback with Matrix In 0
		 * Controls discreet pitch
		 */
		float deltaTarget = 0;
		int semitoneIndex = 0;
		if(gSensor0LatestTouchNum>0)
		{
			// current pitch is gPitchLatestInput, already retrieved
			semitoneIndex	= ( gPitchLatestInput * 12 * N_OCT  )+0.5;	// closest semitone
			deltaTarget		= (semitones[semitoneIndex]-gPitchLatestInput);				// delta between pitch and target
			deltaTouch 		+= deltaTarget*(deltaWeightI);								// update feedback [previous + current]
		}
		else
			deltaTouch = 0;

		float nextOut = touchPosInt  + deltaTarget*deltaWeightP + deltaTouch;			// add feedback to touch -> next out
		if(nextOut < 0) nextOut = 0;												// clamp
		if(nextOut > 1.0) nextOut = 1.0;										// clamp
		context->analogOut[n*8 + DAC_PIN7] = nextOut;										// send next nextOut


		/*
		 * Matrix Out 1, In 1
		 *
		 * Hysteresis (comparator) oscillator
		 * Controls speed of playback
		 */
		bool wasRising = gSpeedHysteresisOscillatorRising;
		context->analogOut[n*8 + DAC_PIN1] = hysteresis_oscillator(context->analogIn[n*8 + ADC_PIN1], 48000.0/65536.0,
																	16000.0/65536.0, &gSpeedHysteresisOscillatorRising);

		// Find interval of zero crossing
		if(wasRising && !gSpeedHysteresisOscillatorRising) {
			int interval = gMatrixSampleCount - gSpeedHysteresisLastTrigger;

			// Interval since last trigger will be the new hop size; calculate to set speed
			if(interval < 1)
				interval = 1;
			//float speed = (float)gOscBanks[gCurrentOscBank]->getHopSize() / (float)interval;
			float speed = 144.0 / interval;	// Normalise to a fixed expected speed
			gOscBanks[gCurrentOscBank]->setSpeed(speed);

			gSpeedHysteresisLastTrigger = gMatrixSampleCount;
		}

		/*
		 * Matrix Out 2, In 2
		 *
		 * Feedback (phase shift) oscillator
		 * Controls wavetable used for oscillator bank
		 */

		int tableLength = gFeedbackOscillator.process(context->analogIn[n*8 + ADC_PIN2], &context->analogOut[n*8 + DAC_PIN2]);
		if(tableLength != 0) {
			gFeedbackOscillatorTableLength = tableLength;
			gFeedbackOscillatorTable = gFeedbackOscillator.wavetable();
			gDynamicWavetableNeedsRender = true;
			Bela_scheduleAuxiliaryTask(gLowPriorityRender);
		}

		/*
		 * Matrix Out 3, In 3
		 *
		 * CV loop with delay for time alignment
		 * Touch positions from sensor 1
		 * Change every 32 samples (ca. 1.5 ms)
		 */
		volatile int touchCount = gSensor1LatestTouchCount;
		if(touchCount == 0)
			context->analogOut[n*8 + DAC_PIN3] = 0;
		else {
			int touchIndex = (gMatrixSampleCount >> 5) % touchCount;
			context->analogOut[n*8 + DAC_PIN3] = gSensor1LatestTouchPos[touchIndex] * 56000.0f / 65536.0f;
			if(touchIndex != gSensor1LastTouchIndex) {
				// Just changed to a new touch output. Reset the counter.
				// It will take 2*matrixFrames samples for this output to come back to the
				// ADC input. But we also want to read near the end of the 32 sample block;
				// let's say 24 samples into it.

				// FIXME this won't work for p > 2
				gSensor1InputDelayCounter = 24 + 2*context->analogFrames;
				gSensor1InputIndex = touchIndex;
			}
			gSensor1LastTouchIndex = touchIndex;
		}

		if(gSensor1InputDelayCounter-- >= 0 && touchCount > 0) {
			gSensor1MatrixTouchPos[gSensor1InputIndex] = context->analogIn[n*8 + ADC_PIN3];
		}

		/* Matrix Out 4
		 *
		 * Sensor 1 last pos
		 */
		touchPosInt = gSensor1LatestTouchPos[gSensor1LatestTouchIndex];
		if(touchPosInt < 0) touchPosInt = 0;
		if(touchPosInt > 1.0) touchPosInt = 1.0;
		context->analogOut[n*8 + DAC_PIN4] = touchPosInt;

		/* Matrix In 4
		 *
		 * Loop points selector
		 */
		gLoopPointsInputBuffer[gLoopPointsInputBufferPointer++] = context->analogIn[n*8 + ADC_PIN4];
		if(gLoopPointsInputBufferPointer >= gLoopPointsInputBufferSize) {
			// Find min and max values
			float loopMax = 0, loopMin = 1.0;
			for(int i = 0; i < gLoopPointsInputBufferSize; i++) {
				if(gLoopPointsInputBuffer[i] < loopMin)
					loopMin = gLoopPointsInputBuffer[i];
				if(gLoopPointsInputBuffer[i] > loopMax/* && gLoopPointsInputBuffer[i] != 65535*/)
					loopMax = gLoopPointsInputBuffer[i];
			}

			if(loopMin >= loopMax)
				loopMax = loopMin;

			gLoopPointMax = loopMax;
			gLoopPointMin = loopMin;
			gLoopPointsInputBufferPointer = 0;
		}

		/* Matrix Out 5
		 *
		 * Audio In 1 peak detection and peak burst output
		 */

		filterOut[0][n*2+1]	*= filterGain;
		float burstOut		= PeakBurst[0].getOutput();
		if( burstOut < 0.1)
		{
			if( (prevFiltered[0]>=peakThresh) && (prevFiltered[0]>=filterOut[0][n*2+1]) )
			{
				peak[0] = prevFiltered[0];
				PeakBurst[0].gate(1);
			}
		}

		PeakBurst[0].process(1);

		float convAudio = burstOut*peak[0];
		context->analogOut[n*8 + DAC_PIN5] = convAudio;
		prevFiltered[0] = filterOut[0][n*2+1];
		if(prevFiltered[0]>1)
			prevFiltered[0] = 1;

		/* Matrix In 5
		 *
		 * Dissonance, via changing frequency motion of partials
		 */
		float amount = (float)context->analogIn[n*8 + ADC_PIN5];
		gOscBanks[gCurrentOscBank]->freqMovement = 1.0 - amount;




		/* Matrix Out 6
		 *
		 * Audio In 2 peak detection and peak burst output
		 */

		filterOut[1][n*2+1]	*= filterGain;
		burstOut			= PeakBurst[1].getOutput();
		if( burstOut < 0.1)
		{
			if( (prevFiltered[1]>=peakThresh) && (prevFiltered[1]>=filterOut[1][n*2+1]) )
			{
				peak[1] = prevFiltered[1];
				PeakBurst[1].gate(1);
			}
		}

		PeakBurst[1].process(1);

		convAudio = burstOut*peak[1];
		context->analogOut[n*8 + DAC_PIN6] = convAudio;
		prevFiltered[1] = filterOut[1][n*2+1];
		if(prevFiltered[1]>1)
			prevFiltered[1] = 1;

		/* Matrix In 6
		 *
		 * Sound selector
		 */
		if(!gIsLoading) {
			// Use hysteresis to avoid jumping back and forth between sounds
			if(gOscBanks.size() > 1) {
				float input = context->analogIn[n*8 + ADC_PIN6];
				const float hystValue = 16000.0 / 65536.0;

				float upHysteresisValue = ((gCurrentOscBank + 1) + hystValue) / gOscBanks.size();
				float downHysteresisValue = (gCurrentOscBank - hystValue) / gOscBanks.size();

				if(input > upHysteresisValue || input < downHysteresisValue) {
					gNextOscBank = input * gOscBanks.size();
					if(gNextOscBank < 0)
						gNextOscBank = 0;
					if((unsigned)gNextOscBank >= gOscBanks.size())
						gNextOscBank = gOscBanks.size() - 1;
				}
			}
		}

		/*
		 * Matrix In 7
		 *
		 * FSR from primary touch sensor
		 * Value ranges from 0-1799
		 */
		gLastFSRValue = context->analogIn[n*8 + ADC_PIN7] * 1799.0;
		//gLastFSRValue = 1799 - context->analogIn[n*8 + ADC_PIN7] * (1799.0 / 65535.0);
		//dbox_printf("%i\n",gLastFSRValue);

		gMatrixSampleCount++;
	}

#endif /* DBOX_CAPE_TEST */
}

// Medium-priority render function used for audio hop calculations
void render_medium_prio(void*)
{

	if(gOscillatorNeedsRender) {
		gOscillatorNeedsRender = false;

		/* Render one frame into the write buffer */
		memset(gOscillatorBufferWrite, 0, gOscBanks[gCurrentOscBank]->hopCounter * 2 * sizeof(float)); /* assumes 2 audio channels */

		dbox_oscillator_bank_neon(gOscBanks[gCurrentOscBank]->hopCounter, gOscillatorBufferWrite,
							 gOscBanks[gCurrentOscBank]->actPartNum, gOscBanks[gCurrentOscBank]->lookupTableSize,
							 gOscBanks[gCurrentOscBank]->oscillatorPhases, gOscBanks[gCurrentOscBank]->oscillatorNormFrequencies,
							 gOscBanks[gCurrentOscBank]->oscillatorAmplitudes,
							 gOscBanks[gCurrentOscBank]->oscillatorNormFreqDerivatives,
							 gOscBanks[gCurrentOscBank]->oscillatorAmplitudeDerivatives,
							 /*gOscBanks[gCurrentOscBank]->lookupTable*/gDynamicWavetable);

		gOscillatorBufferWriteCurrentSize = gOscBanks[gCurrentOscBank]->hopCounter * 2;

		/* Update the pitch right before the hop
		 * Total CV range +/- N_OCT octaves
		 */
		float pitch = (float)gPitchLatestInput / octaveSplitter - N_OCT/2;
		//gOscBanks[gCurrentOscBank]->pitchMultiplier = powf(2.0f, pitch);
		gOscBanks[gCurrentOscBank]->pitchMultiplier = pow(2.0f, pitch);

#ifdef FIXME_LATER // This doesn't work very well yet
		gOscBanks[gCurrentOscBank]->filterNum = gSensor1LatestTouchCount;
		float freqScaler = gOscBanks[gCurrentOscBank]->getFrequencyScaler();
		for(int i=0; i < gOscBanks[gCurrentOscBank]->filterNum; i++)
		{
			// touch pos is linear but freqs are log
			gOscBanks[gCurrentOscBank]->filterFreqs[i] = ((expf(gSensor1MatrixTouchPos[i]*4)-1)/(expf(4)-1))*gOscBanks[gCurrentOscBank]->filterMaxF*freqScaler;
			gOscBanks[gCurrentOscBank]->filterQ[i] = gSensor1LatestTouchSizes[i];
			if(gOscBanks[gCurrentOscBank]->filterFreqs[i]>500*freqScaler)
				gOscBanks[gCurrentOscBank]->filterPadding[i] = 1+100000*( (gOscBanks[gCurrentOscBank]->filterFreqs[i]-500*freqScaler)/(gOscBanks[gCurrentOscBank]->filterMaxF-500)*freqScaler );
			else
				gOscBanks[gCurrentOscBank]->filterPadding[i] = 1;
		}
#endif

#ifdef XENOMAI_SKIN_native
		RTIME ticks		= rt_timer_read();
		SRTIME ns		= rt_timer_tsc2ns(ticks);
		SRTIME delta 	= ns-prevChangeNs;
#endif
		long long int deltaMinThreshold = 100000000;
#ifdef XENOMAI_SKIN_posix
		long long int ns = 0;
		long long int delta;
		struct timespec tp;
		int ret = __wrap_clock_gettime(CLOCK_REALTIME, &tp);
		if(ret){
			// if something goes wrong reading the clock, let's not
			// make that stop us
			delta = deltaMinThreshold + 1;
		} else {
			//rt_printf("tp.tv_sec: %d, tp.tv_nsec: %d\n", tp.tv_sec, tp.tv_nsec);
			ns = tp.tv_sec * 1000000000ULL + tp.tv_nsec;
			delta = ns - prevChangeNs;
		}
#endif

		// switch to next bank cannot be too frequent, to avoid segfault! [for example segfault happens when removing both VDD and GND from breadboard]
		if(gNextOscBank != gCurrentOscBank && delta > deltaMinThreshold) {

			/*printf("ticks %llu\n", (unsigned long long)ticks);
			printf("ns %llu\n", (unsigned long long)ns);
			printf("prevChangeNs %llu\n", (unsigned long long)prevChangeNs);
			printf("-------------------------->%llud\n", (unsigned long long)(ns-prevChangeNs));*/

			prevChangeNs = ns;
			dbox_printf("Changing to bank %d...\n", gNextOscBank);
			if(gOscBanks[gCurrentOscBank]->state==bank_playing){
				gOscBanks[gCurrentOscBank]->stop();
			}

			gCurrentOscBank = gNextOscBank;
			gOscBanks[gCurrentOscBank]->hopNumTh = 0;
		}
		else {
			/* Advance to the next oscillator frame */
			gOscBanks[gCurrentOscBank]->nextHop();
		}
	}
}

// Lower-priority render function which performs matrix calculations
// State should be transferred in via global variables
void render_low_prio(void*)
{
	if(gDynamicWavetableNeedsRender) {
		// Find amplitude of wavetable
		float meanAmplitude = 0;
		float sineMix;

		for(int i = 0; i < gFeedbackOscillatorTableLength; i++) {
			//meanAmplitude += fabsf(gFeedbackOscillatorTable[i]);
			meanAmplitude += fabs(gFeedbackOscillatorTable[i]);
		}
		meanAmplitude /= (float)gFeedbackOscillatorTableLength;

		if(meanAmplitude > 0.35)
			sineMix = 0;
		else
			sineMix = (.35 - meanAmplitude) / .35;

		//dbox_printf("amp %f mix %f\n", meanAmplitude, sineMix);

		// Copy to main wavetable
		wavetable_interpolate(gFeedbackOscillatorTableLength, gDynamicWavetableLength,
				gFeedbackOscillatorTable, gDynamicWavetable,
				gOscBanks[gCurrentOscBank]->lookupTable, sineMix);
	}

	if(gLoopPointMin >= 60000.0/65536.0 && gLoopPointMax >= 60000.0/65536.0) {
		// KLUDGE!
		if(gCurrentOscBank == 0)
			gOscBanks[gCurrentOscBank]->setLoopHops(50, ((float)gOscBanks[gCurrentOscBank]->getLastHop() * 0.6) - 1);
		else
			gOscBanks[gCurrentOscBank]->setLoopHops(5, ((float)gOscBanks[gCurrentOscBank]->getLastHop() * 0.7) - 1);
	}
	else {
		float normLoopPointMin = (float)gLoopPointMin * gOscBanks[gCurrentOscBank]->getLastHop();
		float normLoopPointMax = (float)gLoopPointMax * gOscBanks[gCurrentOscBank]->getLastHop();

		int intLoopPointMin = normLoopPointMin;
		if(intLoopPointMin < 1)
			intLoopPointMin = 1;
		int intLoopPointMax = normLoopPointMax;
		if(intLoopPointMax <= intLoopPointMin)
			intLoopPointMax = intLoopPointMin + 1;
		if(intLoopPointMax > gOscBanks[gCurrentOscBank]->getLastHop() - 1)
			intLoopPointMax =  gOscBanks[gCurrentOscBank]->getLastHop() - 1;

		//dbox_printf("Loop points %d-%d / %d-%d\n", gLoopPointMin, gLoopPointMax, intLoopPointMin, intLoopPointMax);

		/* WORKS, jsut need to fix the glitch when jumps!
		 * *int currentHop = gOscBanks[gCurrentOscBank]->getCurrentHop();
		if(currentHop < intLoopPointMin -1 )
			gOscBanks[gCurrentOscBank]->setJumpHop(intLoopPointMin + 1);
		else if(currentHop > intLoopPointMax + 1)
			gOscBanks[gCurrentOscBank]->setJumpHop(intLoopPointMax - 1);*/
		gOscBanks[gCurrentOscBank]->setLoopHops(intLoopPointMin, intLoopPointMax);
	}

	if(gIsLoading)
		gStatusLED.blink(25, 75);	// Blink quickly until load finished
	else
		gStatusLED.blink(250 / gOscBanks[gCurrentOscBank]->getSpeed(), 250 / gOscBanks[gCurrentOscBank]->getSpeed());

//	static int counter = 32;
//	if(--counter == 0) {
//		for(int i = 0; i < gLoopPointsInputBufferSize; i++) {
//			dbox_printf("%d ", gLoopPointsInputBuffer[i]);
//			if(i % 32 == 31)
//				dbox_printf("\n");
//		}
//		dbox_printf("\n\n");
//		counter = 32;
//	}

	//dbox_printf("min %d max %d\n", gLoopPointMin, gLoopPointMax);
}

// Clean up at the end of render
void cleanup(BelaContext *context, void *userData)
{
	free(gOscillatorBuffer1);
	free(gOscillatorBuffer2);
	free(gDynamicWavetable);
}

// Interpolate one wavetable into another. The output size
// does not include the guard point at the end which will be identical
// to the first point
void wavetable_interpolate(int numSamplesIn, int numSamplesOut,
                           float *tableIn, float *tableOut,
                           float *sineTable, float sineMix)
{
	float fractionalScaler = (float)numSamplesIn / (float)numSamplesOut;

	for(int k = 0; k < numSamplesOut; k++) {
		float fractionalIndex = (float) k * fractionalScaler;
		//int sB = (int)floorf(fractionalIndex);
		int sB = (int)floor(fractionalIndex);
		int sA = sB + 1;
		if(sA >= numSamplesIn)
			sA = 0;
		float fraction = fractionalIndex - sB;
		tableOut[k] = fraction * tableIn[sA] + (1.0f - fraction) * tableIn[sB];
		tableOut[k] = sineMix * sineTable[k] + (1.0 - sineMix) * tableOut[k];
	}

	tableOut[numSamplesOut] = tableOut[0];
}

// Create a hysteresis oscillator with a matrix input and output
inline float hysteresis_oscillator(float input, float risingThreshold, float fallingThreshold, bool *rising)
{
	float value;

	if(*rising) {
		if(input > risingThreshold) {
			*rising = false;
			value = 0;
		}
		else
			value = 1.0;
	}
	else {
		if(input < fallingThreshold) {
			*rising = true;
			value = 1.0;
		}
		else
			value = 0;
	}

	return value;
}

#ifdef DBOX_CAPE_TEST
// Test the functionality of the D-Box cape by checking each input and output
// Loopback cable from ADC to DAC needed
void render_capetest(int numMatrixFrames, int numAudioFrames, float *audioIn, float *audioOut,
			uint16_t *matrixIn, uint16_t *matrixOut)
{
	static float phase = 0.0;
	static int sampleCounter = 0;
	static int invertChannel = 0;

	// Play a sine wave on the audio output
	for(int n = 0; n < numAudioFrames; n++) {
		audioOut[2*n] = audioOut[2*n + 1] = 0.5*sinf(phase);
		phase += 2.0 * M_PI * 440.0 / 44100.0;
		if(phase >= 2.0 * M_PI)
			phase -= 2.0 * M_PI;
	}

	for(int n = 0; n < numMatrixFrames; n++) {
		// Change outputs every 512 samples
		if(sampleCounter < 512) {
			for(int k = 0; k < 8; k++) {
				if(k == invertChannel)
					matrixOut[n*8 + k] = 50000;
				else
					matrixOut[n*8 + k] = 0;
			}
		}
		else {
			for(int k = 0; k < 8; k++) {
				if(k == invertChannel)
					matrixOut[n*8 + k] = 0;
				else
					matrixOut[n*8 + k] = 50000;
			}
		}

		// Read after 256 samples: input should be low
		if(sampleCounter == 256) {
			for(int k = 0; k < 8; k++) {
				if(k == invertChannel) {
					if(matrixIn[n*8 + k] < 50000) {
						dbox_printf("FAIL channel %d -- output HIGH input %d (inverted)\n", k, matrixIn[n*8 + k]);
					}
				}
				else {
					if(matrixIn[n*8 + k] > 2048) {
						dbox_printf("FAIL channel %d -- output LOW input %d\n", k, matrixIn[n*8 + k]);
					}
				}
			}
		}
		else if(sampleCounter == 768) {
			for(int k = 0; k < 8; k++) {
				if(k == invertChannel) {
					if(matrixIn[n*8 + k] > 2048) {
						dbox_printf("FAIL channel %d -- output LOW input %d (inverted)\n", k, matrixIn[n*8 + k]);
					}
				}
				else {
					if(matrixIn[n*8 + k] < 50000) {
						dbox_printf("FAIL channel %d -- output HIGH input %d\n", k, matrixIn[n*8 + k]);
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
	}
}
#endif


