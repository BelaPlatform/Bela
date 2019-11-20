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
#include <libraries/Midi/Midi.h>
#include <libraries/Scope/Scope.h>
#include <cmath>
#include <Heavy_bela.h>
#include <string.h>
#include <stdlib.h>
#include <string>
#include <sstream>
#include <DigitalChannelManager.h>
#include <algorithm>
#include <array>

#define BELA_HEAVY_I2C

enum { minFirstDigitalChannel = 10 };

static unsigned int gAudioChannelsInUse;
static unsigned int gAnalogChannelsInUse;
static unsigned int gDigitalChannelsInUse;
unsigned int gScopeChannelsInUse;
static unsigned int gChannelsInUse;
static unsigned int gFirstAnalogChannel;
static unsigned int gFirstDigitalChannel;
static unsigned int gDigitalChannelOffset;
static unsigned int gFirstScopeChannel;

static unsigned int gDigitalSigInChannelsInUse;
static unsigned int gDigitalSigOutChannelsInUse;

float* gScopeOut;
// Bela Scope
static Scope* scope = NULL;
static char multiplexerArray[] = {"bela_multiplexer"};
static int multiplexerArraySize = 0;
static bool pdMultiplexerActive = false;
bool gDigitalEnabled = 0;

// Bela Midi
unsigned int hvMidiHashes[7]; // heavy-specific
static std::vector<Midi*> midi;
std::vector<std::string> gMidiPortNames;

#ifdef BELA_HEAVY_I2C
#include <I2cRt.h>
I2cRt i2c;
bool i2cEnabled = false;
unsigned int maxI2cMsgPerCallback = 100;
char i2cReceiverName[] = "bela_i2c_in";
#endif // BELA_HEAVY_I2C

void dumpMidi()
{
	if(midi.size() == 0)
	{
		printf("No MIDI device enabled\n");
		return;
	}
	printf("The following MIDI devices are enabled:\n");
	printf("%4s%20s %3s %3s %s\n",
			"Num",
			"Name",
			"In",
			"Out",
			"Pd channels"
	      );
	for(unsigned int n = 0; n < midi.size(); ++n)
	{
		printf("[%2d]%20s %3s %3s (%d-%d)\n",
			n,
			gMidiPortNames[n].c_str(),
			midi[n]->isInputEnabled() ? "x" : "_",
			midi[n]->isOutputEnabled() ? "x" : "_",
			n * 16 + 1,
			n * 16 + 16
		);
	}
}

Midi* openMidiDevice(std::string name, bool verboseSuccess = false, bool verboseError = false)
{
	Midi* newMidi;
	newMidi = new Midi();
	newMidi->readFrom(name.c_str());
	newMidi->writeTo(name.c_str());
	newMidi->enableParser(true);
	if(newMidi->isOutputEnabled())
	{
		if(verboseSuccess)
			printf("Opened MIDI device %s as output\n", name.c_str());
	}
	if(newMidi->isInputEnabled())
	{
		if(verboseSuccess)
			printf("Opened MIDI device %s as input\n", name.c_str());
	}
	if(!newMidi->isInputEnabled() && !newMidi->isOutputEnabled())
	{
		if(verboseError)
			fprintf(stderr, "Failed to open  MIDI device %s\n", name.c_str());
		return nullptr;
	} else {
		return newMidi;
	}
}

static unsigned int getPortChannel(int* channel){
	unsigned int port = 0;
	while(*channel >= 16){
		*channel -= 16;
		port += 1;
	}
	return port;
}

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


void printHook(HeavyContextInterface *context, const char *printLabel, const char *msgString, const HvMessage *msg) {
	const double timestampSecs = ((double) hv_msg_getTimestamp(msg)) / hv_getSampleRate(context);
	rt_printf("print: [@ %.3f] %s: %s\n", timestampSecs, printLabel, msgString);
}


// digitals
static DigitalChannelManager dcm;

