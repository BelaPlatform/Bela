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
#include <Midi.h>
#include <Scope.h>
#include <cmath>
#include <Heavy_bela.h>
#include <string.h>
#include <stdlib.h>
#include <string.h>
#include <DigitalChannelManager.h>

// Bela Midi
static Midi midi;
unsigned int hvMidiHashes[7];
unsigned int gScopeChannelsInUse;
float* gScopeOut;
// Bela Scope
static Scope* scope = NULL;
static char multiplexerArray[] = {"bela_multiplexer"};
static int multiplexerArraySize = 0;
static bool pdMultiplexerActive = false;

/*
 *	HEAVY CONTEXT & BUFFERS
 */

HeavyContextInterface *gHeavyContext;
float *gHvInputBuffers = NULL, *gHvOutputBuffers = NULL;
unsigned int gHvInputChannels = 0, gHvOutputChannels = 0;
uint32_t multiplexerTableHash;

float gInverseSampleRate;

/*
 *	HEAVY FUNCTIONS
 */

// TODO: rename this
#define LIBPD_DIGITAL_OFFSET 11 // digitals are preceded by 2 audio and 8 analogs (even if using a different number of analogs)

void printHook(HeavyContextInterface *context, const char *printLabel, const char *msgString, const HvMessage *msg) {
	const double timestampSecs = ((double) hv_msg_getTimestamp(msg)) / hv_getSampleRate(context);
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

// For a message to be received here, you need to use the following syntax in Pd:
// [send receiverName @hv_param]
static void sendHook(
		HeavyContextInterface *context,
		const char *receiverName,
		hv_uint32_t sendHash,
		const HvMessage *m) {

	// Bela digital run-time messages

	// TODO: this first block is almost an exact copy of libpd's code, should we add this to the class?
	// let's make this as optimized as possible for built-in digital Out parsing
	// the built-in digital receivers are of the form "bela_digitalOutXX" where XX is between 11 and 26
	static const int prefixLength = 15; // strlen("bela_digitalOut")
	if(strncmp(receiverName, "bela_digitalOut", prefixLength)==0){
		if(receiverName[prefixLength] != 0){ //the two ifs are used instead of if(strlen(source) >= prefixLength+2)
			if(receiverName[prefixLength + 1] != 0){
				// quickly convert the suffix to integer, assuming they are numbers, avoiding to call atoi
				int receiver = ((receiverName[prefixLength] - '0') * 10);
				receiver += (receiverName[prefixLength+1] - '0');
				unsigned int channel = receiver - LIBPD_DIGITAL_OFFSET; // go back to the actual Bela digital channel number
				bool value = (hv_msg_getFloat(m, 0) != 0.0f);
				if(channel < 16){ //16 is the hardcoded value for the number of digital channels
					dcm.setValue(channel, value);
				}
			}
		}
		return;
	}

	// Bela digital initialization messages
	switch (sendHash) {
		case 0x70418732: { // bela_setDigital
			// Third argument (optional) can be ~ or sig for signal-rate, message-rate otherwise.
			// [in 14 ~(
			// |
			// [s bela_setDigital]
			// is signal("sig" or "~") or message("message", default) rate
			bool isMessageRate = true; // defaults to message rate
			bool direction = 0; // initialize it just to avoid the compiler's warning
			bool disable = false;
      if (!(hv_msg_isSymbol(m, 0) && hv_msg_isFloat(m, 1))) return;
			const char *symbol = hv_msg_getSymbol(m, 0);

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
			if(hv_msg_isSymbol(m, 2)){
				const char *s = hv_msg_getSymbol(m, 2);
				if(strcmp(s, "~") == 0  || strncmp(s, "sig", 3) == 0){
					isMessageRate = false;
				}
			}
			dcm.manage(channel, direction, isMessageRate);
			break;
		}
		case 0xEC6DA2AF: { // bela_noteout
			if (!hv_msg_hasFormat(m, "fff")) return;
			midi_byte_t pitch = (midi_byte_t) hv_msg_getFloat(m, 0);
			midi_byte_t velocity = (midi_byte_t) hv_msg_getFloat(m, 1);
			midi_byte_t channel = (midi_byte_t) hv_msg_getFloat(m, 2);
			rt_printf("noteon: %d %d %d\n", channel, pitch, velocity);
			midi.writeNoteOn(channel, pitch, velocity);
			break;
		}
		case 0xD44F9083: { // bela_ctlout
			if (!hv_msg_hasFormat(m, "fff")) return;
			midi_byte_t value = (midi_byte_t) hv_msg_getFloat(m, 0);
			midi_byte_t controller = (midi_byte_t) hv_msg_getFloat(m, 1);
			midi_byte_t channel = (midi_byte_t) hv_msg_getFloat(m, 2);
			rt_printf("controlchange: %d %d %d\n", channel, controller, value);
			midi.writeControlChange(channel, controller, value);
			break;
		}
		case 0x6A647C44: { // bela_pgmout
			if (!hv_msg_hasFormat(m, "ff")) return;
			midi_byte_t program = (midi_byte_t) hv_msg_getFloat(m, 0);
			midi_byte_t channel = (midi_byte_t) hv_msg_getFloat(m, 1);
			rt_printf("programchange: %d %d\n", channel, program);
			midi.writeProgramChange(channel, program);
			break;
		}
		case 0x545CDF50: { // bela_bendout
			if (!hv_msg_hasFormat(m, "ff")) return;
			unsigned int value = ((midi_byte_t) hv_msg_getFloat(m, 0)) + 8192;
			midi_byte_t channel = (midi_byte_t) hv_msg_getFloat(m, 1);
			rt_printf("pitchbend: %d %d\n", channel, value);
			midi.writePitchBend(channel, value);
			break;
		}
		case 0xDE18F543: { // bela_touchout
			if (!hv_msg_hasFormat(m, "ff")) return;
			midi_byte_t pressure = (midi_byte_t) hv_msg_getFloat(m, 0);
			midi_byte_t channel = (midi_byte_t) hv_msg_getFloat(m, 1);
			rt_printf("channelPressure: %d %d\n", channel, pressure);
			midi.writeChannelPressure(channel, pressure);
			break;
		}
		case 0xAE8E3B2D: { // bela_polytouchout
			if (!hv_msg_hasFormat(m, "fff")) return;
			midi_byte_t pitch = (midi_byte_t) hv_msg_getFloat(m, 0);
			midi_byte_t pressure = (midi_byte_t) hv_msg_getFloat(m, 1);
			midi_byte_t channel = (midi_byte_t) hv_msg_getFloat(m, 2);
			rt_printf("polytouch: %d %d %d\n", channel, pitch, pressure);
			midi.writePolyphonicKeyPressure(channel, pitch, pressure);
			break;
		}
		case 0x51CD8FE2: { // bela_midiout
			if (!hv_msg_hasFormat(m, "ff")) return;
			midi_byte_t byte = (midi_byte_t) hv_msg_getFloat(m, 0);
			int port = (int) hv_msg_getFloat(m, 1);
			rt_printf("port: %d, byte: %d\n", port, byte);
			midi.writeOutput(byte);
			break;
		}
		default: break;
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

bool setup(BelaContext *context, void *userData)	{
	if(context->audioInChannels != context->audioOutChannels ||
			context->analogInChannels != context->analogOutChannels){
		// It should actually work, but let's test it before releasing it!
		fprintf(stderr, "Error: TODO: a different number of channels for inputs and outputs is not yet supported\n");
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

	gHeavyContext = hv_bela_new_with_options(context->audioSampleRate, 10, 2, 0);

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

	midi.readFrom("hw:1,0,0");
	midi.writeTo("hw:1,0,0");
	midi.enableParser(true);

	if(gScopeChannelsInUse > 0){
#if __clang_major__ == 3 && __clang_minor__ == 8
		fprintf(stderr, "Scope currently not supported when compiling heavy with clang3.8, see #265 https://github.com/BelaPlatform/Bela/issues/265. You should specify `COMPILER gcc;` in your Makefile options\n");
		exit(1);
#endif
		scope = new Scope();
		scope->setup(gScopeChannelsInUse, context->audioSampleRate);
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
	// but make sure you do something like [send receiverName @hv_param]
	// when you want to send a message from Heavy to the wrapper.
	multiplexerTableHash = hv_stringToHash(multiplexerArray);
	if(context->multiplexerChannels > 0){
		pdMultiplexerActive = true;
		multiplexerArraySize = context->multiplexerChannels * context->analogInChannels;
		hv_table_setLength(gHeavyContext, multiplexerTableHash, multiplexerArraySize);
		hv_sendFloatToReceiver(gHeavyContext, hv_stringToHash("bela_multiplexerChannels"), context->multiplexerChannels);
	}

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
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmNoteOn], 0, "fff",
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
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmNoteOn], 0, "fff",
						(float)noteNumber, (float)0, (float)channel+1);
				break;
			}
			case kmmControlChange: {
				int channel = message.getChannel();
				int controller = message.getDataByte(0);
				int value = message.getDataByte(1);
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmControlChange], 0, "fff",
						(float)value, (float)controller, (float)channel+1);
				break;
			}
			case kmmProgramChange: {
				int channel = message.getChannel();
				int program = message.getDataByte(0);
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmProgramChange], 0, "ff",
						(float)program, (float)channel+1);
				break;
			}
			case kmmPolyphonicKeyPressure: {
				//TODO: untested, I do not have anything with polyTouch... who does, anyhow?
				int channel = message.getChannel();
				int pitch = message.getDataByte(0);
				int value = message.getDataByte(1);
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmPolyphonicKeyPressure], 0, "fff",
						(float)channel+1, (float)pitch, (float)value);
				break;
			}
			case kmmChannelPressure:
			{
				int channel = message.getChannel();
				int value = message.getDataByte(0);
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmChannelPressure], 0, "ff",
						(float)value, (float)channel+1);
				break;
			}
			case kmmPitchBend:
			{
				int channel = message.getChannel();
				int value = ((message.getDataByte(1) << 7) | message.getDataByte(0));
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmPitchBend], 0, "ff",
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

	if(pdMultiplexerActive){
		static int lastMuxerUpdate = 0;
		if(++lastMuxerUpdate == multiplexerArraySize){
			lastMuxerUpdate = 0;
			memcpy(hv_table_getBuffer(gHeavyContext, multiplexerTableHash), (float *const)context->multiplexerAnalogIn, multiplexerArraySize * sizeof(float));
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
	//hv_sendMessageToReceiverV(gHeavyContext, "bela_bang", 0.0f, "b");

	hv_processInline(gHeavyContext, gHvInputBuffers, gHvOutputBuffers, context->audioFrames);
	/*
	for(int n = 0; n < context->audioFrames*gHvOutputChannels; ++n)
	{
		printf("%.3f, ", gHvOutputBuffers[n]);
		if(n % context->audioFrames == context->audioFrames - 1)
			printf("\n");
	}
	*/

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
			scope->log(gScopeOut);
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
	hv_delete(gHeavyContext);
	free(gHvInputBuffers);
	free(gHvOutputBuffers);
	delete[] gScopeOut;
	delete scope;
}
