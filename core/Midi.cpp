/*
 * Midi.cpp
 *
 *  Created on: 15 Jan 2016
 *      Author: giulio
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
			if (statusByte >= 0x80){//it actually is a status byte
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
			} else { // either something went wrong or it's a system message
				continue;
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


Midi::Midi(){
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

Midi::~Midi(){}

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
		int ret = read(inputPort, &inputBytes[inputBytesWritePointer], sizeof(midi_byte_t)*maxBytesToRead);
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
		int ret;
		ret = write(outputPort, &outputBytes[outputBytesReadPointer], sizeof(midi_byte_t)*length);
		if(ret < 0){ //error occurred
			rt_printf("error occurred while writing: %d\n", errno);
			usleep(10000); //wait before retrying
			continue;
		}
	}
}
int Midi::readFrom(const char* port){
	objAddrs[kMidiInput].push_back(this);
	inputPort = open(port, O_RDONLY | O_NONBLOCK | O_NOCTTY);
	if(inputPort < 0){
		return -1;
	} else {
		printf("Reading from Midi port %d\n", port);
		Bela_scheduleAuxiliaryTask(midiInputTask);
		return 1;
	}
}

int Midi::writeTo(const char* port){
	objAddrs[kMidiOutput].push_back(this);
	outputPort = open(port, O_WRONLY, 0);
	if(outputPort < 0){
		return -1;
	} else {
		printf("Writing to Midi port %d\n", port);
		Bela_scheduleAuxiliaryTask(midiOutputTask);
		return 1;
	}
}

int Midi::_getInput(){
	if(inputPort < 0)
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
};

int Midi::writeOutput(midi_byte_t byte){
	return writeOutput(&byte, 1);
}

int Midi::writeOutput(midi_byte_t* bytes, unsigned int length){
	int ret = write(outputPort, bytes, length);
	if(ret < 0)
		return -1;
	else
		return 1;
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
