/*
 * render.cpp
 *
 *  Created on: Oct 24, 2014
 *      Author: parallels
 */

#include <Bela.h>
#include <DigitalChannelManager.h>
#include <cmath>
#include <I2c_Codec.h>
#include <PRU.h>
#include <stdio.h>
#include <libpd/z_libpd.h>
#include <libpd/s_stuff.h>
#include <UdpServer.h>
#include <Midi.h>
#include <Scope.h>

// if you are 100% sure of what value was used to compile libpd/puredata, then
// you could #define gBufLength instead of getting it at runtime. It has proved to give some 0.3%
// performance boost when it is 8 (thanks to vectorize optimizations I guess).
int gBufLength;

float* gInBuf;
float* gOutBuf;
#define PARSE_MIDI
static std::vector<Midi*> midi;
std::vector<const char*> gMidiPortNames;

static unsigned int getPortChannel(int* channel){
	unsigned int port = 0;
	while(*channel > 16){
		*channel -= 16;
		port += 1;
    }
	if(port >= midi.size()){
		// if the port number exceeds the number of ports available, send out
		// of the first port 
		rt_fprintf(stderr, "Port out of range, using port 0 instead\n");
		port = 0;
	}
	return port;
}

void Bela_MidiOutNoteOn(int channel, int pitch, int velocity) {
	int port = getPortChannel(&channel);
	rt_printf("noteout _ port: %d, channel: %d, pitch: %d, velocity %d\n", port, channel, pitch, velocity);
	midi[port]->writeNoteOn(channel, pitch, velocity);
}

void Bela_MidiOutControlChange(int channel, int controller, int value) {
	int port = getPortChannel(&channel);
	rt_printf("ctlout _ port: %d, channel: %d, controller: %d, value: %d\n", port, channel, controller, value);
	midi[port]->writeControlChange(channel, controller, value);
}

void Bela_MidiOutProgramChange(int channel, int program) {
	int port = getPortChannel(&channel);
	rt_printf("pgmout _ port: %d, channel: %d, program: %d\n", port, channel, program);
	midi[port]->writeProgramChange(channel, program);
}

void Bela_MidiOutPitchBend(int channel, int value) {
	int port = getPortChannel(&channel);
	rt_printf("bendout _ port: %d, channel: %d, value: %d\n", port, channel, value);
	midi[port]->writePitchBend(channel, value);
}

void Bela_MidiOutAftertouch(int channel, int pressure){
	int port = getPortChannel(&channel);
	rt_printf("touchout _ port: %d, channel: %d, pressure: %d\n", port, channel, pressure);
	midi[port]->writeChannelPressure(channel, pressure);
}

void Bela_MidiOutPolyAftertouch(int channel, int pitch, int pressure){
	int port = getPortChannel(&channel);
	rt_printf("polytouchout _ port: %d, channel: %d, pitch: %d, pressure: %d\n", port, channel, pitch, pressure);
	midi[port]->writePolyphonicKeyPressure(channel, pitch, pressure);
}

void Bela_MidiOutByte(int port, int byte){
	printf("port: %d, byte: %d\n", port, byte);
	if(port > (int)midi.size()){
		// if the port is out of range, redirect to the first port.
		rt_fprintf(stderr, "Port out of range, using port 0 instead\n");
		port = 0;
	}
	midi[port]->writeOutput(byte);
}

void Bela_printHook(const char *recv){
	rt_printf("%s", recv);
}

static DigitalChannelManager dcm;

void sendDigitalMessage(bool state, unsigned int delay, void* receiverName){
	libpd_float((char*)receiverName, (float)state);
//	rt_printf("%s: %d\n", (char*)receiverName, state);
}

#define LIBPD_DIGITAL_OFFSET 11 // digitals are preceded by 2 audio and 8 analogs (even if using a different number of analogs)

