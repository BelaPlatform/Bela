/*
 * Default render file for Bela projects running Pd patches
 * using libpd.
 */
#include <Bela.h>
#include "BelaLibpd.h"

// Enable features here. These may be undef'ed below if the corresponding
// BELA_LIBPD_DISABLE_* flag is passed
#define BELA_LIBPD_SCOPE
#define BELA_LIBPD_MIDI
#define BELA_LIBPD_TRILL
#define BELA_LIBPD_GUI
#define BELA_LIBPD_SERIAL
#define BELA_LIBPD_SYSTEM_THREADED
#define BELA_LIBPD_IO_THREADED

#ifdef BELA_LIBPD_DISABLE_SCOPE
#undef BELA_LIBPD_SCOPE
#endif // BELA_LIBPD_DISABLE_SCOPE
#ifdef BELA_LIBPD_DISABLE_MIDI
#undef BELA_LIBPD_MIDI
#endif // BELA_LIBPD_DISABLE_MIDI
#ifdef BELA_LIBPD_DISABLE_TRILL
#undef BELA_LIBPD_TRILL
#endif // BELA_LIBPD_DISABLE_TRILL
#ifdef BELA_LIBPD_DISABLE_GUI
#undef BELA_LIBPD_GUI
#endif // BELA_LIBPD_DISABLE_GUI
#ifdef BELA_LIBPD_DISABLE_SERIAL
#undef BELA_LIBPD_SERIAL
#endif // BELA_LIBPD_DISABLE_SERIAL
#ifdef BELA_LIBPD_DISABLE_SYSTEM_THREADED
#undef BELA_LIBPD_SYSTEM_THREADED
#endif // BELA_LIBPD_DISABLE_SYSTEM_THREADED
#ifdef BELA_LIBPD_DISABLE_IO_THREADED
#undef BELA_LIBPD_IO_THREADED
#endif // BELA_LIBPD_DISABLE_IO_THREADED

#include <libraries/libpd/libpd.h>
#include <DigitalChannelManager.h>
#include <stdio.h>
static BelaLibpdSettings settings;

#ifdef BELA_LIBPD_MIDI
#include <algorithm>
#include <libraries/Midi/Midi.h>
#include <libraries/Pipe/Pipe.h>
#endif // BELA_LIBPD_MIDI
#ifdef BELA_LIBPD_SCOPE
#include <libraries/Scope/Scope.h>
#endif // BELA_LIBPD_SCOPE
#include <string>
#include <sstream>
#include <string.h>
#include <vector>

#if (defined(BELA_LIBPD_GUI) || defined(BELA_LIBPD_TRILL))
#include <libraries/Pipe/Pipe.h>
template <typename T>
int getIdxFromId(const char* id, std::vector<std::pair<std::string,T>>& db)
{
	for(unsigned int n = 0; n < db.size(); ++n)
	{
		if(0 == strcmp(id, db[n].first.c_str()))
			return n;
	}
	return -1;
}
#endif // BELA_LIBPD_GUI || BELA_LIBPD_TRILL

#ifdef BELA_LIBPD_TRILL
#include <tuple>
#include <libraries/Trill/Trill.h>
AuxiliaryTask gTrillTask;
Pipe gTrillPipe;

static std::vector<std::string> gTrillAcks;
static std::vector<std::pair<std::string,Trill*>> gTouchSensors;
// how often to read the cap sensors inputs.
float touchSensorSleepInterval = 0.007;

void readTouchSensors(void*)
{
	for(unsigned int n = 0; n < gTouchSensors.size(); ++n)
	{
		Trill& touchSensor = *gTouchSensors[n].second;
		int ret;
		const Trill::Device type = touchSensor.deviceType();
		if(Trill::NONE == type)
			ret = 1;
		else
			ret = touchSensor.readI2C();
		if(!ret)
		{
			gTrillPipe.writeNonRt(n);
		}
	}
}
#endif // BELA_LIBPD_TRILL

#ifdef BELA_LIBPD_GUI
#include <libraries/Gui/Gui.h>

static Pipe gGuiPipe;
static Gui gui;
struct bufferDescription
{
	std::string name;
	int id;
	int size;
};
static std::vector<struct bufferDescription> gGuiDataBuffers;
static std::vector<std::string> gGuiControlBuffers;
struct guiControlMessageHeader
{
	uint32_t size;
	uint32_t type;
	uint32_t id;
};

bool guiControlDataCallback(JSONObject& root, void* arg)
{
	int ret = true;
	for(unsigned int n = 0; n < gGuiControlBuffers.size(); ++n)
	{
		const auto& b = gGuiControlBuffers[n];
		std::wstring key = JSON::s2ws(b);
		if (root.end() != root.find(key))
		{
			JSONValue* found = root[key];
			struct guiControlMessageHeader header;
			header.id = n;
			char* array;
			if(found->IsString())
			{
				std::string value = JSON::ws2s(found->AsString());
				header.type = 's';
				header.size = value.size();
				array = (char*)alloca(header.size);
				memcpy(array, value.c_str(), header.size);
			} else if(found->IsNumber())
			{
				float value = found->AsNumber();
				header.type = 'f';
				header.size = sizeof(value);
				array = (char*)alloca(header.size);
				memcpy(array, &value, header.size);
			} else {
				continue;
			}
			// do two separate reads: the pipe is datagram-based
			// so it would be impossible to receive partial messages
			// at the other end
			gGuiPipe.writeNonRt(header);
			gGuiPipe.writeNonRt(&array[0], header.size);
			// we have successully parsed this message, so the
			// default parser shouldn't when we return
			// note: in practice there may be times when we'd want
			// to have the default parser handle this message
			// (e.g.: when an "event" field is also present), but
			// for now we ignore them
			ret = false;
			continue;
		}
	}
	return ret;
}

#endif // BELA_LIBPD_GUI
#ifdef BELA_LIBPD_SERIAL
#include <libraries/Serial/Serial.h>
#include <libraries/Pipe/Pipe.h>
#include <RtLock.h>
#include <string>

static Pipe gSerialPipe;
enum SerialType {
	kSerialFloats,
	kSerialBytes,
	kSerialSymbol,
	kSerialSymbols,
};

struct SerialStruct {
	Serial* serial;
	std::string id;
	int eom;
	enum SerialType type;
};
// this is a vector of pointers so that updating it won't affect the address of
// pre-existing SerialStruct objects. This is necessary because these pointers
// are passed to each input threads on creation and need to be constant
// throughout the lifetime of the program.
static std::vector<SerialStruct*> gSerial;
// used to protect the gSerial vector, which is modified from the audio thread
// and accessed from the writing thread
static RtMutex gSerialMutex;

struct serialMessageHeader
{
	uint32_t idSize = 0;
	uint32_t dataSize = 0;
};
enum WaitingFor {
	kHeader,
	kId,
	kData,
};

struct SerialPipeState {
	struct serialMessageHeader h;
	enum WaitingFor waitingFor = kHeader;
	char id[100];
};

