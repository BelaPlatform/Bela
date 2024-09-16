/*
 * Midi.cpp
 *
 * Created on: 15 Jan 2016
 * Author: giulio
 */

#include "Midi.h"
#include <fcntl.h>
#include <errno.h>
#include <glob.h>
#include <alsa/asoundlib.h>

static const std::string defaultPort = "hw:1,0,0";

#define kMidiInput 0
#define kMidiOutput 1

static int   is_input                  (snd_ctl_t *ctl, int card, int device, int sub);
static int   is_output                 (snd_ctl_t *ctl, int card, int device, int sub);
static void  error                     (const char *format, ...);

///////////////////////////////////////////////////////////////////////////

midi_byte_t midiMessageStatusBytes[midiMessageStatusBytesLength]=
{
	0x80, /* note off */
	0x90, /* note on */
	0xA0, /* polyphonic key pressure */
	0xB0, /* control change */
	0xC0, /* program change */
	0xD0, /* channel key pressure */
	0xE0, /* pitch bend change */
	0xF0, /* system message */
	0
};

unsigned int midiMessageNumDataBytes[midiMessageStatusBytesLength]={2, 2, 2, 2, 1, 1, 2, 0, 0};

int MidiParser::parse(midi_byte_t* input, unsigned int length){
	unsigned int consumedBytes = 0;
	for(unsigned int n = 0; n < length; n++){
		consumedBytes++;
		if(waitingForStatus == true){
			int statusByte = input[n];
			MidiMessageType newType = kmmNone;
			if ((statusByte >= 0x80 && statusByte < 0xF0) || (statusByte >= 0xF8)){
			//it actually is a channel status byte OR a system real time message
				for(int n = 0; n < midiMessageStatusBytesLength; n++){ //find the statusByte in the array
					if(midiMessageStatusBytes[n] == (statusByte&0xf0)){
						newType = (MidiMessageType)n;
						break;
					}
				}
				elapsedDataBytes = 0;
				waitingForStatus = false;
				messages[writePointer].setType(newType);
				messages[writePointer].setChannel((midi_byte_t)(statusByte&0xf));
				consumedBytes++;
			} else if (statusByte == 0xF0) {
				//sysex!!!
				waitingForStatus = false;
				receivingSysex = true;
				if(!isSysexCallbackEnabled())
					rt_printf("Receiving sysex\n");
			} else { // other system common
				continue;
			}
		}
		if (receivingSysex){
			if(isSysexCallbackEnabled())
				sysexCallback(input[n], sysexCallbackArg);
			else
				rt_printf("%c", input[n]);
			if(input[n] == 0xF7){
				receivingSysex = false;
				waitingForStatus = true;
				if(!isSysexCallbackEnabled())
					rt_printf("\n...done receiving sysex\n");
			}
			continue;
		} else {
			messages[writePointer].setDataByte(elapsedDataBytes, input[n]);
			elapsedDataBytes++;
		}
		if(elapsedDataBytes == messages[writePointer].getNumDataBytes()){
			// done with the current message
			// call the callback if available
			if(isCallbackEnabled() == true){
				messageReadyCallback(getNextChannelMessage(), callbackArg);
			}
			waitingForStatus = true;
			writePointer++;
			if(writePointer == messages.size()){
				writePointer = 0;
			}
		}
	}

	return consumedBytes;
};


Midi::Midi()
{
	setup();
}
void Midi::setup() {
	size_t inputBytesInitialSize = 1000;
	inputBytes.resize(inputBytesInitialSize);
	inputBytesWritePointer = 0;
	inputBytesReadPointer = inputBytes.size() - 1;
	alsaIn = nullptr;
	alsaOut = nullptr;
	inputParser = nullptr;
	midiOutputTask = nullptr;
	parserEnabled = false;
	inputEnabled = false;
	outputEnabled = false;
	shouldStop = false;
}

