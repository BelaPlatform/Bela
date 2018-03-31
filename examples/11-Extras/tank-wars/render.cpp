/*
 * render.cpp
 *
 *  Created on: Oct 24, 2014
 *      Author: parallels
 */


#include <Bela.h>
#include "game.h"
#include <cmath>
#include <cstdlib>
#include <time.h>

int gAudioFramesPerAnalogFrame = 2; // Ratio in audio to analog sample rate

int gInputTank1Angle = 0;		// Inputs for the cannon angles
int gInputTank2Angle = 1;
int gInputLauncher = 2;			// Input for launcher FSR

int gOutputX = 0;				// Outputs for the scope
int gOutputY = 1;
int gOutputPlayer1LED = 2;
int gOutputPlayer2LED = 3;

int gGameFramesPerSecond = 60;	// How often the physics are updated
int gGameFrameInterval;			// ...and in frames
int gSamplesUntilNextFrame;		// Counter until next update
int gSamplesSinceFinish = 0;	// How long since somebody won?
bool gGameShouldRestart = false;// Whether we need to reinitiliase the game

// Counter for overall number of samples that have elapsed
unsigned int gSampleCounter = 0;

// 1st-order filter and peak detector for launcher input
float gLauncherLastSample = 0;
float gLauncherFilterPole = 0.8;
float gLauncherPeakValue = 0;
float gLauncherPeakFilterPole = 0.999;
float gLauncherNoiseThreshold = 0.01;
float gLauncherMinimumPeak = 0.1;
bool gLauncherTriggered = false;

// Screen update rate; affects buffer size. Actual contents of buffer
// may be smaller than this
int gScreenWidth = 512;
int gScreenHeight = 512;
int gScreenFramesPerSecond = 25;

// Double buffer for rendering screen. Each is an interleaved buffer
// of XY data.
float *gScreenBuffer1, *gScreenBuffer2;
float *gScreenBufferWrite, *gScreenBufferRead;
int gScreenBufferMaxLength;				// What is the total buffer allocated?
int gScreenBufferReadLength;			// How long is the read buffer?
int gScreenBufferWriteLength;			// How long is the write (next) buffer?
int gScreenBufferReadPointer;			// Where are we in the read buffer now?
int gScreenBufferNextUpdateLocation;	// When should we render the next buffer?
bool gScreenNextBufferReady;			// Is the next buffer ready to go?

// Auxiliary (low-priority) task for updating the screen
AuxiliaryTask gScreenUpdateTask;

// Buffers for music and sound effects
extern float *gMusicBuffer;
extern int gMusicBufferLength;
extern float *gSoundBoomBuffer;
extern int gSoundBoomBufferLength;
extern float *gSoundHitBuffer;
extern int gSoundHitBufferLength;

// Current state for sound and music
int gMusicBufferPointer = 0;	  // 0 means start of buffer...
int gSoundBoomBufferPointer = -1; // -1 means don't play...
int gSoundHitBufferPointer = -1;
float gSoundProjectileOscillatorPhase = 0;
float gSoundProjectileOscillatorGain = 0.2;
float gOscillatorPhaseScaler = 0;

void screen_update(void*);

bool setup(BelaContext *context, void *userData)
{
	srandom(time(NULL));

	// Verify we are running with analog channels enabled
	if(context->analogFrames == 0 || context->analogOutChannels < 4) {
		fprintf(stderr, "Error: this example needs least 4 analog output channels\n");
		return false;
	}

	// Initialise audio variables
	gAudioFramesPerAnalogFrame = context->audioFrames / context->analogFrames;
	gOscillatorPhaseScaler = 2.0 * M_PI / context->audioSampleRate;

	// Initialise the screen buffers
	gScreenBufferMaxLength = 2 * context->analogSampleRate / gScreenFramesPerSecond;
	gScreenBuffer1 = new float[gScreenBufferMaxLength];
	gScreenBuffer2 = new float[gScreenBufferMaxLength];
	if(gScreenBuffer1 == 0 || gScreenBuffer2 == 0) {
		fprintf(stderr, "Error initialising screen buffers\n");
		return false;
	}

	gScreenBufferRead = gScreenBuffer1;
	gScreenBufferWrite = gScreenBuffer2;
	gScreenBufferReadLength = gScreenBufferWriteLength = 0;
	gScreenBufferReadPointer = 0;
	gScreenBufferNextUpdateLocation = 0;
	gScreenNextBufferReady = false;

	// Initialise the game
	setupGame(gScreenWidth, gScreenHeight);
	gGameFrameInterval = context->analogSampleRate / gGameFramesPerSecond;
	gSamplesUntilNextFrame = gGameFrameInterval;

	// Initialise auxiliary tasks
	if((gScreenUpdateTask = Bela_createAuxiliaryTask(&screen_update, 90,
														 "bela-screen-update")) == 0)
		return false;

	return true;
}