void Bela_messageHook(const char *source, const char *symbol, int argc, t_atom *argv){
	if(strcmp(source, "bela_setDigital") == 0){
		// symbol is the direction, argv[0] is the channel, argv[1] (optional)
		// is signal("sig" or "~") or message("message", default) rate
		bool isMessageRate = true; // defaults to message rate
		bool direction = 0; // initialize it just to avoid the compiler's warning
		bool disable = false;
		if(strcmp(symbol, "in") == 0){
			direction = INPUT;
		} else if(strcmp(symbol, "out") == 0){
			direction = OUTPUT;
		} else if(strcmp(symbol, "disable") == 0){
			disable = true;
		} else {
			return;
		}
		if(argc == 0){
			return;
		} else if (libpd_is_float(&argv[0]) == false){
			return;
		}
		int channel = libpd_get_float(&argv[0]) - LIBPD_DIGITAL_OFFSET;
		if(disable == true){
			dcm.unmanage(channel);
			return;
		}
		if(argc >= 2){
			t_atom* a = &argv[1];
			if(libpd_is_symbol(a)){
				char *s = libpd_get_symbol(a);
				if(strcmp(s, "~") == 0  || strncmp(s, "sig", 3) == 0){
					isMessageRate = false;
				}
			}
		}
		dcm.manage(channel, direction, isMessageRate);
	}
}

void Bela_floatHook(const char *source, float value){
	// let's make this as optimized as possible for built-in digital Out parsing
	// the built-in digital receivers are of the form "bela_digitalOutXX" where XX is between 11 and 26
	static int prefixLength = 15; // strlen("bela_digitalOut")
	if(strncmp(source, "bela_digitalOut", prefixLength)==0){
		if(source[prefixLength] != 0){ //the two ifs are used instead of if(strlen(source) >= prefixLength+2)
			if(source[prefixLength + 1] != 0){
				// quickly convert the suffix to integer, assuming they are numbers, avoiding to call atoi
				int receiver = ((source[prefixLength] - 48) * 10);
				receiver += (source[prefixLength+1] - 48);
				unsigned int channel = receiver - 11; // go back to the actual Bela digital channel number
				if(channel < 16){ //16 is the hardcoded value for the number of digital channels
					dcm.setValue(channel, value);
				}
			}
		}
	}
}

char receiverNames[16][21]={
	{"bela_digitalIn11"},{"bela_digitalIn12"},{"bela_digitalIn13"},{"bela_digitalIn14"},{"bela_digitalIn15"},
	{"bela_digitalIn16"},{"bela_digitalIn17"},{"bela_digitalIn18"},{"bela_digitalIn19"},{"bela_digitalIn20"},
	{"bela_digitalIn21"},{"bela_digitalIn22"},{"bela_digitalIn23"},{"bela_digitalIn24"},{"bela_digitalIn25"},
	{"bela_digitalIn26"}
};

static unsigned int gAnalogChannelsInUse;
static unsigned int gLibpdBlockSize;
// 2 audio + (up to)8 analog + (up to) 16 digital + 4 scope outputs
static const unsigned int gChannelsInUse = 30;
//static const unsigned int gFirstAudioChannel = 0;
static const unsigned int gFirstAnalogChannel = 2;
static const unsigned int gFirstDigitalChannel = 10;
static const unsigned int gFirstScopeChannel = 26;
static char multiplexerArray[] = {"bela_multiplexer"};
static int multiplexerArraySize = 0;
static bool pdMultiplexerActive = false;