void Midi::cleanup() {
	shouldStop = true;
	if(inputEnabled)
		midiInputThread.join();
	delete midiOutputTask;
	midiOutputTask = nullptr;
	if(alsaOut){
		snd_rawmidi_drain(alsaOut);
		snd_rawmidi_close(alsaOut);
		alsaOut = nullptr;
	}
	if(alsaIn){
		snd_rawmidi_drain(alsaIn);
		snd_rawmidi_close(alsaIn);
		alsaIn = nullptr;
	}
}

Midi::~Midi() {
	cleanup();
}

void Midi::enableParser(bool enable){
	if(enable == true){
		delete inputParser;
		inputParser = new MidiParser();
		parserEnabled = true;
	} else {
		delete inputParser;
		parserEnabled = false;
	}
}

int Midi::attemptRecoveryRead()
{
	snd_rawmidi_close(alsaIn);
	alsaIn = NULL;
	printf("MIDI: attempting to reopen input %s\n", inPort.c_str());
	while(!shouldStop)
	{
		int err = snd_rawmidi_open(&alsaIn, NULL, inPort.c_str(), SND_RAWMIDI_NONBLOCK);
		if (err) {
			usleep(100000);
		} else {
			printf("MIDI: Successfully reopened input %s\n", inPort.c_str());
			return 0;
		}
	}
	return -1;
}

void Midi::readInputLoopStatic(void* obj){
	Midi* that = (Midi*)obj;
	that->readInputLoop();
}

void Midi::readInputLoop(){
	while(!shouldStop){
		unsigned short revents;
		int npfds = snd_rawmidi_poll_descriptors_count(alsaIn);
		struct pollfd pfds[npfds];
		snd_rawmidi_poll_descriptors(alsaIn, pfds, npfds);

		while(!shouldStop){
			int maxBytesToRead = inputBytes.size() - inputBytesWritePointer;
			int timeout = 50; // ms
			int err = poll(pfds, npfds, timeout);
			if (err < 0) {
				fprintf(stderr, "poll failed: %s", strerror(errno));
				break;
			}
			if ((err = snd_rawmidi_poll_descriptors_revents(alsaIn, pfds, npfds, &revents)) < 0) {
				fprintf(stderr, "cannot get poll events: %s", snd_strerror(-err));
				break;
			}
			if (revents & (POLLERR | POLLHUP | POLLNVAL))
			{
				break;
			}
			if (!(revents & POLLIN))
			{
				continue;	
			}
			// else some data is available!
			int ret = snd_rawmidi_read(
				alsaIn,
				&inputBytes[inputBytesWritePointer],
				sizeof(midi_byte_t)*maxBytesToRead
			);
			if(ret < 0){
				// read() would return EAGAIN when no data are available to read just now
				if(-ret != EAGAIN){ 
					fprintf(stderr, "Error while reading midi %s\n", strerror(-ret));
					break;
				}
				continue;
			}
			inputBytesWritePointer += ret;
			if(inputBytesWritePointer == inputBytes.size()){ //wrap pointer around
				inputBytesWritePointer = 0;
			}

			if(parserEnabled == true && ret > 0){ // if the parser is enabled and there is new data, send the data to it
				int input;
				while((input = _getInput()) >= 0){
					midi_byte_t inputByte = (midi_byte_t)(input);
					inputParser->parse(&inputByte, 1);
				}
			}
		}
		if(!shouldStop)
			attemptRecoveryRead();
	}
}

int Midi::attemptRecoveryWrite()
{
	snd_rawmidi_close(alsaOut);
	alsaOut = NULL;
	printf("MIDI: attempting to reopen output %s\n", outPort.c_str());
	while(!shouldStop)
	{
		int err = snd_rawmidi_open(NULL, &alsaOut, outPort.c_str(), SND_RAWMIDI_NONBLOCK);
		if (err) {
			usleep(100000);
		} else {
			printf("MIDI: Successfully reopened output %s\n", outPort.c_str());
			return 0;
		}
	}
	return -1;
}

void Midi::doWriteOutput(const void* data, int size) {
	int ret = snd_rawmidi_write(alsaOut, data, size);
	if(ret < 0)
		attemptRecoveryWrite();
}

