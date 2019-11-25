/*
 * Midi.h
 *
 *  Created on: 15 Jan 2016
 *      Author: giulio
 */

#ifndef MIDI_H_
#define MIDI_H_

#include <Bela.h>
#include <vector>
#include <alsa/asoundlib.h>
#include <string>
#ifdef XENOMAI_SKIN_native
#include <native/pipe.h>
#endif

typedef unsigned char midi_byte_t;

typedef enum midiMessageType{
	kmmNoteOff = 0,
	kmmNoteOn,
	kmmPolyphonicKeyPressure,
	kmmControlChange,
	kmmProgramChange,
	kmmChannelPressure,
	kmmPitchBend,
	kmmSystem,
	kmmNone,
	kmmAny,
} MidiMessageType;
#define midiMessageStatusBytesLength 8+2 //2 being kmmNone and kmmAny

extern midi_byte_t midiMessageStatusBytes[midiMessageStatusBytesLength];
extern unsigned int midiMessageNumDataBytes[midiMessageStatusBytesLength];

class MidiChannelMessage{
public:
	MidiChannelMessage();
	MidiChannelMessage(MidiMessageType type);
	midi_byte_t getStatusByte(){
		return _statusByte;
	}
	virtual ~MidiChannelMessage();
	MidiMessageType getType();
	int getChannel();
	const char* getTypeText(){
		return getTypeText(getType());
	}
	static const char* getTypeText(MidiMessageType type){
		switch (type) {
		case kmmNoteOff: 
			return "note off";
		case kmmNoteOn:
			return "note on";
		case kmmPolyphonicKeyPressure:
			return "polyphonic aftertouch";
		case kmmControlChange:
			return "control change";
		case kmmProgramChange:
			return "program change";
		case kmmChannelPressure:
			return "channel aftertouch";
		case kmmPitchBend:
			return "pitch bend";
		case kmmSystem:
			return "system";
		case kmmAny:
			return "any";
		case kmmNone:
		default:
			return "none";
		}
	}

	unsigned int getNumDataBytes(){
		return midiMessageNumDataBytes[(unsigned int)_type];
	}
	void setDataByte(unsigned int dataByteIndex, midi_byte_t input){
		_dataBytes[dataByteIndex] = input;
	}
	void setType(MidiMessageType type){
		_type = type;
		_statusByte = midiMessageStatusBytes[_type];
	}
	void setChannel(midi_byte_t channel){
		_channel = channel;
	}
	midi_byte_t getDataByte(unsigned int index){
		return _dataBytes[index];
	}
	void clear(){
		for(int n = 0; n<maxDataBytes; n++){
			_dataBytes[n] = 0;
		}
		_type = kmmNone;
		_statusByte = 0;
	}
	void prettyPrint(){
		rt_printf("type: %s,  ", this->getTypeText());
		rt_printf("channel: %u, ", this->getChannel());
		for(unsigned int n = 0; n < this->getNumDataBytes(); n++){
			rt_printf("data%d: %d, ", n + 1, this->getDataByte(n));
		}
		rt_printf("\n");
	}
private:
	const static int maxDataBytes = 2;
protected:
	midi_byte_t _statusByte;
	midi_byte_t _dataBytes[maxDataBytes]; // where 2 is the maximum number of data bytes for a channel message
	MidiMessageType _type;
	midi_byte_t _channel;
};
/*
class MidiControlChangeMessage : public MidiChannelMessage{
	int number;
	int value;
public:
	int getNumber();
	int getNumDataBytes();
	int setDataByte(midi_byte_t input, unsigned int dataByteIndex);
	int getValue();
	int set(midi_byte_t* input);
};

class MidiNoteMessage : public MidiChannelMessage{
	int note;
	int velocity;
public:
	int getNote();
	int getVelocity();
	int getNumDataBytes();
	int setDataByte(midi_byte_t input, unsigned int dataByteIndex);
};

class MidiProgramChangeMessage : public MidiChannelMessage{
	midi_byte_t program;
public:
	int getNumDataBytes();
	int setDataByte(midi_byte_t input, unsigned int dataByteIndex);
	midi_byte_t getProgram();
};
*/