static void processSerialPipe(bool rt, SerialPipeState& state)
{
	// Not sure we actually need while() below. We were using it earlier
	// when this was coded inside render() in order to be able to perform early returns
	while(1)
	{
		auto& h = state.h;
		auto& waitingFor = state.waitingFor;
		auto& id = state.id;
		if(kHeader == waitingFor)
		{
			int ret = rt ? gSerialPipe.readRt(h) : gSerialPipe.readNonRt(h);
			if(ret <= 0)
				break;
			waitingFor = kId;
		}
		if(kId == waitingFor)
		{
			if(h.idSize > sizeof(id) - 1)
				rt_fprintf(stderr, "Serial: ID too large\n");
			else
			{
				int ret = rt ? gSerialPipe.readRt(id, h.idSize) : gSerialPipe.readNonRt(id, h.idSize);
				if(ret <= 0)
					break;
				if(int(h.idSize) != ret)
				{
					rt_fprintf(stderr, "Invalid number of bytes read from gSerialPipe. Expected: %u, got %u\n", h.idSize, ret);
					break;
				}
				id[ret] = '\0'; // ensure it's null-terminated
				waitingFor = kData;
			}
		}
		if(kData == waitingFor)
		{
			char data[h.dataSize + 1];
			int ret = rt ? gSerialPipe.readRt(data, h.dataSize) : gSerialPipe.readNonRt(data, h.dataSize);
			if(ret <= 0)
				break;
			if(int(h.dataSize) != ret)
			{
				rt_fprintf(stderr, "Invalid number of bytes read from gSerialPipe. Expected: %u, got %u\n", h.dataSize, ret);
				break;
			}
			// changes to gSerial happen from within the audio
			// thread, so only the non-rt thread needs to lock
			std::unique_lock<RtMutex> lock(gSerialMutex, std::defer_lock);
			if(!rt)
				lock.lock();
			SerialStruct* s = nullptr;
			for(auto ss : gSerial)
			{
				if(ss->id == id)
					s = ss;
			}
			if(!rt)
				lock.unlock();
			if(!s)
			{
				rt_fprintf(stderr, "Couldn't find serial id \"%s\" in gSerial\n", id);
				return;
			}
			if(rt)
			{
				// rt: forward data from pipe to Pd
				data[h.dataSize] = '\0'; // ensure it's null-terminated
				if(h.dataSize)
				{
					const char* rec = "bela_serialIn";
					if(kSerialSymbol == s->type)
					{
						libpd_symbol(rec, data);
					} else if(kSerialBytes == s->type) {
						if(s->eom >= 0) {
							// messages are separated: send as a list
							libpd_start_message(h.dataSize);
							for(size_t n = 0; n < h.dataSize; ++n)
								libpd_add_float(data[n]);
							libpd_finish_message(rec, id);
						} else {
							// messages are not separated: send one byte at a time
							for(size_t n = 0; n < h.dataSize; ++n)
							{
								libpd_start_message(h.dataSize);
								libpd_add_float(data[n]);
								libpd_finish_message(rec, id);
							}
						}
					} else {
						unsigned int nTokens = 1;
						const uint8_t separators[] = { ' ', '\0'};
						// find number of delimiters
						size_t start = 0;
						for(size_t n = 0; n < sizeof(data); ++n)
						{
							for(size_t c = 0; c < sizeof(separators); ++c)
							{
								if(separators[c] == data[n] && n != start) // exclude empty tokens
								{
									start = n + 1;
									nTokens++;
								}
							}
						}
						libpd_start_message(nTokens);
						start = 0;
						for(size_t n = 0; n < sizeof(data); ++n)
						{
							bool end = false;
							for(size_t c = 0; c < sizeof(separators); ++c)
							{
								if(separators[c] == data[n])
								{
									if(start == n)
										start++; // remove empty tokens
									else
										end = true;
									break; // no need to check for more separators
								}
							}
							if(end)
							{
								data[n] = '\0'; // ensure the string is null-terminated so the next line works
								if(kSerialSymbols == s->type)
									libpd_add_symbol(data + start);
								else if (kSerialFloats == s->type)
									libpd_add_float(atof(data + start));
								start = n + 1;
							}
						}
						libpd_finish_message(rec, id);
					}
				}
			} else {
				// non-rt: forward data from pipe to serial
				if(h.dataSize)
					s->serial->write(data, h.dataSize);
			}
			waitingFor = kHeader;
		}
	}
}

static void serialOutputLoop(void* arg) {
	// blocking read with timeout
	gSerialPipe.setBlockingNonRt(true);
	gSerialPipe.setTimeoutMsNonRt(100);
	std::vector<uint8_t> rec(1024);
	std::vector<uint8_t> id(100);

	SerialPipeState serialStateNonRt {};
	while(!Bela_stopRequested())
	{
		processSerialPipe(false, serialStateNonRt);
	}
}

static void serialInputLoop(void* arg) {
	SerialStruct& s = *(SerialStruct*)arg;
	char serialBuffer[10000];
	unsigned int i = 0;
	serialMessageHeader h;
	h.idSize = strlen(s.id.c_str()) + 1;
	while(!Bela_stopRequested())
	{
		// read from the serial port with a timeout of 100ms
		int ret = s.serial->read(serialBuffer + i, sizeof(serialBuffer) - i, 100);
		if (ret > 0) {
			if(s.eom < 0)
			{
				h.dataSize = ret;
				// send everything immediately
				gSerialPipe.writeNonRt(h);
				gSerialPipe.writeNonRt(s.id.c_str(), h.idSize);
				gSerialPipe.writeNonRt(serialBuffer, h.dataSize);
			} else {
				// find EOM in new data
				unsigned int searchStart = i;
				unsigned int searchStop = searchStart + ret;
				unsigned int n;
				unsigned int lastSent = 0;
				bool found;
				do
				{
					found = false;
					for(n = searchStart; n < searchStop; ++n)
					{
						if(serialBuffer[n] == s.eom)
						{
							found = true;
							break;
						}
					}
					// if found, send all data till that point
					if(found)
					{
						h.dataSize = n - lastSent;
						if(h.dataSize)
						{
							gSerialPipe.writeNonRt(h);
							gSerialPipe.writeNonRt(s.id.c_str(), h.idSize);
							gSerialPipe.writeNonRt(serialBuffer + lastSent, h.dataSize);
						}
						searchStart = n + 1;
						lastSent += 1 + h.dataSize;
					}
				}
				while(found);
				// if we are left with any data, move it to the beginning of the buffer.
				// TODO: avoid this and use it as a circular buffer
				if(searchStart != i)
				{
					memmove(serialBuffer, serialBuffer + searchStart, searchStop - searchStart);
					i = searchStop - searchStart;
				} else
					i = i + searchStop - searchStart;
			}
		}
	}
}

#endif // BELA_LIBPD_SERIAL

enum { minFirstDigitalChannel = 10 };
static unsigned int gAnalogChannelsInUse;
static unsigned int gDigitalChannelsInUse;
static unsigned int gLibpdBlockSize;
static unsigned int gChannelsInUse;
//static const unsigned int gFirstAudioChannel = 0;
static unsigned int gFirstAnalogInChannel;
static unsigned int gFirstAnalogOutChannel;
static unsigned int gFirstDigitalChannel;
static unsigned int gLibpdDigitalChannelOffset;
static unsigned int gFirstScopeChannel;

float* gInBuf;
float* gOutBuf;
#ifdef BELA_LIBPD_MIDI
#define PARSE_MIDI
int gMidiVerbose = 1;
const int kMidiVerbosePrintLevel = 1;
#include <thread>

static Midi* openMidiDevice(const std::string& name, bool verboseSuccess = false, bool verboseError = false);
static const std::string& midiName(const Midi* m)
{
	// assumes input and output are the same subdevice
	if(m) {
		if(m->isInputEnabled())
			return m->getInputPort().name;
		else if(m->isOutputEnabled())
			return m->getOutputPort().name;
	}
	static const std::string none("NONE");
	return none;
}

static std::thread gMidiDiscoveryThread;
static volatile bool gMidiDiscoveryThreadShouldStop;
static volatile bool gMidiDiscoveryThreadAuto;
static bool gMidiAny;

Pipe gMidiDiscoveryPipe("midiDiscoveryPipe");
enum MidiDiscoveryCmd {
	kMidiAdd,
	kMidiAck,
};
struct MidiDiscoveryMsgFromNonRt {
	MidiDiscoveryCmd cmd;
	Midi* ptr;
};
struct MidiDiscoveryMsgFromRt {
	MidiDiscoveryCmd cmd;
	Midi* ptr;
	char name[32];
};