static Midi::Port getPort(snd_rawmidi_info_t* info)
{
#if 0
	printf("==========\n");
	printf("device: %d\n", snd_rawmidi_info_get_device(info));
	printf("subdevice: %d\n", snd_rawmidi_info_get_subdevice(info));
	printf("stream: %d\n", snd_rawmidi_info_get_stream(info));
	printf("card: %d\n", snd_rawmidi_info_get_card(info));
	printf("flags: %d\n", snd_rawmidi_info_get_flags(info));
	printf("id: %s\n", snd_rawmidi_info_get_id(info));
	printf("name: %s\n", snd_rawmidi_info_get_name(info));
	printf("subdevice_name: %s\n", snd_rawmidi_info_get_subdevice_name(info));
	printf("subdevices_count: %d\n", snd_rawmidi_info_get_subdevices_count(info));
	printf("subdevices_avail: %d\n", snd_rawmidi_info_get_subdevices_avail(info));
#endif
	int card = snd_rawmidi_info_get_card(info);
	int sub = snd_rawmidi_info_get_subdevice(info);
	int device = snd_rawmidi_info_get_device(info);
	std::string name = "hw:" + std::to_string(card) + "," + std::to_string(device) + "," + std::to_string(sub);
	std::string desc = std::string(snd_rawmidi_info_get_id(info)) + " " + snd_rawmidi_info_get_name(info) + " [  " + snd_rawmidi_info_get_subdevice_name(info) + " ]";
	return {
		.name = name,
		.desc = desc,
		.card = card,
		.device = device,
		.sub = (int)sub,
		.hasInput = false, // TODO: fill these in, see is_input()/is_output()
		.hasOutput = false,
	};
}

static int getPort(snd_rawmidi_t* rmidi, Midi::Port& port) {
	snd_rawmidi_info_t *info;
	snd_rawmidi_info_alloca(&info);
	int ret = snd_rawmidi_info(rmidi, info);
	if(ret)
		return ret;
	port = getPort(info);
	return 0;
}

bool Midi::exists(const char* port)
{
	snd_rawmidi_t* d;
	if(snd_rawmidi_open(&d, NULL, port, 0)) // open in
		if(snd_rawmidi_open(NULL, &d, port, 0)) // open out
			return false;
	snd_rawmidi_close(d);
	return true;
}

int Midi::readFrom(const char* port){
	if(port == NULL){
		port = defaultPort.c_str();
	}
	inPort = port;
	inId = "bela-midiIn_" + inPort;

	int err = snd_rawmidi_open(&alsaIn, NULL, inPort.c_str(), SND_RAWMIDI_NONBLOCK);
	if (err) {
		return err;
	}
	int ret = getPort(alsaIn, inPortFull);
	inPortFull.hasInput = true;
	if(ret) {
		fprintf(stderr, "Unable to retrieve input port information for %s\n", port);
		return 0;
	}
	ret = midiInputThread.create(inId.c_str(), 50, Midi::readInputLoopStatic, (void*)this);
	if(ret)
		return 0;
	inputEnabled = true;
	return 1;
}

int Midi::writeTo(const char* port){
	if(port == NULL){
		port = defaultPort.c_str();
	}
	outPort = port;
	outId = "bela-midiOut_" + outPort;

	int err = snd_rawmidi_open(NULL, &alsaOut, outPort.c_str(), 0);
	if (err) {
		return err;
	}
	int ret = getPort(alsaOut, outPortFull);
	inPortFull.hasOutput = true;
	if(ret) {
		fprintf(stderr, "Unable to retrieve output port information for %s\n", port);
		return 0;
	}
	midiOutputTask = new AuxTaskNonRT();
	midiOutputTask->create(outId, [this](const void* buf, int size) {
		this->doWriteOutput(buf, size);
	}, 45);
	outputEnabled = true;
	return 1;
}

