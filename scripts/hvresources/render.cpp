/*
 * render.cpp
 *
 *  Template render.cpp file for on-board heavy compiling
 *
 *  N.B. this is currently *not* compatible with foleyDesigner source files!
 *
 *  Created on: November 5, 2015
 *
 *  Christian Heinrichs
 *
 */

#include <Bela.h>
#include <Midi.h>
#include <Scope.h>
#include <cmath>
#include <Heavy_bela.h>
#include <string.h>
#include <stdlib.h>
#include <string.h>
#include <DigitalChannelManager.h>

/*
 *	HEAVY CONTEXT & BUFFERS
 */

Hv_bela *gHeavyContext;
float *gHvInputBuffers = NULL, *gHvOutputBuffers = NULL;
unsigned int gHvInputChannels = 0, gHvOutputChannels = 0;

float gInverseSampleRate;

/*
 *	HEAVY FUNCTIONS
 */

// TODO: rename this
#define LIBPD_DIGITAL_OFFSET 11 // digitals are preceded by 2 audio and 8 analogs (even if using a different number of analogs)

void printHook(double timestampSecs, const char *printLabel, const char *msgString, void *userData) {
  rt_printf("Message from Heavy patch: [@ %.3f] %s: %s\n", timestampSecs, printLabel, msgString);
}


// digitals
static DigitalChannelManager dcm;

void sendDigitalMessage(bool state, unsigned int delay, void* receiverName){
	hv_sendFloatToReceiver(gHeavyContext, hv_stringToHash((char*)receiverName), (float)state);
//	rt_printf("%s: %d\n", (char*)receiverName, state);
}

// TODO: turn them into hv hashes and adjust sendDigitalMessage accordingly
char hvDigitalInHashes[16][21]={
	{"bela_digitalIn11"},{"bela_digitalIn12"},{"bela_digitalIn13"},{"bela_digitalIn14"},{"bela_digitalIn15"},
	{"bela_digitalIn16"},{"bela_digitalIn17"},{"bela_digitalIn18"},{"bela_digitalIn19"},{"bela_digitalIn20"},
	{"bela_digitalIn21"},{"bela_digitalIn22"},{"bela_digitalIn23"},{"bela_digitalIn24"},{"bela_digitalIn25"},
	{"bela_digitalIn26"}
};

static void sendHook(
	double timestamp, // in milliseconds
	const char *receiverName,
	const HvMessage *const m,
	void *userData) {

	// Bela digital
	
	// Bela digital run-time messages

	// TODO: this first block is almost an exact copy of libpd's code, should we add this to the class?
	// let's make this as optimized as possible for built-in digital Out parsing
	// the built-in digital receivers are of the form "bela_digitalOutXX" where XX is between 11 and 26
	static int prefixLength = 15; // strlen("bela_digitalOut")
	if(strncmp(receiverName, "bela_digitalOut", prefixLength)==0){
		if(receiverName[prefixLength] != 0){ //the two ifs are used instead of if(strlen(source) >= prefixLength+2)
			if(receiverName[prefixLength + 1] != 0){
				// quickly convert the suffix to integer, assuming they are numbers, avoiding to call atoi
				int receiver = ((receiverName[prefixLength] - 48) * 10);
				receiver += (receiverName[prefixLength+1] - 48);
				unsigned int channel = receiver - LIBPD_DIGITAL_OFFSET; // go back to the actual Bela digital channel number
				bool value = hv_msg_getFloat(m, 0);
				if(channel < 16){ //16 is the hardcoded value for the number of digital channels
					dcm.setValue(channel, value);
				}
			}
		}
	}

	// Bela digital initialization messages
	if(strcmp(receiverName, "bela_setDigital") == 0){
		// Third argument (optional) can be ~ or sig for signal-rate, message-rate otherwise.
		// [in 14 ~(
		// |
		// [s bela_setDigital]
		// is signal("sig" or "~") or message("message", default) rate
		bool isMessageRate = true; // defaults to message rate
		bool direction = 0; // initialize it just to avoid the compiler's warning
		bool disable = false;
		int numArgs = hv_msg_getNumElements(m);
		if(numArgs < 2 || numArgs > 3 || !hv_msg_isSymbol(m, 0) || !hv_msg_isFloat(m, 1))
			return;
		if(numArgs == 3 && !hv_msg_isSymbol(m,2))
			return;
		char * symbol = hv_msg_getSymbol(m, 0);

		if(strcmp(symbol, "in") == 0){
			direction = INPUT;
		} else if(strcmp(symbol, "out") == 0){
			direction = OUTPUT;
		} else if(strcmp(symbol, "disable") == 0){
			disable = true;
		} else {
			return;
		}
		int channel = hv_msg_getFloat(m, 1) - LIBPD_DIGITAL_OFFSET;
		if(disable == true){
			dcm.unmanage(channel);
			return;
		}
		if(numArgs >= 3){
			char* s = hv_msg_getSymbol(m, 2);
			if(strcmp(s, "~") == 0  || strncmp(s, "sig", 3) == 0){
				isMessageRate = false;
			}
		}
		dcm.manage(channel, direction, isMessageRate);
	}
}