static volatile unsigned int gNumMidiDevicesInitialised = 0;
static void midiDiscovery()
{
	gMidiDiscoveryPipe.setBlockingNonRt(true);
	gMidiDiscoveryPipe.setTimeoutMsNonRt(100);
	// it's hard to use inotify meaningfully, so we poll instead
	auto shouldStop = []() {
		return Bela_stopRequested() || gMidiDiscoveryThreadShouldStop;
	};

	std::vector<std::string> toOpen;
	std::vector<Midi*> localMidi;
	std::vector<MidiDiscoveryMsgFromNonRt> msgs;
	int count = 1;
	bool doDiscovery = false;
	while(!shouldStop())
	{
		msgs.resize(0);
		if(gNumMidiDevicesInitialised == localMidi.size())
		{
			//printf("We are equal: %d\n", gNumMidiDevicesInitialised);
			// when we are fully synced up:
			if(doDiscovery && !toOpen.size() && gMidiDiscoveryThreadAuto)
			{
				doDiscovery = false;
				// do discovery
				auto list = Midi::listAllPorts();
				for(auto& l : list)
				{
					// Check if there are new devices that are not open yet.
					toOpen.push_back(l.name);
					// NOTE: devices that are unplugged and plugged back in
					// that were previously initialised will be automatically reopened,
					// so we are only concerned with new devices here.
				}
				count = 0;
			}
			while(toOpen.size())
			{
				std::string name = toOpen[0];
				toOpen.erase(toOpen.begin());
				bool found = false;
				for(const auto m : localMidi)
				{
					if(midiName(m) == name)
					{
						found = true;
						break;
					}
				}
				if(!found)
				{
					printf("New device %s, opening it\n", name.c_str());
					Midi* midi = openMidiDevice(name);
					if(midi) {
						MidiDiscoveryMsgFromNonRt msg =  {
							.cmd = kMidiAdd,
							.ptr = midi,
						};
						msgs.push_back(msg);
						gNumMidiDevicesInitialised++;
						break;
					}
				}
			}
		}
		if(count++ > 20)
			doDiscovery = true;
		for(auto& msg : msgs)
			gMidiDiscoveryPipe.writeNonRt(msg);
		MidiDiscoveryMsgFromRt msg;
		// potentially blocking read
		int ret = gMidiDiscoveryPipe.readNonRt(msg);
		if(1 == ret)
		{
			if(kMidiAck == msg.cmd)
			{
				localMidi.push_back(msg.ptr);
				void dumpMidi();
				dumpMidi();
			}
			if(kMidiAdd == msg.cmd)
				toOpen.push_back(msg.name);
		}
	}
}
static std::vector<Midi*> midi;

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
		printf("[%2d]%20s %3s %3s (%d-%d) %s\n",
			n,
			midiName(midi[n]).c_str(),
			midi[n]->isInputEnabled() ? "x" : "_",
			midi[n]->isOutputEnabled() ? "x" : "_",
			n * 16 + 1,
			n * 16 + 16,
			gMidiAny ? "(ANY)" : ""
		);
	}
}

static Midi* openMidiDevice(const std::string& name, bool verboseSuccess, bool verboseError)
{
	Midi* newMidi;
	newMidi = new Midi();
	newMidi->readFrom(name.c_str());
	newMidi->writeTo(name.c_str());
#ifdef PARSE_MIDI
	newMidi->enableParser(true);
#else
	newMidi->enableParser(false);
#endif /* PARSE_MIDI */
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
	// improper way of using ANY, maybe it should be sending out to all of them instead
	if(gMidiAny)
		return 0;
	unsigned int port = 0;
	while(*channel >= 16){
		*channel -= 16;
		port += 1;
	}
	return port;
}

void Bela_MidiOutNoteOn(int channel, int pitch, int velocity) {
	unsigned int port = getPortChannel(&channel);
	if(gMidiVerbose >= kMidiVerbosePrintLevel)
		rt_printf("noteout _ port: %d, channel: %d, pitch: %d, velocity %d\n", port, channel, pitch, velocity);
	port < midi.size() && midi[port]->writeNoteOn(channel, pitch, velocity);
}

void Bela_MidiOutControlChange(int channel, int controller, int value) {
	unsigned int port = getPortChannel(&channel);
	if(gMidiVerbose >= kMidiVerbosePrintLevel)
		rt_printf("ctlout _ port: %d, channel: %d, controller: %d, value: %d\n", port, channel, controller, value);
	port < midi.size() && midi[port]->writeControlChange(channel, controller, value);
}

void Bela_MidiOutProgramChange(int channel, int program) {
	unsigned int port = getPortChannel(&channel);
	if(gMidiVerbose >= kMidiVerbosePrintLevel)
		rt_printf("pgmout _ port: %d, channel: %d, program: %d\n", port, channel, program);
	port < midi.size() && midi[port]->writeProgramChange(channel, program);
}

void Bela_MidiOutPitchBend(int channel, int value) {
	unsigned int port = getPortChannel(&channel);
	if(gMidiVerbose >= kMidiVerbosePrintLevel)
		rt_printf("bendout _ port: %d, channel: %d, value: %d\n", port, channel, value);
	value += 8192; // correct for Pd's oddity
	port < midi.size() && midi[port]->writePitchBend(channel, value);
}

void Bela_MidiOutAftertouch(int channel, int pressure){
	unsigned int port = getPortChannel(&channel);
	if(gMidiVerbose >= kMidiVerbosePrintLevel)
		rt_printf("touchout _ port: %d, channel: %d, pressure: %d\n", port, channel, pressure);
	port < midi.size() && midi[port]->writeChannelPressure(channel, pressure);
}

void Bela_MidiOutPolyAftertouch(int channel, int pitch, int pressure){
	unsigned int port = getPortChannel(&channel);
	if(gMidiVerbose >= kMidiVerbosePrintLevel)
		rt_printf("polytouchout _ port: %d, channel: %d, pitch: %d, pressure: %d\n", port, channel, pitch, pressure);
	port < midi.size() && midi[port]->writePolyphonicKeyPressure(channel, pitch, pressure);
}

void Bela_MidiOutByte(int port, int byte){
	if(gMidiVerbose >= kMidiVerbosePrintLevel)
		rt_printf("port: %d, byte: %d\n", port, byte);
	if(port > (int)midi.size()){
		// if the port is out of range, redirect to the first port.
		rt_fprintf(stderr, "Port out of range, using port 0 instead\n");
		port = 0;
	}
	port < (int)midi.size() && midi[port]->writeOutput(byte);
}
#endif // BELA_LIBPD_MIDI

void Bela_printHook(const char *received){
	rt_printf("%s", received);
}

static DigitalChannelManager dcm;

void sendDigitalMessage(bool state, unsigned int delay, void* receiverName){
	libpd_float((const char*)receiverName, (float)state);
//	rt_printf("%s: %d\n", (char*)receiverName, state);
}

#ifdef BELA_LIBPD_TRILL
void setTrillPrintError()
{
	rt_fprintf(stderr, "bela_setTrill format is wrong. Should be:\n"
		"[mode <sensor_id> <prescaler_value>(\n"
		" or\n"
		"[threshold <sensor_id> <threshold_value>(\n"
		" or\n"
		"[prescaler <sensor_id> <prescaler_value>(\n");
}
#endif // BELA_LIBPD_TRILL

static void systemDoSystem(const char* cmd)
{
	rt_printf("system(\"%s\");\n", cmd);
	system(cmd);
}
#ifdef BELA_LIBPD_SYSTEM_THREADED
#include <AuxTaskNonRT.h>
static AuxTaskNonRT systemTask("systemTask", [](const void* buf, int size) {
	systemDoSystem((const char*)buf);
});

#endif // BELA_LIBPD_SYSTEM_THREADED

