/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Communication/Serial/render.cpp

Serial communication
------------

This example demonstrates how to receive and transmit serial data from Bela.
When a 'k' or 's' are received on the specified serial port, a kick or snare
sound, respectively, are generated.

Serial data is received in a lower-priority thread (an AuxiliaryTask). From
there, relevant data is passed to the audio thread via a Pipe.  The
AuxiliaryTask is also writing to the serial port.

The sound generator is very simple and "retro". IT is using a decaying noise
burst for the snare sound and a decaying sine sweep for the kick
*/

#include <Bela.h>
#include <libraries/Pipe/Pipe.h>
#include <libraries/Serial/Serial.h>
#include <cmath>

Serial gSerial;
Pipe gPipe;
unsigned int gSnareDuration;
int gSnareTime = 0;
unsigned int gKickDuration;
int gKickTime = 0;
float gKickPhase = 0;

void serialIo(void* arg) {
	while(!Bela_stopRequested())
	{
		unsigned int maxLen = 128;
		char serialBuffer[maxLen];
		// read from the serial port with a timeout of 100ms
		int ret = gSerial.read(serialBuffer, maxLen, 100);
		if (ret > 0) {
			printf("Received: %.*s\n", ret, serialBuffer);
			for(int n = 0; n < ret; ++n)
			{
				// when some relevant data is received
				// send a notification to the audio thread via
				// the pipe
				// and send a reply on the serial port
				if('k' == serialBuffer[n])
				{
					gPipe.writeNonRt('k');
					gSerial.write("kick!\n\r");
				} else if('s' == serialBuffer[n])
				{
					gPipe.writeNonRt('s');
					gSerial.write("snare!\n\r");
				}
			}
		}
	}
}

bool setup(BelaContext *context, void *userData) {
	gSerial.setup ("/dev/ttyUSB0", 19200);
	AuxiliaryTask serialCommsTask = Bela_createAuxiliaryTask(serialIo, 0, "serial-thread", NULL);
	Bela_scheduleAuxiliaryTask(serialCommsTask);

	gPipe.setup("serialpipe", 1024);
	gKickDuration = 0.2 * context->audioSampleRate;
	gSnareDuration = 0.2 * context->audioSampleRate;

	return true;
}

void render(BelaContext *context, void *userData) {
	char c;
	// check if the serial thread has received any message and sent a notification
	while(gPipe.readRt(c) > 0)
	{
		// if there is, trigger the start of the respective sound
		if('s' == c)
			gSnareTime = gSnareDuration;
		if('k' == c)
			gKickTime = gKickDuration;
	}
	for(unsigned int n = 0; n < context->audioFrames; ++n)
	{
		// synthesize the snare and kick
		float snareOut = 0;
		float kickOut = 0;
		if(gSnareTime)
		{
			// just a burst of white noise with a decaying envelope
			float noise = 2.f * (rand() / (float)RAND_MAX) - 1.f;
			float env = gSnareTime / (float)gSnareDuration;
			snareOut = 0.4f * noise * env;
			--gSnareTime;
		}
		if(gKickTime)
		{
			// a descending sinewave
			float frequency = map(gKickTime, gKickDuration, 0, 150, 20);
			float env = gKickTime / (float)gKickDuration;
			gKickPhase += 2.f * (float)M_PI * frequency / context->audioSampleRate;
			if(gKickPhase > M_PI)
				gKickPhase -= 2.f * (float)M_PI;
			kickOut = env * sinf(gKickPhase);
			--gKickTime;
		}
		float out = snareOut + kickOut;
		for(unsigned int ch = 0; ch < context->audioOutChannels; ++ch)
		{
			audioWrite(context, n, ch, out);
		}
	}
}

void cleanup(BelaContext *context, void *userData) {}
