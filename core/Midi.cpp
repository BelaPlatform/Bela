/*
 * Midi.cpp
 *
 * Created on: 15 Jan 2016
 * Author: giulio
 */

#include "Midi.h"
#include <fcntl.h>
#include <errno.h>


#define kMidiInput 0
#define kMidiOutput 1


midi_byte_t midiMessageStatusBytes[midiMessageStatusBytesLength]=
{
	0x80,
	0x90,
	0xA0,
	0xB0,
	0xC0,
	0xD0,
	0xE0,
	0
};

unsigned int midiMessageNumDataBytes[midiMessageStatusBytesLength]={2, 2, 2, 2, 1, 1, 2, 0};

bool Midi::staticConstructed;
AuxiliaryTask Midi::midiInputTask;
AuxiliaryTask Midi::midiOutputTask;
std::vector<Midi *> Midi::objAddrs[2];

int MidiParser::parse(midi_byte_t* input, unsigned int length){
	unsigned int consumedBytes = 0;
	for(unsigned int n = 0; n < length; n++){
		consumedBytes++;
		if(waitingForStatus == true){
			int statusByte = input[n];
			MidiMessageType newType = kmmNone;
			if (statusByte >= 0x80 && statusByte < 0xF0){//it actually is a status byte
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
				rt_printf("Receiving sysex\n");
			} else { // either something went wrong or it's a system message
				continue;
			}
		} else if (receivingSysex){
			// Just wait for the message to end
			rt_printf("%c", input[n]);
			if(input[n] == 0xF7){
				receivingSysex = false;
				waitingForStatus = true;
				rt_printf("\nCompleted receiving sysex\n");
			}
		} else {
			messages[writePointer].setDataByte(elapsedDataBytes, input[n]);
			elapsedDataBytes++;
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
	}

	return consumedBytes;
};


Midi::Midi() : 
alsaIn(NULL), alsaOut(NULL), useAlsaApi(false) {
	outputPort = -1;
	inputPort = -1;
	inputParser = 0;
	size_t inputBytesInitialSize = 1000;
	inputBytes.resize(inputBytesInitialSize);
	outputBytes.resize(inputBytesInitialSize);
	inputBytesWritePointer = 0;
	inputBytesReadPointer = inputBytes.size() - 1;
	if(!staticConstructed){
		staticConstructor();
	}
}

void Midi::staticConstructor(){
	staticConstructed = true;
	midiInputTask = Bela_createAuxiliaryTask(Midi::midiInputLoop, 50, "MidiInput");
	midiOutputTask = Bela_createAuxiliaryTask(Midi::midiOutputLoop, 50, "MidiOutupt");
}

Midi::~Midi() {
	if(useAlsaApi) {
		if(alsaOut){
			snd_rawmidi_drain(alsaOut);
			snd_rawmidi_close(alsaOut);
		}
		if(alsaIn){
			snd_rawmidi_drain(alsaIn);
			snd_rawmidi_close(alsaIn);
		}
	}
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

void Midi::midiInputLoop(){
	for(unsigned int n = 0; n < objAddrs[kMidiInput].size(); n++){
		objAddrs[kMidiInput][n] -> readInputLoop();
	}
}

void Midi::midiOutputLoop(){
	for(unsigned int n = 0; n < objAddrs[kMidiOutput].size(); n++){
		objAddrs[kMidiOutput][n] -> writeOutputLoop();
	}
}

void Midi::readInputLoop(){
	while(!gShouldStop){
		int maxBytesToRead = inputBytes.size() - inputBytesWritePointer;
		int ret = -1;

		if(useAlsaApi && alsaIn) {
			ret = snd_rawmidi_read(alsaIn,&inputBytes[inputBytesWritePointer],sizeof(midi_byte_t)*maxBytesToRead);
		} else {
			ret = read(inputPort, &inputBytes[inputBytesWritePointer], sizeof(midi_byte_t)*maxBytesToRead);
		}
		if(ret < 0){
			if(errno != EAGAIN){ // read() would return EAGAIN when no data are available to read just now
				rt_printf("Error while reading midi %d\n", errno);
			}
			usleep(1000);
			continue;
		}
		inputBytesWritePointer += ret;
		if(inputBytesWritePointer == inputBytes.size()){ //wrap pointer around
			inputBytesWritePointer = 0;
		}

		if(parserEnabled == true && ret > 0){ // if the parser is enabled and there is new data, send the data to it
			int input;
			while((input=_getInput()) >= 0){
				midi_byte_t inputByte = (midi_byte_t)(input);
				inputParser->parse(&inputByte, 1);
			}
		}
		if(ret < maxBytesToRead){ //no more data to retrieve at the moment
			usleep(1000);
		} // otherwise there might be more data ready to be read (we were at the end of the buffer), so don't sleep
	}

	if(useAlsaApi && alsaIn) {
		snd_rawmidi_drain(alsaIn);
		snd_rawmidi_close(alsaIn);
		alsaIn = NULL;
	}
}

void Midi::writeOutputLoop(){
	while(!gShouldStop){
		usleep(1000);
		int length = outputBytesWritePointer - outputBytesReadPointer;
		if(length < 0){
			length = outputBytes.size() - outputBytesReadPointer;
		}
		if(length == 0){ //nothing to be written
			continue;
		}
		int ret = -1;
		if(useAlsaApi && alsaOut) {
			ret = snd_rawmidi_write(alsaOut,&outputBytes[outputBytesReadPointer], sizeof(midi_byte_t)*length);
			snd_rawmidi_drain(alsaOut);
		} else {
			ret = write(outputPort, &outputBytes[outputBytesReadPointer], sizeof(midi_byte_t)*length);
		}
		outputBytesReadPointer += ret;
		if(outputBytesReadPointer >= outputBytes.size())
			outputBytesReadPointer -= outputBytes.size();
		if(ret < 0){ //error occurred
			rt_printf("error occurred while writing: %d\n", errno);
			usleep(10000); //wait before retrying
			continue;
		}
	}

	if(useAlsaApi && alsaOut)  {
		snd_rawmidi_drain(alsaOut);
		snd_rawmidi_close(alsaOut);
		alsaOut = NULL;
	}
}

void Midi::useAlsa(bool f) {
	useAlsaApi = f;
}

int Midi::readFrom(const char* port){
	objAddrs[kMidiInput].push_back(this);
	if(useAlsaApi) {
		int err = snd_rawmidi_open(&alsaIn,NULL,port,SND_RAWMIDI_NONBLOCK);
		if (err) {
			rt_printf("readFrom snd_rawmidi_open %s failed: %d\n",port,err);
			return -1;
		}
		rt_printf("Reading from Alsa midi device %s\n", port);
	} else {
		inputPort = open(port, O_RDONLY | O_NONBLOCK | O_NOCTTY);
		if(inputPort < 0){
			return -1;
		}
		rt_printf("Reading from Midi port %s\n", port);
	}
	Bela_scheduleAuxiliaryTask(midiInputTask);
	return 1;
}

int Midi::writeTo(const char* port){
	objAddrs[kMidiOutput].push_back(this);
	if(useAlsaApi) {
		int err = snd_rawmidi_open(NULL, &alsaOut, port,0);
		if (err) {
			rt_printf("writeTo snd_rawmidi_open %s failed: %d\n",port,err);
			return -1;
		}
		rt_printf("Writing to Alsa midi device %s\n", port);
	} else {
		outputPort = open(port, O_WRONLY, 0);
		if(outputPort < 0){
			return -1;
		}
		rt_printf("Writing to Midi port %s\n", port);
	}
	Bela_scheduleAuxiliaryTask(midiOutputTask);
	return 1;
}

int Midi::_getInput(){
	if( (useAlsaApi && !alsaIn ) || (!useAlsaApi && inputPort < 0) )
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

void Midi::writeOutput(midi_byte_t byte){
	outputBytes[outputBytesWritePointer++] = byte;
	if(outputBytesWritePointer >= outputBytes.size()){
		outputBytesWritePointer = 0;
	}
}

void Midi::writeOutput(midi_byte_t* bytes, unsigned int length){
	for(unsigned int n = 0; n < length; ++n){
		writeOutput(bytes[n]);
	}
}

MidiChannelMessage::MidiChannelMessage(){};
MidiChannelMessage::MidiChannelMessage(MidiMessageType type){
	setType(type);
};
MidiChannelMessage::~MidiChannelMessage(){};
MidiMessageType MidiChannelMessage::getType(){
	return _type;
};
int MidiChannelMessage::getChannel(){
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