/*
 * SETUP, RENDER LOOP & CLEANUP
 */

// leaving this here, trying to come up with a coherent interface with libpd.
// commenting them out so the compiler does not warn
// 2 audio + (up to)8 analog + (up to) 16 digital + 4 scope outputs
//static const unsigned int gChannelsInUse = 30;
//static unsigned int gAnalogChannelsInUse = 8; // hard-coded for the moment, TODO: get it at run-time from hv_context
//static const unsigned int gFirstAudioChannel = 0;
//static const unsigned int gFirstAnalogChannel = 2;
static const unsigned int gFirstDigitalChannel = 10;
static const unsigned int gFirstScopeChannel = 26;
static unsigned int gDigitalSigInChannelsInUse;
static unsigned int gDigitalSigOutChannelsInUse;

// Bela Midi
Midi midi;
unsigned int hvMidiHashes[7];
// Bela Scope
Scope scope;
unsigned int gScopeChannelsInUse;
float* gScopeOut;


bool setup(BelaContext *context, void *userData)	{
	if(context->audioInChannels != context->audioOutChannels ||
			context->analogInChannels != context->analogOutChannels){
		// It should actually work, but let's test it before releasing it!
		printf("Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
		return false;
	}
	/* HEAVY */
	hvMidiHashes[kmmNoteOn] = hv_stringToHash("__hv_notein");
//	hvMidiHashes[kmmNoteOff] = hv_stringToHash("noteoff"); // this is handled differently, see the render function
	hvMidiHashes[kmmControlChange] = hv_stringToHash("__hv_ctlin");
	// Note that the ones below are not defined by Heavy, but they are here for (wishing) forward-compatibility
	// You need to receive from the corresponding symbol in Pd and unpack the message, e.g.:
	//[r __hv_pgmin]
	//|
	//[unpack f f]
	//|   |
	//|   [print pgmin_channel]
	//[print pgmin_number]
	hvMidiHashes[kmmProgramChange] = hv_stringToHash("__hv_pgmin");
	hvMidiHashes[kmmPolyphonicKeyPressure] = hv_stringToHash("__hv_polytouchin");
	hvMidiHashes[kmmChannelPressure] = hv_stringToHash("__hv_touchin");
	hvMidiHashes[kmmPitchBend] = hv_stringToHash("__hv_bendin");

	gHeavyContext = hv_bela_new(context->audioSampleRate);

	gHvInputChannels = hv_getNumInputChannels(gHeavyContext);
	gHvOutputChannels = hv_getNumOutputChannels(gHeavyContext);

	gScopeChannelsInUse = gHvOutputChannels > gFirstScopeChannel ?
			gHvOutputChannels - gFirstScopeChannel : 0;
	gDigitalSigInChannelsInUse = gHvInputChannels > gFirstDigitalChannel ?
			gHvInputChannels - gFirstDigitalChannel : 0;
	gDigitalSigOutChannelsInUse = gHvOutputChannels > gFirstDigitalChannel ?
			gHvOutputChannels - gFirstDigitalChannel - gScopeChannelsInUse: 0;

	printf("Starting Heavy context with %d input channels and %d output channels\n",
			  gHvInputChannels, gHvOutputChannels);
	printf("Channels in use:\n");
	printf("Digital in : %u, Digital out: %u\n", gDigitalSigInChannelsInUse, gDigitalSigOutChannelsInUse);
	printf("Scope out: %u\n", gScopeChannelsInUse);

	if(gHvInputChannels != 0) {
		gHvInputBuffers = (float *)calloc(gHvInputChannels * context->audioFrames,sizeof(float));
	}
	if(gHvOutputChannels != 0) {
		gHvOutputBuffers = (float *)calloc(gHvOutputChannels * context->audioFrames,sizeof(float));
	}

	gInverseSampleRate = 1.0 / context->audioSampleRate;

	// Set heavy print hook
	hv_setPrintHook(gHeavyContext, printHook);
	// Set heavy send hook
	hv_setSendHook(gHeavyContext, sendHook);

	// TODO: change these hardcoded port values and actually change them in the Midi class
	midi.readFrom(0);
	midi.writeTo(0);
	midi.enableParser(true);

	if(gScopeChannelsInUse > 0){
		// block below copy/pasted from libpd, except
		scope.setup(gScopeChannelsInUse, context->audioSampleRate);
		gScopeOut = new float[gScopeChannelsInUse];
	}
	// Bela digital
	dcm.setCallback(sendDigitalMessage);
	if(context->digitalChannels > 0){
		for(unsigned int ch = 0; ch < context->digitalChannels; ++ch){
			dcm.setCallbackArgument(ch, hvDigitalInHashes[ch]);
		}
	}
	// unlike libpd, no need here to bind the bela_digitalOut.. receivers

	return true;
}


void render(BelaContext *context, void *userData)
{
	{
		int num;
		while((num = midi.getParser()->numAvailableMessages()) > 0){
			static MidiChannelMessage message;
			message = midi.getParser()->getNextChannelMessage();
			switch(message.getType()){
			case kmmNoteOn: {
				//message.prettyPrint();
				int noteNumber = message.getDataByte(0);
				int velocity = message.getDataByte(1);
				int channel = message.getChannel();
				// rt_printf("message: noteNumber: %f, velocity: %f, channel: %f\n", noteNumber, velocity, channel);
				hv_vscheduleMessageForReceiver(gHeavyContext, hvMidiHashes[kmmNoteOn], 0, "fff",
						(float)noteNumber, (float)velocity, (float)channel+1);
				break;
			}
			case kmmNoteOff: {
				/* PureData does not seem to handle noteoff messages as per the MIDI specs,
				 * so that the noteoff velocity is ignored. Here we convert them to noteon
				 * with a velocity of 0.
				 */
				int noteNumber = message.getDataByte(0);
				// int velocity = message.getDataByte(1); // would be ignored by Pd
				int channel = message.getChannel();
				// note we are sending the below to hvHashes[kmmNoteOn] !!
				hv_vscheduleMessageForReceiver(gHeavyContext, hvMidiHashes[kmmNoteOn], 0, "fff",
						(float)noteNumber, (float)0, (float)channel+1);
				break;
			}
			case kmmControlChange: {
				int channel = message.getChannel();
				int controller = message.getDataByte(0);
				int value = message.getDataByte(1);
				hv_vscheduleMessageForReceiver(gHeavyContext, hvMidiHashes[kmmControlChange], 0, "fff",
						(float)value, (float)controller, (float)channel+1);
				break;
			}
			case kmmProgramChange: {
				int channel = message.getChannel();
				int program = message.getDataByte(0);
				hv_vscheduleMessageForReceiver(gHeavyContext, hvMidiHashes[kmmProgramChange], 0, "ff",
						(float)program, (float)channel+1);
				break;
			}
			case kmmPolyphonicKeyPressure: {
				//TODO: untested, I do not have anything with polyTouch... who does, anyhow?
				int channel = message.getChannel();
				int pitch = message.getDataByte(0);
				int value = message.getDataByte(1);
				hv_vscheduleMessageForReceiver(gHeavyContext, hvMidiHashes[kmmPolyphonicKeyPressure], 0, "fff",
						(float)channel+1, (float)pitch, (float)value);
				break;
			}
			case kmmChannelPressure:
			{
				int channel = message.getChannel();
				int value = message.getDataByte(0);
				hv_vscheduleMessageForReceiver(gHeavyContext, hvMidiHashes[kmmChannelPressure], 0, "ff",
						(float)value, (float)channel+1);
				break;
			}
			case kmmPitchBend:
			{
				int channel = message.getChannel();
				int value = ((message.getDataByte(1) << 7) | message.getDataByte(0));
				hv_vscheduleMessageForReceiver(gHeavyContext, hvMidiHashes[kmmPitchBend], 0, "ff",
						(float)value, (float)channel+1);
				break;
			}
			case kmmNone:
			case kmmAny:
				break;
			}
		}
	}

	// De-interleave the data
	if(gHvInputBuffers != NULL) {
		for(unsigned int n = 0; n < context->audioFrames; n++) {
			for(unsigned int ch = 0; ch < gHvInputChannels; ch++) {
				if(ch >= context->audioInChannels+context->analogInChannels) {
					// THESE ARE PARAMETER INPUT 'CHANNELS' USED FOR ROUTING
					// 'sensor' outputs from routing channels of dac~ are passed through here
					break;
				} else {
					// If more than 2 ADC inputs are used in the pd patch, route the analog inputs
					// i.e. ADC3->analogIn0 etc. (first two are always audio inputs)
					if(ch >= context->audioInChannels)	{
						int m = n/2;
						float mIn = context->analogIn[m*context->analogInChannels + (ch-context->audioInChannels)];
						gHvInputBuffers[ch * context->audioFrames + n] = mIn;
					} else {
						gHvInputBuffers[ch * context->audioFrames + n] = context->audioIn[n * context->audioInChannels + ch];
					}
				}
			}
		}
	}

	// Bela digital in
	// note: in multiple places below we assume that the number of digital frames is same as number of audio
	// Bela digital in at message-rate
	dcm.processInput(context->digital, context->digitalFrames);

	// Bela digital in at signal-rate
	if(gDigitalSigInChannelsInUse > 0)
	{
		unsigned int j, k;
		float *p0, *p1;
		const unsigned int gLibpdBlockSize = context->audioFrames;
		const unsigned int  audioFrameBase = 0;
		float* gInBuf = gHvInputBuffers;
		// block below copy/pasted from libpd, except
		// 16 has been replaced with gDigitalSigInChannelsInUse
		for (j = 0, p0 = gInBuf; j < gLibpdBlockSize; j++, p0++) {
			unsigned int digitalFrame = audioFrameBase + j;
			for (k = 0, p1 = p0 + gLibpdBlockSize * gFirstDigitalChannel;
					k < gDigitalSigInChannelsInUse; ++k, p1 += gLibpdBlockSize) {
				if(dcm.isSignalRate(k) && dcm.isInput(k)){ // only process input channels that are handled at signal rate
					*p1 = digitalRead(context, digitalFrame, k);
				}
			}
		}
	}


	// replacement for bang~ object
	//hv_vscheduleMessageForReceiver(gHeavyContext, "bela_bang", 0.0f, "b");

	hv_bela_process_inline(gHeavyContext, gHvInputBuffers, gHvOutputBuffers, context->audioFrames);

	// Bela digital out
	// Bela digital out at signal-rate
	if(gDigitalSigOutChannelsInUse > 0)
	{
			unsigned int j, k;
			float *p0, *p1;
			const unsigned int gLibpdBlockSize = context->audioFrames;
			const unsigned int  audioFrameBase = 0;
			float* gOutBuf = gHvOutputBuffers;
			// block below copy/pasted from libpd, except
			// context->digitalChannels has been replaced with gDigitalSigOutChannelsInUse
			for (j = 0, p0 = gOutBuf; j < gLibpdBlockSize; ++j, ++p0) {
				unsigned int digitalFrame = (audioFrameBase + j);
				for (k = 0, p1 = p0  + gLibpdBlockSize * gFirstDigitalChannel;
						k < gDigitalSigOutChannelsInUse; k++, p1 += gLibpdBlockSize) {
					if(dcm.isSignalRate(k) && dcm.isOutput(k)){ // only process output channels that are handled at signal rate
						digitalWriteOnce(context, digitalFrame, k, *p1 > 0.5);
					}
				}
			}
	}
	// Bela digital out at message-rate
	dcm.processOutput(context->digital, context->digitalFrames);

	// Bela scope
	if(gScopeChannelsInUse > 0)
	{
		unsigned int j, k;
		float *p0, *p1;
		const unsigned int gLibpdBlockSize = context->audioFrames;
		float* gOutBuf = gHvOutputBuffers;

		// block below copy/pasted from libpd
		for (j = 0, p0 = gOutBuf; j < gLibpdBlockSize; ++j, ++p0) {
			for (k = 0, p1 = p0  + gLibpdBlockSize * gFirstScopeChannel; k < gScopeChannelsInUse; k++, p1 += gLibpdBlockSize) {
				gScopeOut[k] = *p1;
			}
			scope.log(gScopeOut);
		}
	}

	// Interleave the output data
	if(gHvOutputBuffers != NULL) {
		for(unsigned int n = 0; n < context->audioFrames; n++) {

			for(unsigned int ch = 0; ch < gHvOutputChannels; ch++) {
				if(ch >= context->audioOutChannels+context->analogOutChannels) {
					// THESE ARE SENSOR OUTPUT 'CHANNELS' USED FOR ROUTING
					// they are the content of the 'sensor output' dac~ channels
				} else {
					if(ch >= context->audioOutChannels)	{
						int m = n/2;
						context->analogOut[m * context->analogFrames + (ch-context->audioOutChannels)] = constrain(gHvOutputBuffers[ch*context->audioFrames + n],0.0,1.0);
					} else {
						context->audioOut[n * context->audioOutChannels + ch] = gHvOutputBuffers[ch * context->audioFrames + n];
					}
				}
			}
		}
	}

}


void cleanup(BelaContext *context, void *userData)
{

	hv_bela_free(gHeavyContext);
	if(gHvInputBuffers != NULL)
		free(gHvInputBuffers);
	if(gHvOutputBuffers != NULL)
		free(gHvOutputBuffers);
	delete[] gScopeOut;
}
