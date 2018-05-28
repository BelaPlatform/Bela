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

const int kStepLengthSlow = 1000;
const int kStepLengthFast = 500;

int gStepLengthSamples = kStepLengthSlow;

// Check the pin diagram in the IDE to check where the pins are on your board
const int gPinA1 = 12;
const int gPinA2 = 13;
const int gPinB1 = 14;
const int gPinB2 = 15;
const int gPinServo = 10;

int gStepCounter = 0;
int gPhase = 0;

int gServoCounter = 0;


enum {
	kStateMoveRight1 = 0,
	kStateMoveLeft1,
	kStateMoveRight2,
	kStateMoveLeft2,
	kStateMoveRight3,
	kStateMoveLeft3,
	kStateSpin,
	kStateMax
};

int gState = 0;
int gStateCounter = 0;

bool setup(BelaContext *context, void *userData)
{	
	// This project makes the assumption that the audio and digital
	// sample rates are the same. But check it to be sure!
	if(context->audioFrames != context->digitalFrames) {
		rt_printf("Error: this project needs the audio and digital sample rates to be the same.\n");
		return false;
	}
	
	pinMode(context, 0, gPinA1, OUTPUT);
	pinMode(context, 0, gPinA2, OUTPUT);
	pinMode(context, 0, gPinB1, OUTPUT);
	pinMode(context, 0, gPinB2, OUTPUT);
	pinMode(context, 0, gPinServo, OUTPUT);
		
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		if(gPhase == 0 || gPhase == 1) {
			digitalWriteOnce(context, n, gPinB1, HIGH);
			digitalWriteOnce(context, n, gPinB2, LOW);
		}
		else {
			digitalWriteOnce(context, n, gPinB1, LOW);
			digitalWriteOnce(context, n, gPinB2, HIGH);			
		}
		
		if(gPhase == 1 || gPhase == 2) {
			digitalWriteOnce(context, n, gPinA1, HIGH);
			digitalWriteOnce(context, n, gPinA2, LOW);
		}
		else {
			digitalWriteOnce(context, n, gPinA1, LOW);
			digitalWriteOnce(context, n, gPinA2, HIGH);			
		}
		
		if(--gServoCounter > 0) 
			digitalWriteOnce(context, n, gPinServo, HIGH);
		else
			digitalWriteOnce(context, n, gPinServo, LOW);
		
		if(++gStepCounter >= gStepLengthSamples) {
			gStateCounter++;
			
			switch(gState) {
				case kStateMoveRight1:
				case kStateMoveRight2:
				case kStateMoveRight3:
					gPhase = (gPhase + 1) & 3;
					break;
				case kStateMoveLeft1:
				case kStateMoveLeft2:
				case kStateMoveLeft3:				
					gPhase = (gPhase + 3) & 3;	
					break;
				case kStateSpin:
					gPhase = (gPhase + 1) & 3;
					break;		
			}
			
			if(gState == kStateSpin) {
				if(gStateCounter >= 48) {
					gStateCounter = 0;
					gState = 0;
					gStepLengthSamples = kStepLengthSlow;
				}				
			}
			else {
				if(gStateCounter >= 16) {
					gStateCounter = 0;
					gState++;
					if(gState & 1)
						gServoCounter = 120;
					else
						gServoCounter = 80;
					if(gState == kStateSpin)
						gStepLengthSamples = kStepLengthFast;
				}
			}
			
			gStepCounter = 0;
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{
	
}
