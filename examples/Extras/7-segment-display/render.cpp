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

#define NUM_PINS 12

// Breadboard wiring layout:
// 11 10 12 9  8  7
// [ LED DISP ]
// 1  2  3  6  4  5

// Organised by display segments:
// e d . X c g b X X X f a

const int kPins[NUM_PINS] = {0, 1, 2, 3, 4, 5, 8, 9, 12, 13, 14, 15};

// Indices into the above array
const int kDigits[4] = {9, 8, 7, 3};

int gCurrentlyDisplayingDigit = 0;
int gDigitDisplayTime = 0;
const int kDigitMaxDisplayTime = 44;

int gState = 0;
int gStateCounter = 0;
const int kMaxState = 25;

// . g f e d c b a
//const unsigned char kBELA[4] = {0x7C, 0x79, 0x38, 0x77};
const unsigned char kBELA[4] = {0x7C, 0x7B, 0x38, 0x5F};

int gCharacterToDisplay[4] = {0, 0, 0, 0};
	
bool setup(BelaContext *context, void *userData)
{	
	// This project makes the assumption that the audio and digital
	// sample rates are the same. But check it to be sure!
	if(context->audioFrames != context->digitalFrames) {
		rt_printf("Error: this project needs the audio and digital sample rates to be the same.\n");
		return false;
	}
	
	for(int i = 0; i < NUM_PINS; i++) {
		pinMode(context, 0, kPins[i], OUTPUT);
	}

	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		// Check for rotation between digits
		if(--gDigitDisplayTime <= 0) {
			gCurrentlyDisplayingDigit = (gCurrentlyDisplayingDigit + 1) % 4;
			gDigitDisplayTime = kDigitMaxDisplayTime;
		}
	
		// Write the currently displaying digit low and the rest high
		for(int i = 0; i < 4; i++)
				digitalWriteOnce(context, n, kPins[kDigits[i]], HIGH);
		digitalWriteOnce(context, n, kPins[kDigits[gCurrentlyDisplayingDigit]], LOW);
		
		// Write the digit to the other outputs
		digitalWriteOnce(context, n, kPins[11],
			gCharacterToDisplay[gCurrentlyDisplayingDigit] & 0x01);	// a
		digitalWriteOnce(context, n, kPins[6], 
			gCharacterToDisplay[gCurrentlyDisplayingDigit] & 0x02);	// b
		digitalWriteOnce(context, n, kPins[4], 
			gCharacterToDisplay[gCurrentlyDisplayingDigit] & 0x04);	// c
		digitalWriteOnce(context, n, kPins[1],
			gCharacterToDisplay[gCurrentlyDisplayingDigit] & 0x08);	// d
		digitalWriteOnce(context, n, kPins[0],
			gCharacterToDisplay[gCurrentlyDisplayingDigit] & 0x10);	// e
		digitalWriteOnce(context, n, kPins[10],
			gCharacterToDisplay[gCurrentlyDisplayingDigit] & 0x20);	// f
		digitalWriteOnce(context, n, kPins[5],
			gCharacterToDisplay[gCurrentlyDisplayingDigit] & 0x40);	// g
		digitalWriteOnce(context, n, kPins[2],
			gCharacterToDisplay[gCurrentlyDisplayingDigit] & 0x80);	// .
			
		// Check for changing state
		if(--gStateCounter <= 0) {
			gState = (gState + 1) % kMaxState;
			if(gState != (kMaxState - 1)) {
				for(int i = 0; i < 4; i++)
					gCharacterToDisplay[i] = 1 << (gState % 6);
				gStateCounter = 2000;
			}
			else {
				for(int i = 0; i < 4; i++)
					gCharacterToDisplay[i] = kBELA[i];
				gStateCounter = 50000;
			}
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{
	
}