class MidiParser{
private:
	std::vector<MidiChannelMessage> messages;
	unsigned int writePointer;
	unsigned int readPointer;
	unsigned int elapsedDataBytes;
	bool waitingForStatus;
	bool receivingSysex;
	void (*messageReadyCallback)(MidiChannelMessage,void*);
	bool callbackEnabled;
	void* callbackArg;
public:
	MidiParser(){
		waitingForStatus = true;
		receivingSysex = false;
		elapsedDataBytes= 0;
		messages.resize(100); // 100 is the number of messages that can be buffered
		writePointer = 0;
		readPointer = 0;
		callbackEnabled = false;
		messageReadyCallback = NULL;
		callbackArg = NULL;
	}

	/**
	 * Parses some midi messages.
	 *
	 * @param input the array to read from
	 * @param length the maximum number of values available at the array
	 *
	 * @return the number of bytes parsed
	 */
	int parse(midi_byte_t* input, unsigned int length);

	/**
	 * Sets the callback to call when a new MidiChannelMessage is available
	 * from the input port.
	 *
	 * The callback will be called with two arguments:
	 *   callback(MidiChannelMessage newMessage, void* arg)
	 *
	 * In order to deactivate the callback, call this method with NULL as the
	 * first argument.
	 * While the callback is enabled, calling numAvailableMessages() and
	 * getNextChannelMessage() is still possible, but it will probably always
	 * return 0 as the callback is called as soon as a new message is available.
	 *
	 * @param newCallback the callback function.
	 * @param arg the second argument to be passed to the callback function.
	 *
	 */
	void setCallback(void (*newCallback)(MidiChannelMessage, void*), void* arg=NULL){
		callbackArg = arg;
		messageReadyCallback = newCallback;
		if(newCallback != NULL){
			callbackEnabled = true;
		} else {
			callbackEnabled = false;
		}
	};

	/**
	 * Checks whether there is a callback currently set to be called
	 * every time a new input MidiChannelMessage is available from the
	 * input port.
	 */
	bool isCallbackEnabled(){
		return callbackEnabled;
	};

	/**
	 * Returns the number of unread MidiChannelMessage available from the
	 * input port.
	 *
	 */

	int numAvailableMessages(){
		int num = (writePointer - readPointer + messages.size() ) % messages.size();
		return num;
	}

	/**
	 * Get the oldest channel message in the buffer.
	 *
	 * If this method is called when numAvailableMessages()==0, then
	 * a message with all fields set to zero is returned.
	 *
	 * @return a copy of the oldest message in the buffer
	 */
	MidiChannelMessage getNextChannelMessage(){
		MidiChannelMessage message;
		message = messages[readPointer];
		if(message.getType() == kmmNone){
			message.clear();
		}
		messages[readPointer].setType(kmmNone); // do not use it again
		readPointer++;
		if(readPointer == messages.size()){
			readPointer = 0;
		}
		return message;
	};

//	MidiChannelMessage getNextChannelMessage(){
//		getNextChannelMessage(kmmAny);
//	}
//	MidiControlChangeMessage* getNextControlChangeMessage(){
//		return (MidiControlChangeMessage*)getNextChannelMessage(kmmControlChange);
//	};
//	MidiProgramChangeMessage* getNextProgramChangeMessage(){
//		return (MidiProgramChangeMessage*)getNextChannelMessage(kmmProgramChange);
//	};
//	MidiNoteMessage* getNextNoteOnMessage(){
//		return (MidiNoteMessage*)getNextChannelMessage(kmmNoteOn);
//	};
};


class Midi {
public:
	Midi();
	void setup();
	void cleanup();
	/**
	 * Enable the input MidiParser.
	 *
	 * If the parser is enabled, getInput() will return an error code.
	 * Midi messages should instead be retrieved via, e.g.: getMidiParser()->getNextChannelMessage();
	 *
	 * @param enable true to enable the input MidiParser, false to disable it.
	 */
	void enableParser(bool enable);

	/**
	 * Get access to the input parser in use, if any.
	 *
	 * @return a pointer to the instance of MidiParser, if currently enabled, zero otherwise.
	 */
	MidiParser* getParser();