Scope scope;
unsigned int gScopeChannelsInUse = 4;
float* gScopeOut;
void* gPatch;
bool setup(BelaContext *context, void *userData)
{
	// add here other devices you need 
	gMidiPortNames.push_back("hw:1,0,0");
	//gMidiPortNames.push_back("hw:0,0,0");
	//gMidiPortNames.push_back("hw:1,0,1");

    scope.setup(gScopeChannelsInUse, context->audioSampleRate);
    gScopeOut = new float[gScopeChannelsInUse];

	// Check first of all if file exists. Will actually open it later.
	char file[] = "_main.pd";
	char folder[] = "./";
	unsigned int strSize = strlen(file) + strlen(folder) + 1;
	char* str = (char*)malloc(sizeof(char) * strSize);
	snprintf(str, strSize, "%s%s", folder, file);
	if(access(str, F_OK) == -1 ) {
		printf("Error file %s/%s not found. The %s file should be your main patch.\n", folder, file, file);
		return false;
	}
	if(context->analogInChannels != context->analogOutChannels ||
			context->audioInChannels != context->audioOutChannels){
		printf("This project requires the number of inputs and the number of outputs to be the same\n");
		return false;
	}
	// analog setup
	gAnalogChannelsInUse = context->analogInChannels;

	// digital setup
	dcm.setCallback(sendDigitalMessage);
	if(context->digitalChannels > 0){
		for(unsigned int ch = 0; ch < context->digitalChannels; ++ch){
			dcm.setCallbackArgument(ch, receiverNames[ch]);
		}
	}
	midi.resize(gMidiPortNames.size());
	for(unsigned int n = 0; n < midi.size(); ++n){
		midi[n] = new Midi();
		const char* name = gMidiPortNames[n];
		midi[n]->readFrom(name);
		midi[n]->writeTo(name);
#ifdef PARSE_MIDI
		midi[n]->enableParser(true);
#else
		midi[n]->enableParser(false);
#endif /* PARSE_MIDI */
	}
//	udpServer.bindToPort(1234);

	gLibpdBlockSize = libpd_blocksize();
	// check that we are not running with a blocksize smaller than gLibPdBlockSize
	// We could still make it work, but the load would be executed unevenly between calls to render
	if(context->audioFrames < gLibpdBlockSize){
		fprintf(stderr, "Error: minimum block size must be %d\n", gLibpdBlockSize);
		return false;
	}
	// set hooks before calling libpd_init
	if(midi.size() > 0){
		// do not register callbacks if no MIDI device is in use.
		libpd_set_printhook(Bela_printHook);
		libpd_set_floathook(Bela_floatHook);
		libpd_set_messagehook(Bela_messageHook);
		libpd_set_noteonhook(Bela_MidiOutNoteOn);
		libpd_set_controlchangehook(Bela_MidiOutControlChange);
		libpd_set_programchangehook(Bela_MidiOutProgramChange);
		libpd_set_pitchbendhook(Bela_MidiOutPitchBend);
		libpd_set_aftertouchhook(Bela_MidiOutAftertouch);
		libpd_set_polyaftertouchhook(Bela_MidiOutPolyAftertouch);
		libpd_set_midibytehook(Bela_MidiOutByte);
	}


	//TODO: add hooks for other midi events and generate MIDI output appropriately
	libpd_init();
	//TODO: ideally, we would analyse the ASCII of the patch file and find out which in/outs to use
	libpd_init_audio(gChannelsInUse, gChannelsInUse, context->audioSampleRate);
	gInBuf = libpd_get_sys_soundin();
	gOutBuf = libpd_get_sys_soundout();

	libpd_start_message(1); // one entry in list
	libpd_add_float(1.0f);
	libpd_finish_message("pd", "dsp");

	gBufLength = max(gLibpdBlockSize, context->audioFrames);


	// bind your receivers here
	libpd_bind("bela_digitalOut11");
	libpd_bind("bela_digitalOut12");
	libpd_bind("bela_digitalOut13");
	libpd_bind("bela_digitalOut14");
	libpd_bind("bela_digitalOut15");
	libpd_bind("bela_digitalOut16");
	libpd_bind("bela_digitalOut17");
	libpd_bind("bela_digitalOut18");
	libpd_bind("bela_digitalOut19");
	libpd_bind("bela_digitalOut20");
	libpd_bind("bela_digitalOut21");
	libpd_bind("bela_digitalOut22");
	libpd_bind("bela_digitalOut23");
	libpd_bind("bela_digitalOut24");
	libpd_bind("bela_digitalOut25");
	libpd_bind("bela_digitalOut26");
	libpd_bind("bela_setDigital");
	// open patch       [; pd open file folder(
	gPatch = libpd_openfile(file, folder);
	if(gPatch == NULL){
		printf("Error: file %s/%s is corrupted.\n", folder, file); 
		return false;
	}

	if(context->multiplexerChannels > 0 && libpd_arraysize(multiplexerArray) >= 0){
		pdMultiplexerActive = true;
		multiplexerArraySize = context->multiplexerChannels * context->analogInChannels;
		libpd_start_message(1);
		libpd_add_float(multiplexerArraySize);
		libpd_finish_message(multiplexerArray, "resize");
		libpd_float("bela_multiplexerChannels", context->multiplexerChannels);
	}

	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available). If only audio is available, numMatrixFrames
// will be 0.