static void belaSystem(const char* first, int argc, t_atom* argv)
{
	static std::string cmd; // make it static to try and avoid repeated allocations
	cmd = first ? first : "";
	for(size_t n = 0; n < argc; ++n)
	{
		if(0 != n || first)
			cmd += " ";
		if(libpd_is_float(argv + n)) {
			float arg = libpd_get_float(argv + n);
			if(arg == (int)arg)
				cmd += std::to_string((int)arg);
			else
				cmd += std::to_string(arg);
		} else if(libpd_is_symbol(argv + n)) {
			cmd += libpd_get_symbol(argv + n);
		} else {
			rt_fprintf(stderr, "Error: argument %d of bela_system is not a float or symbol. Command so far: '%s', this will be discarded\n", n, cmd.c_str());
			return;
		}
	}
#ifdef BELA_LIBPD_SYSTEM_THREADED
	systemTask.schedule(cmd.c_str(), cmd.size());
#else // BELA_LIBPD_SYSTEM_THREADED
	systemDoSystem(cmd.c_str());
#endif // // BELA_LIBPD_SYSTEM_THREADED
}

void Bela_listHook(const char *source, int argc, t_atom *argv)
{
	if(settings.listHook)
	{
		if(0 == settings.listHook(source, argc, argv))
			return;
	}
#ifdef BELA_LIBPD_GUI
	if(0 == strcmp(source, "bela_guiOut"))
	{
		if(!libpd_is_float(&argv[0]))
		{
			rt_fprintf(stderr, "Wrong format for bela_gui, the first element should be a float\n");
			return;
		}
		unsigned int bufNum = libpd_get_float(&argv[0]);
		if(libpd_is_float(&argv[1])) // if the first element is a float, we send an array of floats
		{
			float buf[argc - 1];
			for(int n = 1; n < argc; ++n)
			{
				t_atom *a = &argv[n];
				if(!libpd_is_float(a))
				{
					rt_fprintf(stderr, "Wrong format for bela_gui\n"); // this should never happen, because then the selector would've not been "float"
					return;
				}
				buf[n - 1] = libpd_get_float(a);
			}
			gui.sendBuffer(bufNum, buf, argc - 1);
			return;
		} else { // otherwise we send each element of the list separately
			for(int n = 1; n < argc; ++n)
			{
				t_atom *a = &argv[n];
				if (libpd_is_float(a)) {
					float x = libpd_get_float(a);
					gui.sendBuffer(bufNum, x);
				} else if (libpd_is_symbol(a)) {
					const char *s = libpd_get_symbol(a);
					gui.sendBuffer(bufNum, s, strlen(s)); // TODO: should it be strlen(s)+1?
				}
			}
		}
		return;
	}
#endif // BELA_LIBPD_GUI
	if(0 == strcmp(source, "bela_system"))
	{
		belaSystem(nullptr, argc, argv);
		return;
	}
}
void Bela_messageHook(const char *source, const char *symbol, int argc, t_atom *argv){
	if(settings.messageHook)
	{
		if(0 == settings.messageHook(source, symbol, argc, argv))
			return;
	}
#ifdef BELA_LIBPD_MIDI
	if(strcmp(source, "bela_setMidi") == 0)
	{
		if(0 == strcmp("verbose", symbol))
		{
			if(1 != argc || !libpd_is_float(argv))
			{
				rt_fprintf(stderr, "Wrong format for bela_setMidi, expected: [verbose <n>(\n");
			} else {
				gMidiVerbose = libpd_get_float(argv);
				rt_printf("MIDI verbose: %d\n", gMidiVerbose);
			}
			return;
		}
		if(0 == strcmp("auto", symbol))
		{
			if(!gMidiDiscoveryThread.joinable())
				gMidiDiscoveryThread = std::thread(midiDiscovery);
			bool value = true;
			if(argc && libpd_is_float(argv))
				value = libpd_get_float(argv);
			rt_printf("%s automatic discover of new MIDI devices\n", value ? "Enabling" : "Disabling");
			gMidiDiscoveryThreadAuto = value;
			return;
		}
		if(0 == strcmp("any", symbol))
		{
			bool value = true;
			if(argc && libpd_is_float(argv))
				value = libpd_get_float(argv);
			rt_printf("%s MIDI any\n", value ? "Enabling" : "Disabling");
			gMidiAny = value;
			return;
		}
		int num[3] = {0, 0, 0};
		for(int n = 0; n < argc && n < 3; ++n)
		{
			if(!libpd_is_float(&argv[n]))
			{
				fprintf(stderr, "Wrong format for bela_setMidi, expected:[hw 1 0 0(");
				return;
			}
			num[n] = libpd_get_float(&argv[n]);
		}
		// TODO: this string/stream business is not actually realtime-safe.
		std::ostringstream deviceName;
		deviceName << symbol << ":" << num[0] << "," << num[1] << "," << num[2];
		MidiDiscoveryMsgFromRt msg = {
				.cmd = kMidiAdd,
			};
		std::string name = deviceName.str();
		if(name.size() + 1 > sizeof(msg.name)) {
			fprintf(stderr, "MIDI name too long: %s\n", name.c_str());
			return;
		}
		strncpy(msg.name, deviceName.str().c_str(), sizeof(msg.name));
		gMidiDiscoveryPipe.writeRt(msg);
		return;
	}
#endif // BELA_LIBPD_MIDI
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
		int channel = libpd_get_float(&argv[0]) - gLibpdDigitalChannelOffset;
		if(disable == true){
			dcm.unmanage(channel);
			return;
		}
		if(argc >= 2){
			t_atom* a = &argv[1];
			if(libpd_is_symbol(a)){
				const char *s = libpd_get_symbol(a);
				if(strcmp(s, "~") == 0  || strncmp(s, "sig", 3) == 0){
					isMessageRate = false;
				}
			}
		}
		dcm.manage(channel, direction, isMessageRate);
		return;
	}
	if(strcmp(source, "bela_system") == 0){
		belaSystem(symbol, argc, argv);
		return;
	}
	if(strcmp(source, "bela_control") == 0){
		if(strcmp("stop", symbol) == 0){
			rt_printf("bela_control: stop\n");
			Bela_requestStop();
		}
		return;
	}
#ifdef BELA_LIBPD_GUI
	if(0 == strcmp(source, "bela_setGui"))
	{
		if(0 == strcmp(symbol, "new"))
		{
			if(
				argc < 2
				|| !libpd_is_symbol(argv)
				|| !libpd_is_symbol(argv + 1)
			)
			{
				return;
			}
			const char* mode = libpd_get_symbol(argv);
			const char* name = libpd_get_symbol(argv + 1);
			if(0 == strcmp(mode, "control"))
			{
				gGuiControlBuffers.emplace_back(name);
				return;
			}
			if(0 == strcmp(mode, "array"))
			{
				// because of
				// https://github.com/libpd/libpd/issues/274
				// (again), we cannot access the arrays right
				// here (as it would deadlock on loadbang), so
				// we have to defer creation of the Gui
				// buffers until render() runs
				gGuiDataBuffers.emplace_back(bufferDescription{.name = name, .id = -1, .size = 0});
				return;
			}
			return;
		}
	}