// Swap buffers on the screen
void swap_buffers()
{
	if(gScreenBufferRead == gScreenBuffer1) {
		gScreenBufferRead = gScreenBuffer2;
		gScreenBufferWrite = gScreenBuffer1;
	}
	else {
		gScreenBufferRead = gScreenBuffer1;
		gScreenBufferWrite = gScreenBuffer2;
	}

	gScreenBufferReadLength = gScreenBufferWriteLength;
	gScreenBufferReadPointer = 0;

	// Schedule next update for 3/4 of the way through the buffer
	gScreenBufferNextUpdateLocation = gScreenBufferReadLength * 0.75;
	gScreenNextBufferReady = false;
}

void render(BelaContext *context, void *userData)
{
	int audioIndex = 0;

	for(unsigned int n = 0; n < context->analogFrames; n++) {
		for(int k = 0; k < gAudioFramesPerAnalogFrame; k++) {
			// Render music and sound
			float audioSample = 0;

			// Music plays in a loop
			if(gMusicBuffer != 0 && gMusicBufferPointer >= 0) {
				audioSample += gMusicBuffer[gMusicBufferPointer++];
				if(gMusicBufferPointer >= gMusicBufferLength)
					gMusicBufferPointer = 0;
			}

			// Sound effect plays until finished, then stops
			if(gSoundBoomBuffer != 0 && gSoundBoomBufferPointer >= 0) {
				audioSample += gSoundBoomBuffer[gSoundBoomBufferPointer++];
				if(gSoundBoomBufferPointer >= gSoundBoomBufferLength)
					gSoundBoomBufferPointer = -1;
			}

			if(gSoundHitBuffer != 0 && gSoundHitBufferPointer >= 0) {
				audioSample += gSoundHitBuffer[gSoundHitBufferPointer++];
				if(gSoundHitBufferPointer >= gSoundHitBufferLength)
					gSoundHitBufferPointer = -1;
			}

			// Oscillator plays to indicate projectile height
			if(gameStatusProjectileInMotion()) {
				audioSample += gSoundProjectileOscillatorGain * sinf(gSoundProjectileOscillatorPhase);

				gSoundProjectileOscillatorPhase += gOscillatorPhaseScaler * constrain(map(gameStatusProjectileHeight(),
						1.0, 0, 300, 2000), 200, 6000);
				if(gSoundProjectileOscillatorPhase > M_PI)
					gSoundProjectileOscillatorPhase -= 2.f * M_PI;
			}

			context->audioOut[2*audioIndex] = context->audioOut[2*audioIndex + 1] = audioSample;
			audioIndex++;
		}

		// First-order lowpass filter to remove noise on launch FSR
		float rawSample = analogRead(context, n, gInputLauncher);
		float launchSample = gLauncherFilterPole * gLauncherLastSample +
							(1.0f - gLauncherFilterPole) * rawSample;
		gLauncherLastSample = launchSample;

		// Peak-detect on launch signal
		if(launchSample >= gLauncherPeakValue) {
			gLauncherPeakValue = launchSample;
			gLauncherTriggered = false;
		}
		else {
			if(gLauncherPeakValue - launchSample > gLauncherNoiseThreshold && !gLauncherTriggered) {
				// Detected a peak; is it big enough overall?
				if(gLauncherPeakValue >= gLauncherMinimumPeak) {
					gLauncherTriggered = true;
					// Peak detected-- fire!!
					// Set both cannon strengths but only one will
					// fire depending on whose turn it is
					float strength = map(gLauncherPeakValue,
									     gLauncherMinimumPeak, 1.0,
										 0.5, 10.0);
					setTank1CannonStrength(strength);
					setTank2CannonStrength(strength);
					fireProjectile();
				}
			}

			gLauncherPeakValue *= gLauncherPeakFilterPole;
		}

		if(--gSamplesUntilNextFrame <= 0) {
			// Update game physics and cannon angles
			gSamplesUntilNextFrame = gGameFrameInterval;

			setTank1CannonAngle(map(analogRead(context, n, gInputTank1Angle),
									0, 1.0, M_PI, 0));
			setTank2CannonAngle(map(analogRead(context, n, gInputTank2Angle),
									0, 1.0, M_PI, 0));
			nextGameFrame();

			// Check for collision and start sound accordingly
			if(gameStatusCollisionOccurred()) {
				gSoundBoomBufferPointer = 0;
			}
			
			if(gameStatusTankHitOccurred()) {
				gSoundHitBufferPointer = 0;
			}
		}

		if(gScreenBufferReadPointer >= gScreenBufferReadLength - 1
			&& gScreenNextBufferReady) {
			// Got to the end; swap buffers
			swap_buffers();
		}

		// Push current screen buffer to the analog output
		if(gScreenBufferReadPointer < gScreenBufferReadLength - 1) {
			float x = gScreenBufferRead[gScreenBufferReadPointer++];
			float y = gScreenBufferRead[gScreenBufferReadPointer++];

			// Rescale screen coordinates to analog ranges; invert the Y
			// coordinate to go from normal screen coordinates to scope coordinates
			analogWriteOnce(context, n, gOutputX, constrain(map(x, 0, gScreenWidth, 0, 1.0), 0, 1.0));
			analogWriteOnce(context, n, gOutputY, constrain(map(y, 0, gScreenHeight, 1.0, 0), 0, 1.0));
		}
		else {
			// Still not ready! Write 0 until something happens
			analogWriteOnce(context, n, gOutputX, 0);
			analogWriteOnce(context, n, gOutputY, 0);
		}

		if(gameStatusWinner() != 0) {
			// Blink one LED to show who won
			// Blink both LEDs when projectile is in motion
			float val = (gSampleCounter % 4000 > 2000) ? 1.0 : 0;
			analogWriteOnce(context, n, gOutputPlayer1LED, gameStatusWinner() == 1 ? val : 0);
			analogWriteOnce(context, n, gOutputPlayer2LED, gameStatusWinner() == 2 ? val : 0);

			// After 5 seconds, restart the game
			gSamplesSinceFinish++;
			if(gSamplesSinceFinish > context->analogSampleRate * 5)
				gGameShouldRestart = true;
		}
		else if(gameStatusProjectileInMotion()) {
			// Blink both LEDs when projectile is in motion
			float val = (gSampleCounter % 2000 > 1000) ? 1.0 : 0;
			analogWriteOnce(context, n, gOutputPlayer1LED, val);
			analogWriteOnce(context, n, gOutputPlayer2LED, val);
		}
		else if(gameStatusPlayer1Turn()) {
			analogWriteOnce(context, n, gOutputPlayer1LED, 1.0);
			analogWriteOnce(context, n, gOutputPlayer2LED, 0);
		}
		else {
			analogWriteOnce(context, n, gOutputPlayer2LED, 1.0);
			analogWriteOnce(context, n, gOutputPlayer1LED, 0);
		}

		// Check if we have reached the point where we should next update
		if(gScreenBufferReadPointer >= gScreenBufferNextUpdateLocation &&
		   !gScreenNextBufferReady) {
			// Update the screen at lower priority than the audio thread
			Bela_scheduleAuxiliaryTask(gScreenUpdateTask);
		}

		gSampleCounter++;
	}
}

void screen_update(void*)
{
	// If we should restart, reinitialise the game
	if(gGameShouldRestart) {
		restartGame();
		gGameShouldRestart = false;
		gSamplesSinceFinish = 0;
	}

	// Render the game based on the current state
	gScreenBufferWriteLength = drawGame(gScreenBufferWrite, gScreenBufferMaxLength);

	// Flag it as ready to go
	gScreenNextBufferReady = true;
}

void cleanup(BelaContext *context, void *userData)
{
	// Clean up the game state
	cleanupGame();
}
