#include "Midi_c.h"

int Midi_availableMessages(Midi* midi){
	return midi->getParser()->numAvailableMessages();
}

unsigned int Midi_getMessage(Midi* midi, unsigned char* buf){
	MidiChannelMessage message;
	message = midi->getParser()->getNextChannelMessage();
	//message.prettyPrint();
	buf[0] = message.getStatusByte() | message.getChannel();
	unsigned char size = message.getNumDataBytes();
	for(int n = 0; n < size; ++n){
		buf[n + 1] = message.getDataByte(n);	
	}
	return size + 1;
}

Midi* Midi_new(const char* port){
	Midi* midi = new Midi();
	if(midi != NULL){
		midi->readFrom(port);
		midi->enableParser(true);
	}
	return midi;
}

void Midi_delete(Midi* midi){
	delete midi;
}