#endif // BELA_LIBPD_GUI
#ifdef BELA_LIBPD_SERIAL
	if(0 == strcmp(source, "bela_setSerial"))
	{
		if(0 == strcmp(symbol, "new"))
		{
			if(
				argc < 5
				|| !libpd_is_symbol(argv + 0) // serial_id
				|| !libpd_is_symbol(argv + 1) // device
				|| !libpd_is_float(argv + 2) // baudrate
				|| !(libpd_is_symbol(argv + 3) || libpd_is_float(argv + 3)) // EOM
				|| !libpd_is_symbol(argv + 4) // type
			)
			{
				fprintf(stderr, "Invalid bela_setSerial arguments. Should be:\n"
				"`new serial_id device baudrate EOM type`,\n"
				"where `EOM` is one of `newline` or `none` or a character (expressed as an integer"
				"       between 0 and 255)\n"
				"and `type` is one of `bytes`, `floats`, `symbol`, `symbols`\n");
				return;
			}
			const char* id = libpd_get_symbol(argv + 0);
			const char* device = libpd_get_symbol(argv + 1);
			unsigned int baudrate = libpd_get_float(argv + 2);
			int eom = -1;
			if(libpd_is_symbol(argv + 3)) {
				const char* eomChar = libpd_get_symbol(argv + 3);
				if(0 == strcmp(eomChar, "newline"))
					eom = '\n';
			} else if(libpd_is_float(argv + 3)) {
				eom = libpd_get_float(argv + 3);
			}
			const char* typeChar = libpd_get_symbol(argv + 4);
			enum SerialType type = kSerialFloats;
			if(0 == strcmp("floats", typeChar))
				type = kSerialFloats;
			else if(0 == strcmp("bytes", typeChar))
				type = kSerialBytes;
			else if(0 == strcmp("symbol", typeChar))
				type = kSerialSymbol;
			else if(0 == strcmp("symbols", typeChar))
				type = kSerialSymbols;
			Serial* serial = new Serial;
			if(serial->setup(device, baudrate))
			{
				delete serial;
				return;
			}
			SerialStruct* serialStruct = new SerialStruct {
				serial,
				id,
				eom,
				type,
			};
			std::unique_lock<RtMutex> lock(gSerialMutex);
			gSerial.push_back(serialStruct);
			lock.unlock();
			// a dedicated input loop for each serial device
			Bela_scheduleAuxiliaryTask(Bela_createAuxiliaryTask(serialInputLoop, 0, ("in." + std::string(device)).c_str(), (void*)serialStruct));
			// a single output loop for all serial devices, started when the first one is created
			if(gSerial.size() == 1)
				Bela_scheduleAuxiliaryTask(Bela_createAuxiliaryTask(serialOutputLoop, 0, "serial-output-loop"));
		}
	}
	if(0 == strcmp(source, "bela_serialOut"))
	{
		if(!argc) {
			fprintf(stderr, "Invalid bela_serialOut arguments. Should be:\n"
			"`serial_id firstByte <other bytes>`\n");
			return;
		}
		const char* id = symbol;
		// convert floats to bytes
		char data[argc];
		for(size_t n = 0; n < argc; ++n)
		{
			t_atom *a = argv + n;
			if(libpd_is_float(a))
			{
				data[n] = libpd_get_float(a);
			} else {
				fprintf(stderr, "bela_serialOut received non-float\n");
				return;
			}
		}
		struct serialMessageHeader h;
		h.idSize = strlen(id);
		h.dataSize = sizeof(data);
		gSerialPipe.writeRt(h);
		gSerialPipe.writeRt(id, h.idSize);
		gSerialPipe.writeRt(data, h.dataSize);
	}
#endif // BELA_LIBPD_SERIAL
#ifdef BELA_LIBPD_TRILL
	if(0 == strcmp(source, "bela_setTrill"))
	{
		if(0 == strcmp(symbol, "new"))
		{
			bool err = false;

			uint8_t address = 0xff;
			if(argc < 3)
				err = true;
			else if (!libpd_is_symbol(argv) // sensor_id
				|| !libpd_is_float(argv + 1) // bus
				|| !libpd_is_symbol(argv + 2) // device
			)
				err = true;
			if(argc >= 4)
			{
				if(libpd_is_float(argv + 3))
					address = libpd_get_float(argv + 3);
				else
					err = true;
			}
			if(err)
			{
				rt_fprintf(stderr, "bela_setTrill wrong format. Should be:\n"
					"[new <sensor_id> <bus> <device> <address>(\n");
				return;
			}
			const char* name = libpd_get_symbol(argv);
			unsigned int bus = libpd_get_float(argv + 1);
			const char* deviceString = libpd_get_symbol(argv + 2);
			Trill::Device device = Trill::getDeviceFromName(deviceString);

			Trill* trill = new Trill(bus, device, address);
			if(Trill::NONE == trill->deviceType())
			{
				rt_fprintf(stderr, "Unable to create Trill %s device `%s` on bus %u at ", deviceString, name, bus);
				if(128 < address)
					rt_fprintf(stderr, "default address. ");
				else
					rt_fprintf(stderr, "address: %#x (%d). ", address, address);
				rt_fprintf(stderr, "Is the device connected?\n");
				return;
			}
			gTouchSensors.emplace_back(std::string(name), trill);
			gTrillAcks.push_back(name);
			//an ack is sent to Pd during the next audio callback because of https://github.com/libpd/libpd/issues/274
			return;
		}
		if(argc < 1 || !libpd_is_symbol(argv))
		{
			rt_fprintf(stderr, "bela_setTrill: wrong format. It should be\n"
					"[<command> <sensor_id> ...(");
			return;
		}
		const char* sensorId = libpd_get_symbol(argv);
		int idx = getIdxFromId(sensorId, gTouchSensors);
		if(idx < 0)
		{
			rt_fprintf(stderr, "bela_setTrill sensor_id unknown: %s\n", sensorId);
			return;
		}
		if(0 == strcmp(symbol, "updateBaseline"))
		{
			gTouchSensors[idx].second->updateBaseline();
			return;
		}
		if(0 == strcmp(symbol, "mode"))
		{
			if(argc < 2
				|| !libpd_is_symbol(argv)
				|| !libpd_is_symbol(argv + 1)
			) {
				setTrillPrintError();
				return;
			}
			const char* modeString = libpd_get_symbol(argv + 1);
			Trill::Mode mode = Trill::getModeFromName(modeString);
			gTouchSensors[idx].second->setMode(mode);
		}
		if(
			0 == strcmp(symbol, "threshold")
			|| 0 == strcmp(symbol, "prescaler")
		)
		{
			if(
				argc < 2
				|| !libpd_is_symbol(argv)
				|| !libpd_is_float(argv + 1)
			  ) {
				setTrillPrintError();
				return;
			}
			float value = libpd_get_float(argv + 1);
			if(0 == strcmp(symbol, "threshold"))
			{
				gTouchSensors[idx].second->setNoiseThreshold(value);
			}
			if(0 == strcmp(symbol, "prescaler"))
			{
				if(Trill::prescalerMax < value || 0 > value)
				{
					if(0 == value)
						value = 0;
					if(Trill::prescalerMax < value)
						value = Trill::prescalerMax;
					rt_printf("bela_setTrill prescaler value out of range, clipping to %.0f\n", value);
				}
				gTouchSensors[idx].second->setPrescaler(value);
			}
			return;
		}
		return;
	}
#endif // BELA_LIBPD_TRILL
}

void Bela_floatHook(const char *source, float value){
	if(settings.floatHook)
	{
		if(0 == settings.floatHook(source, value))
			return;
	}
	// let's make this as optimized as possible for built-in digital Out parsing
	// the built-in digital receivers are of the form "bela_digitalOutXX" where XX is between gLibpdDigitalChannelOffset and (gLibpdDigitalCHannelOffset+gDigitalChannelsInUse)
	static int prefixLength = strlen("bela_digitalOut");
	if(strncmp(source, "bela_digitalOut", prefixLength)==0){
		if(source[prefixLength] != 0){ //the two ifs are used instead of if(strlen(source) >= prefixLength+2)
			if(source[prefixLength + 1] != 0){
				// quickly convert the suffix to integer, assuming they are numbers, avoiding to call atoi
				int receiver = ((source[prefixLength] - 48) * 10);
				receiver += (source[prefixLength+1] - 48);
				unsigned int channel = receiver - gLibpdDigitalChannelOffset; // go back to the actual Bela digital channel number
				if(channel < gDigitalChannelsInUse){ //number of digital channels
					dcm.setValue(channel, value);
				}
			}
		}
		return;
	}
}



std::vector<std::string> gReceiverInputNames;
std::vector<std::string> gReceiverOutputNames;
void generateDigitalNames(unsigned int numDigitals, unsigned int libpdOffset, std::vector<std::string>& receiverInputNames, std::vector<std::string>& receiverOutputNames)
{
	std::string inBaseString = "bela_digitalIn";
	std::string outBaseString = "bela_digitalOut";
	for(unsigned int i = 0; i<numDigitals; i++)
	{
		receiverInputNames.push_back(inBaseString + std::to_string(i+libpdOffset));
		receiverOutputNames.push_back(outBaseString + std::to_string(i+libpdOffset));
	}
}

