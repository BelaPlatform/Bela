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
#include "../include/xenomai_wraps.h"
#include <alsa/asoundlib.h>

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
				continue;
			} else { // other system common
				continue;
			}
		} else if (receivingSysex){
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


Midi::Midi() : 
alsaIn(NULL), alsaOut(NULL),
inputParser(NULL), parserEnabled(false), inputEnabled(false), outputEnabled(false),
inId(NULL), outId(NULL), outPipeName(NULL)
	, sock(0)
{
	setup();
}
void Midi::setup() {
	sprintf(defaultPort, "%s", "hw:1,0,0"); // a bug in gcc<4.10 prevents initialization with defaultPort("hw:1,0,0") in the initialization list
	inputParser = 0;
	size_t inputBytesInitialSize = 1000;
	inputBytes.resize(inputBytesInitialSize);
	outputBytes.resize(inputBytesInitialSize);
	inputBytesWritePointer = 0;
	inputBytesReadPointer = inputBytes.size() - 1;
}
void Midi::cleanup() {
	free(inId);
	free(outId);
	free(outPipeName);
	// dummy write so that `poll` stops polling ! 
	//rt_pipe_write(&outPipe, NULL, 0, P_NORMAL); // does not work :(
	close(sock);
	if(alsaOut){
		snd_rawmidi_drain(alsaOut);
		snd_rawmidi_close(alsaOut);
	}
	if(alsaIn){
		snd_rawmidi_drain(alsaIn);
		snd_rawmidi_close(alsaIn);
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
	while(!Bela_stopRequested())
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

void Midi::readInputLoop(void* obj){
	Midi* that = (Midi*)obj;
	while(!Bela_stopRequested()){
		unsigned short revents;
		int npfds = snd_rawmidi_poll_descriptors_count(that->alsaIn);
		struct pollfd* pfds = (struct pollfd*)alloca(npfds * sizeof(struct pollfd));
		snd_rawmidi_poll_descriptors(that->alsaIn, pfds, npfds);

		while(!Bela_stopRequested()){
			int maxBytesToRead = that->inputBytes.size() - that->inputBytesWritePointer;
			int timeout = 50; // ms
			int err = poll(pfds, npfds, timeout);
			if (err < 0) {
				fprintf(stderr, "poll failed: %s", strerror(errno));
				break;
			}
			if ((err = snd_rawmidi_poll_descriptors_revents(that->alsaIn, pfds, npfds, &revents)) < 0) {
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
				that->alsaIn,
				&that->inputBytes[that->inputBytesWritePointer],
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
			that->inputBytesWritePointer += ret;
			if(that->inputBytesWritePointer == that->inputBytes.size()){ //wrap pointer around
				that->inputBytesWritePointer = 0;
			}

			if(that->parserEnabled == true && ret > 0){ // if the parser is enabled and there is new data, send the data to it
				int input;
				while((input=that->_getInput()) >= 0){
					midi_byte_t inputByte = (midi_byte_t)(input);
					that->inputParser->parse(&inputByte, 1);
				}
			}
		}
		if(!Bela_stopRequested())
			that->attemptRecoveryRead();
	}
}

int Midi::attemptRecoveryWrite()
{
	snd_rawmidi_close(alsaOut);
	alsaOut = NULL;
	printf("MIDI: attempting to reopen output %s\n", outPort.c_str());
	while(!Bela_stopRequested())
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

void Midi::writeOutputLoop(void* obj){
	Midi* that = (Midi*)obj;
	//printf("Opening outPipe %s\n", that->outPipeName);
	int pipe_fd = open(that->outPipeName, O_RDWR);
	if (pipe_fd < 0){
		fprintf(stderr, "could not open out pipe %s: %s\n", that->outPipeName, strerror(-pipe_fd));
		return;
	}
	void* data = &that->outputBytes.front();
	while(!Bela_stopRequested()){
		struct pollfd fds = {
			pipe_fd,
			POLLIN,
			0
		}; 
		while(!Bela_stopRequested()){
			//TODO: C++11 would allow to use outputBytes.data() instead of &outputBytes.front()
			int timeout = 50; //ms
			int ret = poll(&fds, 1, timeout);
			unsigned int revents = fds.revents;
			if (revents & (POLLERR | POLLHUP))
				break;
			if (!(revents & POLLIN))
				continue;	
			// else some data is available!
			if(revents & POLLIN){
				// there is data available
				ret = read(pipe_fd, data, that->outputBytes.size());
				if(ret > 0){
					//printf("obtained %d bytes: writing\n", ret);
					// write the received message to the output
					ret = snd_rawmidi_write(that->alsaOut, data, ret);
					if(ret < 0)
						break;
					// make sure it is written
					// NOTE:using _drain actually increases the latency
					// under heavy load, so we leave it out and
					// leave it to the driver to figure out.
					//snd_rawmidi_drain(that->alsaOut);
				}
			}
		}
		if(!Bela_stopRequested())
			that->attemptRecoveryWrite();
	}
	close(pipe_fd);
}

int Midi::readFrom(const char* port){
	if(port == NULL){
		port = defaultPort;
	}
	inPort = port;
	int size = snprintf(inId, 0, "bela-midiIn_%s", port);
	inId = (char*)malloc((size + 1) * sizeof(char));
	snprintf(inId, size + 1, "bela-midiIn_%s", port);

	int err = snd_rawmidi_open(&alsaIn, NULL, inPort.c_str(), SND_RAWMIDI_NONBLOCK);
	if (err) {
		return err;
	}
	midiInputTask = Bela_createAuxiliaryTask(Midi::readInputLoop, 50, inId, (void*)this);
	Bela_scheduleAuxiliaryTask(midiInputTask);
	inputEnabled = true;
	return 1;
}

int Midi::writeTo(const char* port){
	if(port == NULL){
		port = defaultPort;
	}
	outPort = port;
	int size = snprintf(outId, 0, "bela-midiOut_%s", port);
	outId = (char*)malloc((size + 1) * sizeof(char));
	snprintf(outId, size + 1, "bela-midiOut_%s", port);

	char outPipeNameTemplateString[] = "/proc/xenomai/registry/rtipc/xddp/%s";
	size = snprintf(outPipeName, 0, outPipeNameTemplateString, outId);
	outPipeName = (char*)malloc((size + 1)*sizeof(char));
	snprintf(outPipeName, size + 1, outPipeNameTemplateString, outId);
	int ret;
	ret = createBelaRtPipe(outId, 0);
	sock = ret;
	if(ret <= 0){
		fprintf(stderr, "Error while creating pipe %s: %s\n", outId, strerror(-ret));
		return -1;
	}
	int err = snd_rawmidi_open(NULL, &alsaOut, outPort.c_str(), 0);
	if (err) {
		return err;
	}
	midiOutputTask = Bela_createAuxiliaryTask(writeOutputLoop, 45, outId, (void*)this);
	if(midiOutputTask == 0){
		return -1;
	}
	Bela_scheduleAuxiliaryTask(midiOutputTask);
	outputEnabled = true;
	return 1;
}

void Midi::createAllPorts(std::vector<Midi*>& ports, bool useParser){
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
			return;
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
						return;
					} else if (status){
						out = true;
						// writeTo
					}

					if (status == 0) {
						if ((status = is_input(ctl, card, device, sub)) < 0) {
							error("cannot get rawmidi information %d:%d: %s",
							card, device, snd_strerror(status));
							return;
						}
					} else if (status) {
						in = true;
						// readfrom
					}

					if(in || out){
						ports.resize(ports.size() + 1);
						unsigned int index = ports.size() - 1;
						ports[index] = new Midi();
						const char* myName = snd_rawmidi_info_get_name(info);
						const char* mySubName =  snd_rawmidi_info_get_subdevice_name(info);
						sprintf(name, "hw:%d,%d,%d", card, device, sub);
						if(in){
							printf("Port %d, Reading from: %s, %s %s\n", index, name, myName, mySubName);
							ports[index]->readFrom(name);
							ports[index]->enableParser(useParser);
						}
						if(out){
							printf("Port %d, Writing to: %s %s %s\n", index, name, myName, mySubName);
							ports[index]->writeTo(name);
						}
					}
				}
			}
		} while (device >= 0);
		snd_ctl_close(ctl);
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
	do {
		// we make sure the message length does not exceed outputBytes.size(), 
		// which would result in incomplete messages being retrieved at
		// the other end of the pipe.
		ssize_t size = length < outputBytes.size() ? length : outputBytes.size();
		int ret = BELA_RT_WRAP(sendto(sock, bytes, size, 0, NULL, 0));
		if (ret != size){
			rt_fprintf(stderr, "Error while streaming to pipe %s: %s\n", outPipeName, strerror(-ret));
			return -1;
		} else {
			length -= ret;
		}
	} while (length > 0);
	return 1;
}

bool Midi::isInputEnabled()
{
	return inputEnabled;
}

bool Midi::isOutputEnabled()
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