	/**
	 * Sets the callback to call when a new MidiChannelMessage is available
	 * from the input port.
	 *
	 * Internally, it calls enableParser() and the MidiParser::setCallback();
	 *
	 * @param callback the callback function.
	 * @param arg the second argument to be passed to the callback function.
	 */
	void setParserCallback(void (*callback)(MidiChannelMessage, void*), void* arg=NULL){
		// if callback is not NULL, also enable the parser
		enableParser(callback != NULL); //this needs to be first, as it deletes the parser(if exists)
		getParser()->setCallback(callback, arg);
	}

	/**
	 * Open the specified input Midi port and start reading from it.
	 * @param port Midi port to open
	 * @return 1 on success, -1 on failure
	 */
	int readFrom(const char* port);

	/**
	 * Open the specified output Midi port and prepares to write to it.
	 * @param port Midi port to open
	 * @return 1 on success, -1 on failure
	 */
	int writeTo(const char* port);

	/**
	 * Get received midi bytes, one at a time.
	 * @return  -1 if no new byte is available, -2 on error,
	 * the oldest not yet retrieved midi byte otherwise
	*/
	int getInput();

	/**
	 * Writes a Midi byte to the output port
	 * @param byte the Midi byte to write
	 * @return 1 on success, 0 if output is not enabled, -1 on error
	 */
	int writeOutput(midi_byte_t byte);

	/**
	 * Writes Midi bytes to the output port
	 * @param bytes an array of bytes to be written
	 * @param length number of bytes to write
	 * @return 1 on success, 0 if output is not enabled, -1 on error
	 */
	int writeOutput(midi_byte_t* bytes, unsigned int length);
	

	static midi_byte_t makeStatusByte(midi_byte_t statusCode, midi_byte_t dataByte);
	int writeMessage(midi_byte_t statusCode, midi_byte_t channel, midi_byte_t dataByte);
	int writeMessage(midi_byte_t statusCode, midi_byte_t channel, midi_byte_t dataByte1, midi_byte_t dataByte2);
	int writeNoteOff(midi_byte_t channel, midi_byte_t pitch, midi_byte_t velocity);
	int writeNoteOn(midi_byte_t channel, midi_byte_t pitch, midi_byte_t velocity);
	int writePolyphonicKeyPressure(midi_byte_t channel, midi_byte_t pitch, midi_byte_t pressure);
	int writeControlChange(midi_byte_t channel, midi_byte_t controller, midi_byte_t value);
	int writeProgramChange(midi_byte_t channel, midi_byte_t program);
	int writeChannelPressure(midi_byte_t channel, midi_byte_t pressure);
	int writePitchBend(midi_byte_t channel, uint16_t bend);

	/**
	 * Gives access to the midi parser, if it has been activated.
	 *
	 * @return a pointer to the midi parser if active, zero otherwise
	 */
	MidiParser* getMidiParser();
	virtual ~Midi();

	bool isInputEnabled();

	bool isOutputEnabled();

	/**
	 * Opens all the existing MIDI ports, in the same order returned by the filesystem or Alsa.
	 * Ports open with this method should be closed with destroyPorts()
	 */
	static void createAllPorts(std::vector<Midi*>& ports, bool useParser = false);

	/**
	 * Closes a vector of ports.
	 */
	static void destroyPorts(std::vector<Midi*>& ports);
private:
	char defaultPort[9];
	std::string inPort;
	std::string outPort;
	int _getInput();
	int attemptRecoveryRead();
	static void readInputLoop(void* obj);
	int attemptRecoveryWrite();
	static void writeOutputLoop(void* obj);
	snd_rawmidi_t *alsaIn,*alsaOut;
	std::vector<midi_byte_t> inputBytes;
	unsigned int inputBytesWritePointer;
	unsigned int inputBytesReadPointer;
	std::vector<midi_byte_t> outputBytes;
	MidiParser* inputParser;
	bool parserEnabled;
	bool inputEnabled;
	bool outputEnabled;
	AuxiliaryTask midiInputTask;
	AuxiliaryTask midiOutputTask;
	char* inId;
	char* outId;
	char* outPipeName;
#ifdef XENOMAI_SKIN_native
	RT_PIPE outPipe;
#endif
#ifdef XENOMAI_SKIN_posix
	int sock;
#endif
};


#endif /* MIDI_H_ */