void printDigitalNames(std::vector<std::string>& receiverInputNames, std::vector<std::string>& receiverOutputNames)
{
	printf("DIGITAL INPUTS\n");
	for(unsigned int i=0; i<gDigitalChannelsInUse; i++)
		printf("%s\n", receiverInputNames[i].c_str());
	printf("DIGITAL OUTPUTS\n");
	for(unsigned int i=0; i<gDigitalChannelsInUse; i++)
		printf("%s\n", receiverOutputNames[i].c_str());
}

static char multiplexerArray[] = {"bela_multiplexer"};
static int multiplexerArraySize = 0;
static bool pdMultiplexerActive = false;

#ifdef BELA_LIBPD_IO_THREADED
void fdLoop(void* arg){
	while(!Bela_stopRequested()){
		if(!sys_doio(pd_this))
			usleep(3000);
	}
}
#endif // BELA_LIBPD_IO_THREADED

#ifdef BELA_LIBPD_SCOPE
Scope scope;
std::vector<float> gScopeOut;
#endif // BELA_LIBPD_SCOPE
void* gPatch;
bool gDigitalEnabled = 0;

bool BelaLibpd_setup(BelaContext *context, void *userData, const BelaLibpdSettings& settings)
{
	::settings = settings;
#ifdef BELA_LIBPD_GUI
	if(settings.useGui)
	{
		int ret = gui.setup(context->projectName);
		gui.setControlDataCallback(guiControlDataCallback, nullptr);
		ret = ret || !gGuiPipe.setup("guiControlPipe", 16384);
		if(ret)
		{
			fprintf(stderr, "Error starting gui: %d\n", ret);
			::settings.useGui = false;
		}
	}
#endif // BELA_LIBPD_GUI
#ifdef BELA_LIBPD_SERIAL
	gSerialPipe.setup("serialPipe", 16384);
#endif // BELA_LIBPD_SERIAL
	// Check Pd's version
	int major, minor, bugfix;
	sys_getversion(&major, &minor, &bugfix);
	printf("Running Pd %d.%d-%d\n", major, minor, bugfix);
	// We requested in Bela_userSettings() to have uniform sampling rate for audio
	// and analog and non-interleaved buffers.
	// So let's check this actually happened
	if(context->analogSampleRate != context->audioSampleRate)
	{
		fprintf(stderr, "The sample rate of analog and audio must match. Try running with --uniform-sample-rate\n");
		return false;
	}
	if(context->flags & BELA_FLAG_INTERLEAVED)
	{
		fprintf(stderr, "The audio and analog channels must be interleaved.\n");
		return false;
	}

	if(context->digitalFrames > 0 && context->digitalChannels > 0)
		gDigitalEnabled = 1;

#ifdef BELA_LIBPD_MIDI
	// add here other devices you need 
	std::vector<std::string> midiPortNames;
	midiPortNames.push_back("hw:1,0,0");
	//midiPortNames.push_back("hw:0,0,0");
#endif // BELA_LIBPD_MIDI
#ifdef BELA_LIBPD_SCOPE
	if(settings.scopeChannels)
	{
		scope.setup(settings.scopeChannels, context->audioSampleRate);
		gScopeOut.resize(settings.scopeChannels);
	}
#endif // BELA_LIBPD_SCOPE

	// Check first of all if the patch file exists. Will actually open it later.
	char file[] = "_main.pd";
	char folder[] = "./";
	std::string path = std::string(folder) + file;
	if(access(path.c_str(), F_OK) == -1 ) {
		printf("Error file %s not found. The %s file should be your main patch.\n", path.c_str(), file);
		return false;
	}

	// analog setup
	gAnalogChannelsInUse = context->analogInChannels;
	gDigitalChannelsInUse = context->digitalChannels;
	printf("Audio channels in use: %d\n", context->audioOutChannels);
	printf("Analog channels in use: %d\n", gAnalogChannelsInUse);
	printf("Digital channels in use: %d\n", gDigitalChannelsInUse);

	// Channel distribution
	gFirstAnalogInChannel = std::max(context->audioInChannels, context->audioOutChannels);
	gFirstAnalogOutChannel = gFirstAnalogInChannel;
	gFirstDigitalChannel = gFirstAnalogInChannel + std::max(context->analogInChannels, context->analogOutChannels);
	if(gFirstDigitalChannel < minFirstDigitalChannel)
		gFirstDigitalChannel = minFirstDigitalChannel; //for backwards compatibility
	gLibpdDigitalChannelOffset = gFirstDigitalChannel + 1;
	gFirstScopeChannel = gFirstDigitalChannel + gDigitalChannelsInUse;

	gChannelsInUse = gFirstScopeChannel + settings.scopeChannels;
	
	// Create receiverNames for digital channels
	generateDigitalNames(gDigitalChannelsInUse, gLibpdDigitalChannelOffset, gReceiverInputNames, gReceiverOutputNames);
	
	// digital setup
	if(gDigitalEnabled)
	{
		dcm.setCallback(sendDigitalMessage);
		if(gDigitalChannelsInUse > 0){
			for(unsigned int ch = 0; ch < gDigitalChannelsInUse; ++ch){
				dcm.setCallbackArgument(ch, (void*) gReceiverInputNames[ch].c_str());
			}
		}
	}

#ifdef BELA_LIBPD_MIDI
	gMidiDiscoveryThread = std::thread(midiDiscovery);
	unsigned int numValidDevices = 0;
	for(const auto & name : midiPortNames)
	{
		MidiDiscoveryMsgFromRt msg;
		msg.cmd = kMidiAdd;
		strncpy(msg.name, name.c_str(), sizeof(msg.name));
		gMidiDiscoveryPipe.writeRt(msg);
		numValidDevices++;
	}
	midi.reserve(numValidDevices + 10); // hope we can avoid reallocation for a while
#endif // BELA_LIBPD_MIDI

	// check that we are not running with a blocksize smaller than gLibPdBlockSize
	gLibpdBlockSize = libpd_blocksize();
	if(context->audioFrames < gLibpdBlockSize){
		fprintf(stderr, "Error: minimum block size must be %d\n", gLibpdBlockSize);
		return false;
	}

	// set hooks before calling libpd_init
	libpd_set_printhook(Bela_printHook);
	libpd_set_floathook(Bela_floatHook);
	libpd_set_listhook(Bela_listHook);
	libpd_set_messagehook(Bela_messageHook);
#ifdef BELA_LIBPD_MIDI
	libpd_set_noteonhook(Bela_MidiOutNoteOn);
	libpd_set_controlchangehook(Bela_MidiOutControlChange);
	libpd_set_programchangehook(Bela_MidiOutProgramChange);
	libpd_set_pitchbendhook(Bela_MidiOutPitchBend);
	libpd_set_aftertouchhook(Bela_MidiOutAftertouch);
	libpd_set_polyaftertouchhook(Bela_MidiOutPolyAftertouch);
	libpd_set_midibytehook(Bela_MidiOutByte);
#endif // BELA_LIBPD_MIDI

	//initialize libpd. This clears the search path
	libpd_init();
	//Add the current folder to the search path for externals
	libpd_add_to_search_path(".");
	libpd_add_to_search_path("../pd-externals");

	libpd_init_audio(gChannelsInUse, gChannelsInUse, context->audioSampleRate);
	gInBuf = get_sys_soundin();
	gOutBuf = get_sys_soundout();

	// start DSP:
	// [; pd dsp 1(
	libpd_start_message(1);
	libpd_add_float(1.0f);
	libpd_finish_message("pd", "dsp");

	// Bind your receivers here
	for(unsigned int i = 0; i < gDigitalChannelsInUse; i++)
		libpd_bind(gReceiverOutputNames[i].c_str());
	libpd_bind("bela_setDigital");
	libpd_bind("bela_control");
	libpd_bind("bela_system");
#ifdef BELA_LIBPD_MIDI
	libpd_bind("bela_setMidi");
#endif // BELA_LIBPD_MIDI
#ifdef BELA_LIBPD_GUI
	if(settings.useGui)
	{
		libpd_bind("bela_guiOut");
		libpd_bind("bela_setGui");
	}
#endif // BELA_LIBPD_GUI
#ifdef BELA_LIBPD_SERIAL
	libpd_bind("bela_serialOut");
	libpd_bind("bela_setSerial");
#endif // BELA_LIBPD_SERIAL
#ifdef BELA_LIBPD_TRILL
	libpd_bind("bela_setTrill");
#endif // BELA_LIBPD_TRILL
	for(auto& s : settings.bindSymbols)
		libpd_bind(s.c_str());

	// open patch:
	gPatch = libpd_openfile(file, folder);
	if(gPatch == NULL){
		printf("Error: file %s/%s is corrupted.\n", folder, file); 
		return false;
	}

	// If the user wants to use the multiplexer capelet,
	// the patch will have to contain an array called "bela_multiplexer"
	// and a receiver [r bela_multiplexerChannels]
	if(context->multiplexerChannels > 0 && libpd_arraysize(multiplexerArray) >= 0){
		pdMultiplexerActive = true;
		multiplexerArraySize = context->multiplexerChannels * context->analogInChannels;
		// [; bela_multiplexer ` multiplexerArraySize` resize(
		libpd_start_message(1);
		libpd_add_float(multiplexerArraySize);
		libpd_finish_message(multiplexerArray, "resize");
		// [; bela_multiplexerChannels `context->multiplexerChannels`(
		libpd_float("bela_multiplexerChannels", context->multiplexerChannels);
	}

	// Tell Pd that we will manage the io loop,
	// and we do so in an Auxiliary Task
#ifdef BELA_LIBPD_IO_THREADED
	if(settings.useIoThreaded)
	{
		sys_dontmanageio(1);
		AuxiliaryTask fdTask;
		fdTask = Bela_createAuxiliaryTask(fdLoop, 50, "libpd-fdTask", NULL);
		Bela_scheduleAuxiliaryTask(fdTask);
	}
#endif // BELA_LIBPD_IO_THREADED

	dcm.setVerbose(false);
#ifdef BELA_LIBPD_TRILL
	gTrillTask = Bela_createAuxiliaryTask(readTouchSensors, 51, "touchSensorRead", NULL);
	gTrillPipe.setup("trillPipe", 1024);
#endif // BELA_LIBPD_TRILL
	return true;
}