std::vector<Midi::Port> Midi::listAllPorts(){
	std::vector<Port> ports;
	int card = -1;
	int status;
	while((status = snd_card_next(&card)) == 0){
		if(card < 0){
			break;
		}
		snd_ctl_t *ctl;
		char name[32];
		int device = -1;
		int status;
		sprintf(name, "hw:%d", card);
		if ((status = snd_ctl_open(&ctl, name, 0)) < 0) {
			error("cannot open control for card %d: %s\n", card, snd_strerror(status));
			return ports;
		}
		do {
			status = snd_ctl_rawmidi_next_device(ctl, &device);
			if (status < 0) {
				error("cannot determine device number: %s", snd_strerror(status));
				break;
			}
			if (device >= 0) {
				snd_rawmidi_info_t *info;
				snd_rawmidi_info_alloca(&info);
				snd_rawmidi_info_set_device(info, device);
				// count subdevices:
				snd_rawmidi_info_set_stream(info, SND_RAWMIDI_STREAM_INPUT);
				snd_ctl_rawmidi_info(ctl, info);
				unsigned int subs_in = snd_rawmidi_info_get_subdevices_count(info);
				snd_rawmidi_info_set_stream(info, SND_RAWMIDI_STREAM_OUTPUT);
				snd_ctl_rawmidi_info(ctl, info);
				unsigned int subs_out = snd_rawmidi_info_get_subdevices_count(info);
				//number of subdevices is max (inputs, outputs);
				unsigned int subs = subs_in > subs_out ? subs_in : subs_out;

				for(unsigned int sub = 0; sub < subs; ++sub){
					bool in = false;
					bool out = false;
					if ((status = is_output(ctl, card, device, sub)) < 0) {
						error("cannot get rawmidi information %d:%d: %s",
						card, device, snd_strerror(status));
						return ports;
					} else if (status){
						out = true;
						// writeTo
					}

					if (status == 0) {
						if ((status = is_input(ctl, card, device, sub)) < 0) {
							error("cannot get rawmidi information %d:%d: %s",
							card, device, snd_strerror(status));
							return ports;
						}
					} else if (status) {
						in = true;
						// readfrom
					}

					if(in || out){
						Port port = getPort(info);
						port.hasInput = in;
						port.hasOutput = out;
						ports.push_back(port);
					}
				}
			}
		} while (device >= 0);
		snd_ctl_close(ctl);
	}
	return ports;
}

void Midi::createAllPorts(std::vector<Midi*>& ports, bool useParser){
	auto list = listAllPorts();
	ports.reserve(list.size());
	for(size_t n = 0; n < list.size(); ++n) {
		auto& l = list[n];
		if(!(l.hasInput || l.hasOutput))
			continue;
		Midi* m = new Midi();
		if(l.hasInput) {
			std::string str = "reading from " + l.name + ": " + l.desc;
			if(1 == m->readFrom(l.name.c_str()))
				printf("Port %zd, %s\n", n, str.c_str());
			else
				fprintf(stderr, "Port %zd, ERROR %s\n", n, str.c_str());
		}
		if(l.hasOutput) {
			std::string str = "writing to " + l.name + ": " + l.desc;
			if(1 == m->writeTo(l.name.c_str()))
				printf("Port %zd, %s\n", n, str.c_str());
			else
				fprintf(stderr, "Port %zd, ERROR %s\n", n, str.c_str());
		}
		ports.push_back(m);
	}
}

int Midi::_getInput(){
	if( (!alsaIn ) )
		return -2;
	if(inputBytesReadPointer == inputBytesWritePointer){
		return -1; // no bytes to read
	}
	midi_byte_t inputMessage = inputBytes[inputBytesReadPointer++];
	if(inputBytesReadPointer == inputBytes.size()){ // wrap pointer
		inputBytesReadPointer = 0;
	}
	return inputMessage;
}

int Midi::getInput(){
	if(parserEnabled == true) {
		return -3;
	}
	return _getInput();
}

MidiParser* Midi::getParser(){
	if(parserEnabled == false){
		return 0;
	}
	return inputParser;
}

int Midi::writeOutput(midi_byte_t byte){
	return writeOutput(&byte, sizeof(byte));
}

int Midi::writeOutput(midi_byte_t* bytes, unsigned int length){
	if(!outputEnabled){
		return 0;
	}
	int tries = 0;
	do {
		ssize_t size = length;
		int ret = midiOutputTask->schedule(bytes, size);
		tries++;
		if(ret){
			// pipe is full, sleep and try again in the attempt to
			// avoid losing data
			rt_fprintf(stderr, "Error while sending %u MIDI bytes out to thread %s: %d %s\n", length, outId.c_str(), ret, strerror(ret));
			usleep(10000);
			if(tries > 5)
				return -1;
		} else {
			length -= size;
		}
	} while (length > 0);
	return 1;
}

