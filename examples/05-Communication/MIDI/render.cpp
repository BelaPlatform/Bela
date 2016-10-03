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
#include <stdlib.h>
#include <rtdk.h>
#include <cmath>

float gFreq;
float gPhaseIncrement = 0;
bool gIsNoteOn = 0;
int gVelocity = 0;
float gSamplingPeriod = 0;

/*
 * This callback is called every time a new input Midi message is available
 *
 * Note that this is called in a different thread than the audio processing one.
 *
 */
void midiMessageCallback(MidiChannelMessage message, void* arg){
	if(arg != NULL){
		rt_printf("Message from midi port %s ", (const char*) arg);
	}
	message.prettyPrint();
	if(message.getType() == kmmNoteOn){
		gFreq = powf(2, (message.getDataByte(0)-69)/12.0f) * 440;
		gVelocity = message.getDataByte(1);
		gPhaseIncrement = 2 * M_PI * gFreq * gSamplingPeriod;
		gIsNoteOn = gVelocity > 0;
		rt_printf("v0:%f, ph: %6.5f, gVelocity: %d\n", gFreq, gPhaseIncrement, gVelocity);
	}
}

Midi midi;

bool gUseAlsa = false;
const char* gMidiPort0 = "/dev/midi1";
// bool gUseAlsa = true;
// const char* gMidiPort0 = "hw:1,0,0";

bool setup(BelaContext *context, void *userData)
{
	midi.useAlsa(gUseAlsa);
	midi.readFrom(gMidiPort0);
	midi.writeTo(gMidiPort0);
	midi.enableParser(true);
	midi.setParserCallback(midiMessageCallback, (void*) gMidiPort0);
	if(context->analogFrames == 0) {
		rt_printf("Error: this example needs the analog I/O to be enabled\n");
		return false;
	}

	if(context->audioOutChannels < 2 ||
		context->analogOutChannels < 2){
		printf("Error: for this project, you need at least 2 analog and audio output channels.\n");
		return false;
	}

	gSamplingPeriod = 1/context->audioSampleRate;
	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available). If only audio is available, numMatrixFrames
// will be 0.


enum {kVelocity, kNoteOn, kNoteNumber};
void render(BelaContext *context, void *userData)
{

// one way of getting the midi data is to parse them yourself
//	(you should set midi.enableParser(false) above):
/*
	static midi_byte_t noteOnStatus = 0x90; //on channel 1
	static int noteNumber = 0;
	static int waitingFor = kNoteOn;
	static int playingNote = -1;
	int message;
	while ((message = midi.getInput()) >= 0){
		rt_printf("%d\n", message);
		switch(waitingFor){
		case kNoteOn:
			if(message == noteOnStatus){
				waitingFor = kNoteNumber;
			}
			break;
		case kNoteNumber:
			if((message & (1<<8)) == 0){
				noteNumber = message;
				waitingFor = kVelocity;
			}
			break;
		case kVelocity:
			if((message & (1<<8)) == 0){
				int _velocity = message;
				waitingFor = kNoteOn;
				// "monophonic" behaviour, with priority to the latest note on
				// i.e.: a note off from a previous note does not stop the current note
				// still you might end up having a key down and no note being played if you pressed and released another
				// key in the meantime
				if(_velocity == 0 && noteNumber == playingNote){
					noteOn = false;
					playingNote = -1;
					velocity = _velocity;
				} else if (_velocity > 0) {
					noteOn = true;
					velocity = _velocity;
					playingNote = noteNumber;
					f0 = powf(2, (playingNote-69)/12.0f) * 440;
					phaseIncrement = 2 * M_PI * f0 / context->audioSampleRate;
				}
				rt_printf("NoteOn: %d, NoteNumber: %d, velocity: %d\n", noteOn, noteNumber, velocity);
			}
			break;
		}
	}
	*/

	/*
	 *
	 * alternatively, you can use the built-in parser (only processes channel messages at the moment).
	 *
	int num;
	while((num = midi.getParser()->numAvailableMessages()) > 0){
		static MidiChannelMessage message;
		message = midi.getParser()->getNextChannelMessage();
		message.prettyPrint();
		if(message.getType() == kmmNoteOn){
			f0 = powf(2, (message.getDataByte(0)-69)/12.0f) * 440;
			velocity = message.getDataByte(1);
			phaseIncrement = 2 * M_PI * f0 / context->audioSampleRate;
			noteOn = velocity > 0;
			rt_printf("v0:%f, ph: %6.5f, velocity: %d\n", f0, phaseIncrement, gVelocity);
		}
	}
	 */

	/*
	 * A third alternative, the one currently active in this example, is to set a callback 
	 * which gets called every time a new input message is available.
	 * See midiMessageCallback above.
	*/

	// the following block toggles the LED on an Owl pedal
	// using MIDI control changes
	for(unsigned int n = 0; n < context->analogFrames; n++){
		static int count = 0;
		static bool state = 0;
		analogWriteOnce(context, n, 1, state);
		if(count % 20000 == 0){
			state = !state;
			midi_byte_t bytes[3] = {176, 30, (midi_byte_t)(state*127)}; // toggle the OWL led
			midi.writeOutput(bytes, 3);
		}
		++count;
	}
	for(unsigned int n = 0; n < context->audioFrames; n++){
		if(gIsNoteOn == 1){
			static float phase = 0;
			phase += gPhaseIncrement;
			if(phase > 2 * M_PI)
				phase -= 2 * M_PI;
			float value = sinf(phase) * gVelocity/128.0f;
			audioWrite(context, n, 0, value);
			audioWrite(context, n, 1, value);
		} else {
			audioWrite(context, n, 0, 0);
			audioWrite(context, n, 1, 0);
		}
	}
}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().

void cleanup(BelaContext *context, void *userData)
{

}

/**
\example 05-Communication/MIDI/render.cpp

Connecting MIDI devices to Bela!
-------------------------------

This example needs documentation.

*/