void sendDigitalMessage(bool state, unsigned int delay, void* receiverName){
	hv_sendFloatToReceiver(gHeavyContext, hv_stringToHash((char*)receiverName), (float)state);
//	rt_printf("%s: %d\n", (char*)receiverName, state);
}


std::vector<std::string> gHvDigitalInHashes;
void generateDigitalNames(unsigned int numDigitals, unsigned int digitalOffset, std::vector<std::string>& receiverInputNames)
{
	std::string inBaseString = "bela_digitalIn";
	for(unsigned int i = 0; i<numDigitals; i++)
	{
		receiverInputNames.push_back(inBaseString + std::to_string(i+digitalOffset));
	}
}

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
				unsigned int channel = receiver - gDigitalChannelOffset; // go back to the actual Bela digital channel number
				bool value = (hv_msg_getFloat(m, 0) != 0.0f);
				if(channel < gDigitalChannelsInUse){ //gDigitalChannelsInUse is the number of digital channels
					dcm.setValue(channel, value);
				}
			}
		}
		return;
	}

	// More MIDI and digital messages. To obtain the hashes below, use hv_stringToHash("yourString")
	switch (sendHash) {
		case 0xfb212be8: { // bela_setMidi
			if (!hv_msg_hasFormat(m, "sfff")) {
				fprintf(stderr, "Wrong format for Bela_setMidi, expected:[hw 1 0 0(");
				return;
			}
			const char* symbol = hv_msg_getSymbol(m, 0);
			int num[3] = {0, 0, 0};
			for(int n = 0; n < 3; ++n)
			{
				num[n] = hv_msg_getFloat(m, n + 1);
			}
			std::ostringstream deviceName;
			deviceName << symbol << ":" << num[0] << "," << num[1] << "," << num[2];
			printf("Adding Midi device: %s\n", deviceName.str().c_str());
			Midi* newMidi = openMidiDevice(deviceName.str(), true, true);
			if(newMidi)
			{
				midi.push_back(newMidi);
				gMidiPortNames.push_back(deviceName.str());
			}
			dumpMidi();
			break;
		}
		case 0x70418732: { // bela_setDigital
			if(gDigitalEnabled)
			{
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
				int channel = hv_msg_getFloat(m, 1) - gDigitalChannelOffset;
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
			}
			break;
		}
#ifdef BELA_HEAVY_I2C
		case 0xa49dc232: // bela_i2c
		{
			int argc = hv_msg_getNumElements(m);
			if (!argc || !(hv_msg_isSymbol(m, 0))) return;
			const char *symbol = hv_msg_getSymbol(m, 0);
			if(strcmp(symbol, "debug") == 0)
			{
				int debugMode = 1;
				if(argc > 1 && hv_msg_isFloat(m, 1))
				{
					float val = hv_msg_getFloat(m, 1);
					debugMode = (int)val;
				}
				i2c.setDebug(debugMode);
				return;
			}
			if(strcmp(symbol, "open") == 0)
			{
				if(argc < 2 || !hv_msg_isFloat(m, 1))
				{
					rt_fprintf(stderr, "bela_i2c: first argument to `open` must be a float (number of i2c bus)\n");
					return;
				}
				int bus = (int)hv_msg_getFloat(m, 1);
				int address;
				if(argc < 2)
					address = 0;
				else
				{
					if(!hv_msg_isFloat(m, 2))
					{
						rt_fprintf(stderr, "bela_i2c: second argument to `open` must be a float (address, default 0)\n");
						return;
					}
					address = hv_msg_getFloat(m, 2);
				}
				if(i2c.initI2C_RW(bus, address))
				{
					rt_fprintf(stderr, "bela_i2c: unable to open bus %d\n", bus);
					return;
				}
				i2c.setAddressRt(address);
				i2c.startThread(&gShouldStop);
				i2cEnabled = true;
				//TODO: (re-)enable the i2c I/O in a thread-safe way
				return;
			}
			if(strcmp(symbol, "address") == 0)
			{
				if(!hv_msg_isFloat(m, 1))
				{
					rt_fprintf(stderr, "bela_i2c: argument to `address` must be a float (i2c address of device)\n");
					return;
				}
				int address = hv_msg_getFloat(m, 1);
				i2c.setAddressRt(address);
				return;
			}
			if(strcmp(symbol, "read") == 0)
			{
				if(!hv_msg_isFloat(m, 1))
				{
					rt_fprintf(stderr, "bela_i2c: argument to `read` must be a float (number of bytes to read)\n");
					return;
				}
				int size = hv_msg_getFloat(m, 1);
				i2c.readRt(size);
				return;
			}
			if(strcmp(symbol, "write") == 0)
			{
				unsigned int writeSize = argc;
				i2c_char_t outbuf[writeSize];
				for(int n = 1; n < argc; n++)
				{
					if(!hv_msg_isFloat(m, n))
					{
						rt_fprintf(stderr, "bela_i2c: arguments to `write` must be floats (values to write)\n");
						return;
					}
					i2c_char_t byte = hv_msg_getFloat(m, n);
					outbuf[n - 1] = byte;
				}
				if(i2c.writeRt(outbuf, sizeof(outbuf)))
				{
					rt_fprintf(stderr, "Failed to write %d bytes to i2c bus\n", sizeof(outbuf));
					return;
				}
				return;
			}
			if(strcmp(symbol, "writeread") == 0)
			{
				unsigned int writeSize = argc - 2;
				i2c_char_t outbuf[writeSize];
				for(int n = 1; n < argc - 1; n++)
				{
					if(!hv_msg_isFloat(m, n))
					{
						rt_fprintf(stderr, "bela_i2c: arguments to `writeread` must be floats (values to write, last one is number of bytes to read)\n");
						return;
					}
					i2c_char_t byte = hv_msg_getFloat(m, n);
					outbuf[n - 1] = byte;
				}
				if(!hv_msg_isFloat(m, argc - 1))
				{
					rt_fprintf(stderr, "bela_i2c: arguments to `writeread` must be floats (values to write, last one is number of bytes to read)\n");
					return;
				}
				unsigned int readSize  = hv_msg_getFloat(m, argc - 1);
				i2c.writeReadRt(outbuf, sizeof(outbuf), readSize);
				return;
			}
			break;
		}
#endif // BELA_HEAVY_I2C
		case 0xd1d4ac2: { // __hv_noteout
			if (!hv_msg_hasFormat(m, "fff")) return;
			midi_byte_t pitch = (midi_byte_t) hv_msg_getFloat(m, 0);
			midi_byte_t velocity = (midi_byte_t) hv_msg_getFloat(m, 1);
			int channel = (midi_byte_t) hv_msg_getFloat(m, 2);
			int port = getPortChannel(&channel);
			//rt_printf("noteout[%d]: %d %d %d\n", port, channel, pitch, velocity);
			port < midi.size() && midi[port]->writeNoteOn(channel, pitch, velocity);
			break;
		}
		case 0xe5e2a040: { // __hv_ctlout
			if (!hv_msg_hasFormat(m, "fff")) return;
			midi_byte_t value = (midi_byte_t) hv_msg_getFloat(m, 0);
			midi_byte_t controller = (midi_byte_t) hv_msg_getFloat(m, 1);
			int channel = (midi_byte_t) hv_msg_getFloat(m, 2);
			int port = getPortChannel(&channel);
			//rt_printf("controlout[%d]: %d %d %d\n", port, channel, controller, value);
			port < midi.size() && midi[port]->writeControlChange(channel, controller, value);
			break;
		}
		case 0x8753e39e: { // __hv_pgmout
			midi_byte_t program = (midi_byte_t) hv_msg_getFloat(m, 0);
			int channel = (midi_byte_t) hv_msg_getFloat(m, 1);
			int port = getPortChannel(&channel);
			//rt_printf("pgmout[%d]: %d %d\n", port, channel, program);
			port < midi.size() && midi[port]->writeProgramChange(channel, program);
			break;
		}
		case 0xe8458013: { // __hv_bendout
			if (!hv_msg_hasFormat(m, "ff")) return;
			unsigned int value = hv_msg_getFloat(m, 0);
			int channel = (midi_byte_t) hv_msg_getFloat(m, 1);
			int port = getPortChannel(&channel);
			//rt_printf("bendout[%d]: %d %d\n", port, channel, value);
			port < midi.size() && midi[port]->writePitchBend(channel, value);
			break;
		}
		case 0x476d4387: { // __hv_touchout
			if (!hv_msg_hasFormat(m, "ff")) return;
			midi_byte_t pressure = (midi_byte_t) hv_msg_getFloat(m, 0);
			int channel = (midi_byte_t) hv_msg_getFloat(m, 1);
			int port = getPortChannel(&channel);
			//rt_printf("touchout[%d]: %d %d\n", port, channel, pressure);
			port < midi.size() && midi[port]->writeChannelPressure(channel, pressure);
			break;
		}
		case 0xd5aca9d1: { // __hv_polytouchout, not currently supported by Heavy. You have to [send __hv_polytouchout]
			if (!hv_msg_hasFormat(m, "fff")) return;
			midi_byte_t pitch = (midi_byte_t) hv_msg_getFloat(m, 0);
			midi_byte_t pressure = (midi_byte_t) hv_msg_getFloat(m, 1);
			int channel = (midi_byte_t) hv_msg_getFloat(m, 2);
			int port = getPortChannel(&channel);
			//rt_printf("polytouchout [%d]: %d %d %d\n", port, channel, pitch, pressure);
			port < midi.size() && midi[port]->writePolyphonicKeyPressure(channel, pitch, pressure);
			break;
		}
		case 0x6511de55: { // __hv_midiout, not currently supported by Heavy. You have to [send __hv_midiout]
			if (!hv_msg_hasFormat(m, "ff")) return;
			midi_byte_t byte = (midi_byte_t) hv_msg_getFloat(m, 0);
			int port = (int) hv_msg_getFloat(m, 1);
			//rt_printf("midiout port: %d, byte: %d\n", port, byte);
			port < midi.size() && midi[port]->writeOutput(byte);
			break;
		}
		default: {
			break;
		}
	}
}