void BelaLibpd_render(BelaContext *context, void *userData)
{
#ifdef BELA_LIBPD_GUI
	if(settings.useGui)
	{
		while(gGuiControlBuffers.size()) // this won't change within the loop, but it's good not to have to use a separate flag
		{
			static struct guiControlMessageHeader header;
			static bool waitingForHeader = true;
			if(waitingForHeader)
			{
				int ret = gGuiPipe.readRt(header);
				if(1 != ret)
					break;
				else
					waitingForHeader = false;
			}
			if(!waitingForHeader)
			{
				char payload[header.size + ('s' == header.type)]; // + 1 to add null termination if needed
				int ret = gGuiPipe.readRt(&payload[0], header.size);
				if(int(header.size) != ret)
				{
					break;
				}
				const char* name = gGuiControlBuffers[header.id].c_str();
				if('f' == header.type)
				{
					if(header.size != sizeof(float))
					{
						rt_fprintf(stderr, "Unexpected message length for float: %u\n", header.size);
						continue;
					}
					float value;
					memcpy(&value, payload, sizeof(value));
					libpd_start_message(1);
					libpd_add_float(value);
					libpd_finish_message("bela_guiControl", name);
				}
				if('s' == header.type)
				{
					// add null termination
					payload[header.size] = '\0';
					// send to Pd
					libpd_start_message(1);
					libpd_add_symbol(payload);
					libpd_finish_message("bela_guiControl", name);
				}
				waitingForHeader = true;
			}
		}
		for(auto& b : gGuiDataBuffers)
		{
			int id = b.id;
			int size = b.size;
			const char* name = b.name.c_str();
			if(id < 0)
			{
				// initialize
				size = libpd_arraysize(name);
				if(size <= 0)
				{
					continue;
				} else {
					// this is thread-unsafe: what happens if this causes reallocation while the Gui thread is writing to a buffer?
					id = gui.setBuffer('f', size);
					b.id = id;
					b.size = size;
					DataBuffer& dataBuffer = gui.getDataBuffer(id);
					// initialize gui buffer with the initial content of the array
					libpd_read_array(dataBuffer.getAsFloat(), b.name.c_str(), 0, size);
				}
			}
			DataBuffer& dataBuffer = gui.getDataBuffer(b.id);
			libpd_write_array(b.name.c_str(), 0, dataBuffer.getAsFloat(), dataBuffer.getNumElements());
		}
	}
#endif // BELA_LIBPD_GUI
#ifdef BELA_LIBPD_SERIAL
	static SerialPipeState serialPipeStateRt {};
	if(gSerial.size())
		processSerialPipe(true, serialPipeStateRt);
#endif // BELA_LIBPD_SERIAL
#ifdef BELA_LIBPD_TRILL
	for(auto& name : gTrillAcks)
	{
		unsigned int idx = getIdxFromId(name.c_str(), gTouchSensors);
		libpd_start_message(3);
		libpd_add_symbol(Trill::getNameFromDevice(gTouchSensors[idx].second->deviceType()).c_str());
		libpd_add_float(gTouchSensors[idx].second->getAddress());
		libpd_add_symbol(Trill::getNameFromMode(gTouchSensors[idx].second->getMode()).c_str());
		libpd_finish_message("bela_trillCreated", name.c_str());
	}
	gTrillAcks.resize(0);
	bool doTrill = false;
	for(auto& t : gTouchSensors)
	{
		if(Trill::NONE != t.second->deviceType())
		{
			doTrill = true;
			break;
		}
	}
	if(doTrill)
	{
		int idx;
		while(gTrillPipe.readRt(idx) > 0)
		{
			Trill& touchSensor = *gTouchSensors[idx].second;
			const char* sensorId = gTouchSensors[idx].first.c_str();
			if(Trill::Device::NONE == touchSensor.deviceType())
				continue;

			const Trill::Mode mode = touchSensor.getMode();
			if(Trill::DIFF == mode || Trill::RAW == mode || Trill::BASELINE == mode)
			{
				libpd_start_message(touchSensor.getNumChannels());
				for(unsigned int n = 0; n < touchSensor.getNumChannels(); ++n)
				{
					libpd_add_float(touchSensor.rawData[n]);
				}
			} else if(Trill::CENTROID == mode)
			{
				if(touchSensor.is1D()) {
					libpd_start_message(2 * touchSensor.getNumTouches() + 1);
					libpd_add_float(touchSensor.getNumTouches());
					for(unsigned int i = 0; i < touchSensor.getNumTouches(); i++) {
						libpd_add_float(touchSensor.touchLocation(i));
						libpd_add_float(touchSensor.touchSize(i));
					}
				} else if (touchSensor.is2D()) {
					int numTouches = touchSensor.compoundTouchSize() > 0;
					libpd_start_message(2 * numTouches + 1);
					libpd_add_float(numTouches > 0);
					if(numTouches)
					{
						libpd_add_float(touchSensor.compoundTouchHorizontalLocation());
						libpd_add_float(touchSensor.compoundTouchLocation());
						libpd_add_float(touchSensor.compoundTouchSize());
					}
				}
			}
			else
				continue;
			libpd_finish_message("bela_trill", sensorId);
		}

		static unsigned int count = 0;
		unsigned int readIntervalSamples = touchSensorSleepInterval * context->audioSampleRate;
		count += context->audioFrames;
		if(count > readIntervalSamples)
		{
			Bela_scheduleAuxiliaryTask(gTrillTask);
			count -= readIntervalSamples;
		}
	}
#endif // BELA_LIBPD_TRILL
#ifdef BELA_LIBPD_MIDI
	static unsigned int localNumMidiDevices = 0;
	if(localNumMidiDevices != gNumMidiDevicesInitialised)
	{
		MidiDiscoveryMsgFromNonRt msg;
		while(1 == gMidiDiscoveryPipe.readRt(msg))
		{
			if(kMidiAdd == msg.cmd)
			{
				midi.push_back(msg.ptr);
				MidiDiscoveryMsgFromRt res;
				res.cmd = kMidiAck;
				res.ptr = msg.ptr;
				gMidiDiscoveryPipe.writeRt(res);
				localNumMidiDevices++;
			}
		}
	}
#ifdef PARSE_MIDI
	int num;
	for(unsigned int port = 0; port < midi.size(); ++port){
		while((num = midi[port]->getParser()->numAvailableMessages()) > 0){
			static MidiChannelMessage message;
			message = midi[port]->getParser()->getNextChannelMessage();
			if(gMidiVerbose >= kMidiVerbosePrintLevel)
			{
				rt_printf("On port %d (%s): ", port, midiName(midi[port]).c_str());
				message.prettyPrint(); // use this to print beautified message (channel, data bytes)
			}

			int channel = message.getChannel();
			if(!gMidiAny)
				channel += port * 16;
			switch(message.getType()){
				case kmmNoteOn:
				{
					int noteNumber = message.getDataByte(0);
					int velocity = message.getDataByte(1);
					libpd_noteon(channel, noteNumber, velocity);
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
					libpd_noteon(channel, noteNumber, 0);
					break;
				}
				case kmmControlChange:
				{
					int controller = message.getDataByte(0);
					int value = message.getDataByte(1);
					libpd_controlchange(channel, controller, value);
					break;
				}
				case kmmProgramChange:
				{
					int program = message.getDataByte(0);
					libpd_programchange(channel, program);
					break;
				}
				case kmmPolyphonicKeyPressure:
				{
					int pitch = message.getDataByte(0);
					int value = message.getDataByte(1);
					libpd_polyaftertouch(channel, pitch, value);
					break;
				}
				case kmmChannelPressure:
				{
					int value = message.getDataByte(0);
					libpd_aftertouch(channel, value);
					break;
				}
				case kmmPitchBend:
				{
					int value =  ((message.getDataByte(1) << 7)| message.getDataByte(0)) - 8192;
					libpd_pitchbend(channel, value);
					break;
				}
				case kmmSystem:
				// currently Bela only handles sysrealtime, and it does so pretending it is a channel message with no data bytes, so we have to re-assemble the status byte
				{
					int status = message.getStatusByte();
					int byte = channel | status;
					libpd_sysrealtime(port, byte);
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
#endif // BELA_LIBPD_MIDI
	unsigned int numberOfPdBlocksToProcess = context->audioFrames / gLibpdBlockSize;

	// Remember: we have non-interleaved buffers and the same sampling rate for
	// analogs, audio and digitals
	for(unsigned int tick = 0; tick < numberOfPdBlocksToProcess; ++tick)
	{
		//audio input
		for(unsigned int n = 0; n < context->audioInChannels; ++n)
		{
			memcpy(
				gInBuf + n * gLibpdBlockSize,
				context->audioIn + tick * gLibpdBlockSize + n * context->audioFrames, 
				sizeof(context->audioIn[0]) * gLibpdBlockSize
			);
		}

		// analog input
		for(unsigned int n = 0; n < context->analogInChannels; ++n)
		{
			memcpy(
				gInBuf + gLibpdBlockSize * gFirstAnalogInChannel + n * gLibpdBlockSize,
				context->analogIn + tick * gLibpdBlockSize + n * context->analogFrames, 
				sizeof(context->analogIn[0]) * gLibpdBlockSize
			);
		}
		// multiplexed analog input
		if(pdMultiplexerActive)
		{
			// we do not disable regular analog inputs if muxer is active, because user may have bridged them on the board and
			// they may be using half of them at a high sampling-rate
			static int lastMuxerUpdate = 0;
			if(++lastMuxerUpdate == multiplexerArraySize){
				lastMuxerUpdate = 0;
				libpd_write_array(multiplexerArray, 0, (float *const)context->multiplexerAnalogIn, multiplexerArraySize);
			}
		}

		unsigned int digitalFrameBase = gLibpdBlockSize * tick;
		unsigned int j;
		unsigned int k;
		float* p0;
		float* p1;
		// digital input
		if(gDigitalEnabled)
		{
			// digital in at message-rate
			dcm.processInput(&context->digital[digitalFrameBase], gLibpdBlockSize);

			// digital in at signal-rate
			for (j = 0, p0 = gInBuf; j < gLibpdBlockSize; j++, p0++) {
				unsigned int digitalFrame = digitalFrameBase + j;
				for (k = 0, p1 = p0 + gLibpdBlockSize * gFirstDigitalChannel;
						k < 16; ++k, p1 += gLibpdBlockSize) {
					if(dcm.isSignalRate(k) && dcm.isInput(k)){ // only process input channels that are handled at signal rate
						*p1 = digitalRead(context, digitalFrame, k);
					}
				}
			}
		}

		libpd_process_sys(); // process the block

		// digital outputs
		if(gDigitalEnabled)
		{
			// digital out at signal-rate
			for (j = 0, p0 = gOutBuf; j < gLibpdBlockSize; ++j, ++p0) {
				unsigned int digitalFrame = (digitalFrameBase + j);
				for (k = 0, p1 = p0  + gLibpdBlockSize * gFirstDigitalChannel;
					k < context->digitalChannels; k++, p1 += gLibpdBlockSize)
				{
					if(dcm.isSignalRate(k) && dcm.isOutput(k)){ // only process output channels that are handled at signal rate
						digitalWriteOnce(context, digitalFrame, k, *p1 > 0.5);
					}
				}
			}

			// digital out at message-rate
			dcm.processOutput(&context->digital[digitalFrameBase], gLibpdBlockSize);
		}

#ifdef BELA_LIBPD_SCOPE
		if(settings.scopeChannels)
		{
			// scope output
			for (j = 0, p0 = gOutBuf; j < gLibpdBlockSize; ++j, ++p0) {
				for (k = 0, p1 = p0 + gLibpdBlockSize * gFirstScopeChannel; k < gScopeOut.size(); k++, p1 += gLibpdBlockSize) {
					gScopeOut[k] = *p1;
				}
				scope.log(gScopeOut.data());
			}
		}
#endif // BELA_LIBPD_SCOPE

		// audio output
		for(unsigned int n = 0; n < context->audioOutChannels; ++n)
		{
			memcpy(
				context->audioOut + tick * gLibpdBlockSize + n * context->audioFrames, 
				gOutBuf + n * gLibpdBlockSize,
				sizeof(context->audioOut[0]) * gLibpdBlockSize
			);
		}

		//analog output
		for(unsigned int n = 0; n < context->analogOutChannels; ++n)
		{
			memcpy(
				context->analogOut + tick * gLibpdBlockSize + n * context->analogFrames, 
				gOutBuf + gLibpdBlockSize * gFirstAnalogOutChannel + n * gLibpdBlockSize,
				sizeof(context->analogOut[0]) * gLibpdBlockSize
			);
		}
	}
}

void BelaLibpd_cleanup(BelaContext *context, void *userData)
{
#ifdef BELA_LIBPD_MIDI
	if(gMidiDiscoveryThread.joinable())
		gMidiDiscoveryThread.join();
	for(auto a : midi)
	{
		delete a;
	}
#endif // BELA_LIBPD_MIDI
#ifdef BELA_LIBPD_TRILL
	for(auto t : gTouchSensors)
	{
		// t.first is a std::string, so the memory will be deallocated automatically
		delete t.second;
	}
#endif // BELA_LIBPD_TRILL
#ifdef BELA_LIBPD_SERIAL
	for(auto s : gSerial)
	{
		delete s->serial;
		delete s;
	}
#endif // BELA_LIBPD_SERIAL
	libpd_closefile(gPatch);
}