bool Midi::isInputEnabled() const
{
	return inputEnabled;
}

bool Midi::isOutputEnabled() const
{
	return outputEnabled;
}

midi_byte_t Midi::makeStatusByte(midi_byte_t statusCode, midi_byte_t channel){
	return (statusCode & 0xF0) | (channel & 0x0F);
}

int Midi::writeMessage(midi_byte_t statusCode, midi_byte_t channel, midi_byte_t dataByte){
	midi_byte_t bytes[2] = {makeStatusByte(statusCode, channel), (midi_byte_t)(dataByte & 0x7F)};
	return writeOutput(bytes, 2);
}

int Midi::writeMessage(midi_byte_t statusCode, midi_byte_t channel, midi_byte_t dataByte1, midi_byte_t dataByte2){
	midi_byte_t bytes[3] = {makeStatusByte(statusCode, channel), (midi_byte_t)(dataByte1 & 0x7F), (midi_byte_t)(dataByte2 & 0x7F)};
	return writeOutput(bytes, 3);
}

int Midi::writeMessage(const MidiChannelMessage& msg)
{
	unsigned int len = 1 + msg.getNumDataBytes();
	midi_byte_t bytes[len];
	bytes[0] = msg.getStatusByte();
	bytes[1] = msg.getDataByte(0);
	if(len > 2)
		bytes[2] = msg.getDataByte(1);
	return writeOutput(bytes, len);
}

int Midi::writeNoteOff(midi_byte_t channel, midi_byte_t pitch, midi_byte_t velocity){
	return writeMessage(midiMessageStatusBytes[kmmNoteOff], channel, pitch, velocity);
}

int Midi::writeNoteOn(midi_byte_t channel, midi_byte_t pitch, midi_byte_t velocity){
	return writeMessage(midiMessageStatusBytes[kmmNoteOn], channel, pitch, velocity);
}

int Midi::writePolyphonicKeyPressure(midi_byte_t channel, midi_byte_t pitch, midi_byte_t pressure){
	return writeMessage(midiMessageStatusBytes[kmmPolyphonicKeyPressure], channel, pitch, pressure);
}

int Midi::writeControlChange(midi_byte_t channel, midi_byte_t controller, midi_byte_t value){
	return writeMessage(midiMessageStatusBytes[kmmControlChange], channel, controller, value);
}

int Midi::writeProgramChange(midi_byte_t channel, midi_byte_t program){
	return writeMessage(midiMessageStatusBytes[kmmProgramChange], channel, program);
}

int Midi::writeChannelPressure(midi_byte_t channel, midi_byte_t pressure){
	return writeMessage(midiMessageStatusBytes[kmmChannelPressure], channel, pressure);
}

int Midi::writePitchBend(midi_byte_t channel, uint16_t bend){
	// the first ``bend'' is clamped with & 0x7F in writeMessage 
	return writeMessage(midiMessageStatusBytes[kmmPitchBend], channel, bend, bend >> 7);
}

MidiChannelMessage::MidiChannelMessage(){};
MidiChannelMessage::MidiChannelMessage(MidiMessageType type){
	setType(type);
};
MidiChannelMessage::~MidiChannelMessage(){};
MidiMessageType MidiChannelMessage::getType() const {
	return _type;
};
int MidiChannelMessage::getChannel() const {
	return _channel;
};
//int MidiChannelMessage::set(midi_byte_t* input);
//
//int MidiControlChangeMessage ::getValue();
//int MidiControlChangeMessage::set(midi_byte_t* input){
//	channel = input[0];
//	number = input[1];
//	value = input[2];
//	return 3;
//}

//int MidiNoteMessage::getNote();
//int MidiNoteMessage::getVelocity();

//midi_byte_t MidiProgramChangeMessage::getProgram();
//