/*
 * SETUP, RENDER LOOP & CLEANUP
 */


bool setup(BelaContext *context, void *userData)	{
	// Check if digitals are enabled
	if(context->digitalFrames > 0 && context->digitalChannels > 0)
		gDigitalEnabled = 1;

	gAudioChannelsInUse = std::max(context->audioInChannels, context->audioOutChannels);
	gAnalogChannelsInUse = std::max(context->analogInChannels, context->analogOutChannels);
	gDigitalChannelsInUse = context->digitalChannels;

	// Channel distribution
	gFirstAnalogChannel = std::max(context->audioInChannels, context->audioOutChannels);
	gFirstDigitalChannel = gFirstAnalogChannel + std::max(context->analogInChannels, context->analogOutChannels);
	if(gFirstDigitalChannel < minFirstDigitalChannel)
		gFirstDigitalChannel = minFirstDigitalChannel; //for backwards compatibility
	gDigitalChannelOffset = gFirstDigitalChannel + 1;
	gFirstScopeChannel = gFirstDigitalChannel + gDigitalChannelsInUse;

	gChannelsInUse = gFirstScopeChannel + gScopeChannelsInUse;
	
	// Create hashes for digital channels
	generateDigitalNames(gDigitalChannelsInUse, gDigitalChannelOffset, gHvDigitalInHashes);

	/* HEAVY */
	std::array<std::string, 8> outs = {{
		"__hv_noteout",
		"__hv_ctlout",
		"__hv_pgmout",
		"__hv_touchout",
		"__hv_polytouchout",
		"__hv_bendout",
		"__hv_midiout",
	}};
	for(auto &st : outs)
	{
		// uncomment this if you want to display the hashes for midi
		// outs. Then hardcode them in the switch() in sendHook()
		printf("%s: %#x\n", st.c_str(), hv_stringToHash(st.c_str()));
	}
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
	if(gDigitalEnabled)
	{
		gDigitalSigInChannelsInUse = gHvInputChannels > gFirstDigitalChannel ?
			gHvInputChannels - gFirstDigitalChannel : 0;
		gDigitalSigOutChannelsInUse = gHvOutputChannels > gFirstDigitalChannel ?
			gHvOutputChannels - gFirstDigitalChannel - gScopeChannelsInUse: 0;
	}
	else
	{
		gDigitalSigInChannelsInUse = 0;
		gDigitalSigOutChannelsInUse = 0;
	}

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

	// add here other devices you need
	gMidiPortNames.push_back("hw:1,0,0");
	//gMidiPortNames.push_back("hw:0,0,0");
	//gMidiPortNames.push_back("hw:1,0,1");
	unsigned int n = 0;
	while(n < gMidiPortNames.size())
	{
		Midi* newMidi = openMidiDevice(gMidiPortNames[n], true, true);
		if(newMidi)
		{
			midi.push_back(newMidi);
			++n;
		} else {
			gMidiPortNames.erase(gMidiPortNames.begin() + n);
		}
	}
	dumpMidi();

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
	if(gDigitalEnabled)
	{
		dcm.setCallback(sendDigitalMessage);
		if(gDigitalChannelsInUse> 0){
			for(unsigned int ch = 0; ch < gDigitalChannelsInUse; ++ch){
				dcm.setCallbackArgument(ch, (void *) gHvDigitalInHashes[ch].c_str());
			}
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
#ifdef BELA_HEAVY_I2C
	if(i2cEnabled)
	{
		for(unsigned int n = 0; n < maxI2cMsgPerCallback; ++n)
		{
			I2cRt::Msg msg = i2c.retrieveMessage();
			if (msg.status == I2cRt::MsgStatus::noMessage) {
				break;
			}
			if(msg.status == I2cRt::MsgStatus::success)
			{
				if(msg.type == I2cRt::MsgType::writeRead || msg.type == I2cRt::MsgType::read)
				{
					int numElements = msg.readSize;
					HvMessage* m = (HvMessage*)hv_alloca(hv_msg_getByteSize(numElements));
					hv_msg_init(m, numElements, 0);
					for(int n = 0; n < msg.readSize; ++n)
					{
						hv_msg_setFloat(m, n, msg.payload[n]);
					}
					hv_sendMessageToReceiver(gHeavyContext, hv_stringToHash(i2cReceiverName), 0,  m);
					//rt_printf("read %d bytes: ", msg.readSize);
					//for(int n = 0; n < msg.readSize; ++n)
						//rt_printf("%d ", msg.payload[n]);
					//rt_printf("\n");
				}
				//else
					//rt_printf("Success writing\n");
			} else {
				rt_fprintf(stderr, "bela_i2c: error while communicating with the device\n");
				hv_sendFloatToReceiver(gHeavyContext, hv_stringToHash(i2cReceiverName), -1);
			}
		}
	}
#endif // BELA_HEAVY_I2C
	int num;
	for(unsigned int port = 0; port < midi.size(); ++port){
		while((num = midi[port]->getParser()->numAvailableMessages()) > 0){
			static MidiChannelMessage message;
			unsigned int channelOffset = port * 16;
			message = midi[port]->getParser()->getNextChannelMessage();
			switch(message.getType()){
			case kmmNoteOn: {
				//message.prettyPrint();
				int noteNumber = message.getDataByte(0);
				int velocity = message.getDataByte(1);
				int channel = message.getChannel();
				// rt_printf("message: noteNumber: %f, velocity: %f, channel: %f\n", noteNumber, velocity, channel);
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmNoteOn], 0, "fff",
						(float)noteNumber, (float)velocity, (float)channel + channelOffset);
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
						(float)noteNumber, (float)0, (float)channel + channelOffset);
				break;
			}
			case kmmControlChange: {
				int channel = message.getChannel();
				int controller = message.getDataByte(0);
				int value = message.getDataByte(1);
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmControlChange], 0, "fff",
						(float)value, (float)controller, (float)channel + channelOffset);
				break;
			}
			case kmmProgramChange: {
				int channel = message.getChannel();
				int program = message.getDataByte(0);
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmProgramChange], 0, "ff",
						(float)program, (float)channel + channelOffset);
				break;
			}
			case kmmPolyphonicKeyPressure: {
				//TODO: untested, I do not have anything with polyTouch... who does, anyhow?
				int channel = message.getChannel();
				int pitch = message.getDataByte(0);
				int value = message.getDataByte(1);
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmPolyphonicKeyPressure], 0, "fff",
						(float)channel + channelOffset, (float)pitch, (float)value);
				break;
			}
			case kmmChannelPressure:
			{
				int channel = message.getChannel();
				int value = message.getDataByte(0);
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmChannelPressure], 0, "ff",
						(float)value, (float)channel + channelOffset);
				break;
			}
			case kmmPitchBend:
			{
				int channel = message.getChannel();
				int value = ((message.getDataByte(1) << 7) | message.getDataByte(0));
				hv_sendMessageToReceiverV(gHeavyContext, hvMidiHashes[kmmPitchBend], 0, "ff",
						(float)value, (float)channel + channelOffset);
				break;
			}
			case kmmSystem:
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
				if(ch >= gAudioChannelsInUse + gAnalogChannelsInUse) {
					// THESE ARE PARAMETER INPUT 'CHANNELS' USED FOR ROUTING
					// 'sensor' outputs from routing channels of dac~ are passed through here
					// these could be also digital channels (handled by the dcm)
					// or parameter channels used for routing (currently unhandled)
					break;
				} else {
					// If more than 2 ADC inputs are used in the pd patch, route the analog inputs
					// i.e. ADC3->analogIn0 etc. (first two are always audio inputs)
					if(ch >= gAudioChannelsInUse)
					{
						unsigned int analogCh = ch - gAudioChannelsInUse;
						if(analogCh < context->analogInChannels)
						{
							int m = n/2;
							float mIn = analogRead(context, m, analogCh);
							gHvInputBuffers[ch * context->audioFrames + n] = mIn;
						}
					} else {
						if(ch < context->audioInChannels)
							gHvInputBuffers[ch * context->audioFrames + n] = audioRead(context, n, ch);
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
	if(gDigitalEnabled)
	{
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
	}

	// replacement for bang~ object
	//hv_sendMessageToReceiverV(gHeavyContext, "bela_bang", 0.0f, "b");
	
	// heavy audio callback
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
	if(gDigitalEnabled)
	{
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
	}
	
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
				if(ch >= gAudioChannelsInUse + gAnalogChannelsInUse) {
					// THESE ARE SENSOR OUTPUT 'CHANNELS' USED FOR ROUTING
					// they are the content of the 'sensor output' dac~ channels
				} else {
					if(ch >= gAudioChannelsInUse)	{
						int m = n/2;
						unsigned int analogCh = ch - gAudioChannelsInUse;
						if(analogCh < context->analogOutChannels)
							analogWriteOnce(context, m, analogCh, gHvOutputBuffers[ch*context->audioFrames + n]);
					} else {
						if(ch < context->audioOutChannels)
							audioWrite(context, n, ch, gHvOutputBuffers[ch * context->audioFrames + n]);
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