void render(BelaContext *context, void *userData)
{
	int num;
	// the safest thread-safe option to handle MIDI input is to process the MIDI buffer
	// from the audio thread.
#ifdef PARSE_MIDI
	for(unsigned int port = 0; port < midi.size(); ++port){
		while((num = midi[port]->getParser()->numAvailableMessages()) > 0){
			static MidiChannelMessage message;
			message = midi[port]->getParser()->getNextChannelMessage();
			rt_printf("On port %d (%s): ", port, gMidiPortNames[port]);
			message.prettyPrint(); // use this to print beautified message (channel, data bytes)
			switch(message.getType()){
				case kmmNoteOn:
				{
					int noteNumber = message.getDataByte(0);
					int velocity = message.getDataByte(1);
					int channel = message.getChannel();
					libpd_noteon(channel + port * 16, noteNumber, velocity);
					break;
				}
				case kmmNoteOff:
				{
					/* PureData does not seem to handle noteoff messages as per the MIDI specs,
					 * so that the noteoff velocity is ignored. Here we convert them to noteon
					 * with a velocity of 0.
					 */
					int noteNumber = message.getDataByte(0);
	//				int velocity = message.getDataByte(1); // would be ignored by Pd
					int channel = message.getChannel();
					libpd_noteon(channel + port * 16, noteNumber, 0);
					break;
				}
				case kmmControlChange:
				{
					int channel = message.getChannel();
					int controller = message.getDataByte(0);
					int value = message.getDataByte(1);
					libpd_controlchange(channel + port * 16, controller, value);
					break;
				}
				case kmmProgramChange:
				{
					int channel = message.getChannel();
					int program = message.getDataByte(0);
					libpd_programchange(channel + port * 16, program);
					break;
				}
				case kmmPolyphonicKeyPressure:
				{
					int channel = message.getChannel();
					int pitch = message.getDataByte(0);
					int value = message.getDataByte(1);
					libpd_polyaftertouch(channel + port * 16, pitch, value);
					break;
				}
				case kmmChannelPressure:
				{
					int channel = message.getChannel();
					int value = message.getDataByte(0);
					libpd_aftertouch(channel + port * 16, value);
					break;
				}
				case kmmPitchBend:
				{
					int channel = message.getChannel();
					int value =  ((message.getDataByte(1) << 7)| message.getDataByte(0)) - 8192;
					libpd_pitchbend(channel + port * 16, value);
					break;
				}
				case kmmNone:
				case kmmAny:
					break;
			}
		}
	}
#else
	int input;
	for(unsigned int port = 0; port < NUM_MIDI_PORTS; ++port){
		while((input = midi[port].getInput()) >= 0){
			libpd_midibyte(port, input);
		}
	}
#endif /* PARSE_MIDI */
	static unsigned int numberOfPdBlocksToProcess = gBufLength / gLibpdBlockSize;

	for(unsigned int tick = 0; tick < numberOfPdBlocksToProcess; ++tick){
		unsigned int audioFrameBase = gLibpdBlockSize * tick;
		unsigned int j;
		unsigned int k;
		float* p0;
		float* p1;
		for (j = 0, p0 = gInBuf; j < gLibpdBlockSize; j++, p0++) {
			for (k = 0, p1 = p0; k < context->audioInChannels; k++, p1 += gLibpdBlockSize) {
				*p1 = audioRead(context, audioFrameBase + j, k);
			}
		}
		// then analogs
	if(!pdMultiplexerActive){
		// this loop resamples by ZOH, as needed, using m
		if(context->analogInChannels == 8 ){ //hold the value for two frames
			for (j = 0, p0 = gInBuf; j < gLibpdBlockSize; j++, p0++) {
				for (k = 0, p1 = p0 + gLibpdBlockSize * gFirstAnalogChannel; k < gAnalogChannelsInUse; ++k, p1 += gLibpdBlockSize) {
					unsigned int analogFrame = (audioFrameBase + j) / 2;
					*p1 = analogRead(context, analogFrame, k);
				}
			}
		} else if(context->analogInChannels == 4){ //write every frame
			for (j = 0, p0 = gInBuf; j < gLibpdBlockSize; j++, p0++) {
				for (k = 0, p1 = p0 + gLibpdBlockSize * gFirstAnalogChannel; k < gAnalogChannelsInUse; ++k, p1 += gLibpdBlockSize) {
					unsigned int analogFrame = audioFrameBase + j;
					*p1 = analogRead(context, analogFrame, k);
				}
			}
		} else if(context->analogInChannels == 2){ //drop every other frame
			for (j = 0, p0 = gInBuf; j < gLibpdBlockSize; j++, p0++) {
				for (k = 0, p1 = p0 + gLibpdBlockSize * gFirstAnalogChannel; k < gAnalogChannelsInUse; ++k, p1 += gLibpdBlockSize) {
					unsigned int analogFrame = (audioFrameBase + j) * 2;
					*p1 = analogRead(context, analogFrame, k);
				}
			}
		}
	} else {
		static int lastMuxerUpdate = 0;
		if(++lastMuxerUpdate == multiplexerArraySize){
			lastMuxerUpdate = 0;
			libpd_write_array(multiplexerArray, 0, (float *const)context->multiplexerAnalogIn, multiplexerArraySize);
		}
	}

		// Bela digital input
		// note: in multiple places below we assume that the number of digitals is same as number of audio
		// digital in at message-rate
		dcm.processInput(&context->digital[audioFrameBase], gLibpdBlockSize);

		// digital in at signal-rate
		for (j = 0, p0 = gInBuf; j < gLibpdBlockSize; j++, p0++) {
			unsigned int digitalFrame = audioFrameBase + j;
			for (k = 0, p1 = p0 + gLibpdBlockSize * gFirstDigitalChannel;
					k < 16; ++k, p1 += gLibpdBlockSize) {
				if(dcm.isSignalRate(k) && dcm.isInput(k)){ // only process input channels that are handled at signal rate
					*p1 = digitalRead(context, digitalFrame, k);
				}
			}
		}

		libpd_process_sys(); // process the block

		//digital out
		// digital out at signal-rate
		for (j = 0, p0 = gOutBuf; j < gLibpdBlockSize; ++j, ++p0) {
			unsigned int digitalFrame = (audioFrameBase + j);
			for (k = 0, p1 = p0  + gLibpdBlockSize * gFirstDigitalChannel;
					k < context->digitalChannels; k++, p1 += gLibpdBlockSize) {
				if(dcm.isSignalRate(k) && dcm.isOutput(k)){ // only process output channels that are handled at signal rate
					digitalWriteOnce(context, digitalFrame, k, *p1 > 0.5);
				}
			}
		}

		// digital out at message-rate
		dcm.processOutput(&context->digital[audioFrameBase], gLibpdBlockSize);

		//audio
		for (j = 0, p0 = gOutBuf; j < gLibpdBlockSize; j++, p0++) {
			for (k = 0, p1 = p0; k < context->audioOutChannels; k++, p1 += gLibpdBlockSize) {
				audioWrite(context, audioFrameBase + j, k, *p1);
			}
		}
		//scope
		for (j = 0, p0 = gOutBuf; j < gLibpdBlockSize; ++j, ++p0) {
			for (k = 0, p1 = p0  + gLibpdBlockSize * gFirstScopeChannel; k < gScopeChannelsInUse; k++, p1 += gLibpdBlockSize) {
				gScopeOut[k] = *p1;
			}
			scope.log(gScopeOut[0], gScopeOut[1], gScopeOut[2], gScopeOut[3]);
		}


		//analog
		if(context->analogOutChannels == 8){
			for (j = 0, p0 = gOutBuf; j < gLibpdBlockSize; j += 2, p0 += 2) { //write every two frames
				unsigned int analogFrame = (audioFrameBase + j) / 2;
				for (k = 0, p1 = p0 + gLibpdBlockSize * gFirstAnalogChannel; k < gAnalogChannelsInUse; k++, p1 += gLibpdBlockSize) {
					analogWriteOnce(context, analogFrame, k, *p1);
				}
			}
		} else if(context->analogOutChannels == 4){ //write every frame
			for (j = 0, p0 = gOutBuf; j < gLibpdBlockSize; ++j, ++p0) {
				unsigned int analogFrame = (audioFrameBase + j);
				for (k = 0, p1 = p0  + gLibpdBlockSize * gFirstAnalogChannel; k < gAnalogChannelsInUse; k++, p1 += gLibpdBlockSize) {
					analogWriteOnce(context, analogFrame, k, *p1);
				}
			}
		} else if(context->analogOutChannels == 2){ //write every frame twice
			for (j = 0, p0 = gOutBuf; j < gLibpdBlockSize; j++, p0++) {
				for (k = 0, p1 = p0 + gLibpdBlockSize * gFirstAnalogChannel; k < gAnalogChannelsInUse; k++, p1 += gLibpdBlockSize) {
					int analogFrame = audioFrameBase * 2 + j * 2;
					analogWriteOnce(context, analogFrame, k, *p1);
					analogWriteOnce(context, analogFrame + 1, k, *p1);
				}
			}
		}
	}
}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BelaContext *context, void *userData)
{
	libpd_closefile(gPatch);
	delete [] gScopeOut;
}