// 
// following code borrowed rom:    Craig Stuart Sapp <craig@ccrma.stanford.edu>
// https://ccrma.stanford.edu/~craig/articles/linuxmidi/alsa-1.0/alsarawportlist.c
//

//////////////////////////////
//
// print_card_list -- go through the list of available "soundcards"
//   in the ALSA system, printing their associated numbers and names.
//   Cards may or may not have any MIDI ports available on them (for 
//   example, a card might only have an audio interface).
//
/*
static void print_card_list(void) {
   int status;
   int card = -1;  // use -1 to prime the pump of iterating through card list
   char* longname  = NULL;
   char* shortname = NULL;

   if ((status = snd_card_next(&card)) < 0) {
      error("cannot determine card number: %s", snd_strerror(status));
      return;
   }
   if (card < 0) {
      error("no sound cards found");
      return;
   }
   while (card >= 0) {
      printf("Card %d:", card);
      if ((status = snd_card_get_name(card, &shortname)) < 0) {
         error("cannot determine card shortname: %s", snd_strerror(status));
         break;
      }
      if ((status = snd_card_get_longname(card, &longname)) < 0) {
         error("cannot determine card longname: %s", snd_strerror(status));
         break;
      }
      printf("\tLONG NAME:  %s\n", longname);
      printf("\tSHORT NAME: %s\n", shortname);
      if ((status = snd_card_next(&card)) < 0) {
         error("cannot determine card number: %s", snd_strerror(status));
         break;
      }
   } 
}



//////////////////////////////
//
// print_midi_ports -- go through the list of available "soundcards",
//   checking them to see if there are devices/subdevices on them which
//   can read/write MIDI data.
//

static void print_midi_ports(void) {
   int status;
   int card = -1;  // use -1 to prime the pump of iterating through card list

   if ((status = snd_card_next(&card)) < 0) {
      error("cannot determine card number: %s", snd_strerror(status));
      return;
   }
   if (card < 0) {
      error("no sound cards found");
      return;
   }
   printf("\nDir Device    Name\n");
   printf("====================================\n");
   while (card >= 0) {
      list_midi_devices_on_card(card);
      if ((status = snd_card_next(&card)) < 0) {
         error("cannot determine card number: %s", snd_strerror(status));
         break;
      }
   } 
   printf("\n");
}



//////////////////////////////
//
// list_midi_devices_on_card -- For a particular "card" look at all
//   of the "devices/subdevices" on it and print information about it
//   if it can handle MIDI input and/or output.
//

static void list_midi_devices_on_card(int card) {
   snd_ctl_t *ctl;
   char name[32];
   int device = -1;
   int status;
   printf("list_midi_devices_on_card\n");
   sprintf(name, "hw:%d", card);
   if ((status = snd_ctl_open(&ctl, name, 0)) < 0) {
      error("cannot open control for card %d: %s", card, snd_strerror(status));
      return;
   }
   do {
      status = snd_ctl_rawmidi_next_device(ctl, &device);
      if (status < 0) {
         error("cannot determine device number: %s", snd_strerror(status));
         break;
      }
      if (device >= 0) {
         printf("device: %d\n", device);
         list_subdevice_info(ctl, card, device);
      }
   } while (device >= 0);
   snd_ctl_close(ctl);
}



//////////////////////////////
//
// list_subdevice_info -- Print information about a subdevice
//   of a device of a card if it can handle MIDI input and/or output.
//

static void list_subdevice_info(snd_ctl_t *ctl, int card, int device) {
   snd_rawmidi_info_t *info;
   const char *name;
   const char *sub_name;
   int subs, subs_in, subs_out;
   int sub, in, out;
   int status;

   snd_rawmidi_info_alloca(&info);
   snd_rawmidi_info_set_device(info, device);

   snd_rawmidi_info_set_stream(info, SND_RAWMIDI_STREAM_INPUT);
   snd_ctl_rawmidi_info(ctl, info);
   subs_in = snd_rawmidi_info_get_subdevices_count(info);
   snd_rawmidi_info_set_stream(info, SND_RAWMIDI_STREAM_OUTPUT);
   snd_ctl_rawmidi_info(ctl, info);
   subs_out = snd_rawmidi_info_get_subdevices_count(info);
   subs = subs_in > subs_out ? subs_in : subs_out;

   sub = 0;
   in = out = 0;
   if ((status = is_output(ctl, card, device, sub)) < 0) {
      error("cannot get rawmidi information %d:%d: %s",
            card, device, snd_strerror(status));
      return;
   } else if (status)
      out = 1;

   if (status == 0) {
      if ((status = is_input(ctl, card, device, sub)) < 0) {
         error("cannot get rawmidi information %d:%d: %s",
               card, device, snd_strerror(status));
         return;
      }
   } else if (status) 
      in = 1;

   if (status == 0)
      return;

   name = snd_rawmidi_info_get_name(info);
   sub_name = snd_rawmidi_info_get_subdevice_name(info);
   if (sub_name[0] == '\0') {
      if (subs == 1) {
         printf("%c%c  hw:%d,%d    %s\n", 
                in  ? 'I' : ' ', 
                out ? 'O' : ' ',
                card, device, name);
      } else
         printf("%c%c  hw:%d,%d    %s (%d subdevices)\n",
                in  ? 'I' : ' ', 
                out ? 'O' : ' ',
                card, device, name, subs);
   } else {
      sub = 0;
      for (;;) {
         printf("%c%c  hw:%d,%d,%d  %s\n",
                in ? 'I' : ' ', out ? 'O' : ' ',
                card, device, sub, sub_name);
         if (++sub >= subs)
            break;

         in = is_input(ctl, card, device, sub);
         out = is_output(ctl, card, device, sub);
         snd_rawmidi_info_set_subdevice(info, sub);
         if (out) {
            snd_rawmidi_info_set_stream(info, SND_RAWMIDI_STREAM_OUTPUT);
            if ((status = snd_ctl_rawmidi_info(ctl, info)) < 0) {
               error("cannot get rawmidi information %d:%d:%d: %s",
                     card, device, sub, snd_strerror(status));
               break;
            } 
         } else {
            snd_rawmidi_info_set_stream(info, SND_RAWMIDI_STREAM_INPUT);
            if ((status = snd_ctl_rawmidi_info(ctl, info)) < 0) {
               error("cannot get rawmidi information %d:%d:%d: %s",
                     card, device, sub, snd_strerror(status));
               break;
            }
         }
         sub_name = snd_rawmidi_info_get_subdevice_name(info);
      }
   }
}

*/

//////////////////////////////
//
// is_input -- returns true if specified card/device/sub can output MIDI data.
//

static int is_input(snd_ctl_t *ctl, int card, int device, int sub) {
   snd_rawmidi_info_t *info;
   int status;

   snd_rawmidi_info_alloca(&info);
   snd_rawmidi_info_set_device(info, device);
   snd_rawmidi_info_set_subdevice(info, sub);
   snd_rawmidi_info_set_stream(info, SND_RAWMIDI_STREAM_INPUT);
   
   if ((status = snd_ctl_rawmidi_info(ctl, info)) < 0 && status != -ENXIO) {
      return status;
   } else if (status == 0) {
      return 1;
   }

   return 0;
}


//////////////////////////////
//
// is_output -- returns true if specified card/device/sub can output MIDI data.
//

static int is_output(snd_ctl_t *ctl, int card, int device, int sub) {
   snd_rawmidi_info_t *info;
   int status;

   snd_rawmidi_info_alloca(&info);
   snd_rawmidi_info_set_device(info, device);
   snd_rawmidi_info_set_subdevice(info, sub);
   snd_rawmidi_info_set_stream(info, SND_RAWMIDI_STREAM_OUTPUT);
   
   if ((status = snd_ctl_rawmidi_info(ctl, info)) < 0 && status != -ENXIO) {
      return status;
   } else if (status == 0) {
      return 1;
   }

   return 0;
}



//////////////////////////////
//
// error -- print error message
//

static void error(const char *format, ...) {
   va_list ap;
   va_start(ap, format);
   vfprintf(stderr, format, ap);
   va_end(ap);
   putc('\n', stderr);
}


