/*******************
Analog Input
Connect analog sources (e.g.: potentiometers, LDR, FSR) to analog input 0 and 1
Connect a LED+resistor to analog output 0

AnalogIn returns a value from 0-1

.ar (analogPin: 0, mul: 1, add: 0)

analogPin:  Analog pin number to read. Pin numbers begin at 0. This value can be modulated at audiorate.

AnalogOut writes a signal to one of the Bela's analog output pins

.ar (analogPin: 0, output: 0, mul: 1, add: 0)

analogPin:	Analog pin number to write to. Pin numbers begin at 0. This value can be modulated at audiorate.

output:		Value to write out to the pin.

(c) 2017: Jonathan Reus, Marije Baalman, Giulio Moro, Andrew McPherson
*/

s = Server.default;

s.options.numAnalogInChannels = 2; // can only be 2, 4 or 8
s.options.numAnalogOutChannels = 2;
s.options.numDigitalChannels = 16;
s.options.maxLogins = 4;  	   // set max number of clients

s.options.blockSize = 16;
s.options.numInputBusChannels = 2;
s.options.numOutputBusChannels = 2;

s.waitForBoot{
	SynthDef('looper', {arg buf, outChan=0;
		var ctrl = AnalogIn.ar(0);
		var sig = PlayBuf.ar(1, buf, rate: ctrl.range(0.4, 5.0), loop: 1);
		ctrl.poll(0.5);
		Out.ar(outChan, sig.dup);
	}).add;

	b = Buffer.alloc(s, 44100 * 1.0, 1);

	SynthDef('record', {arg buf;
		var in = SoundIn.ar(0);
		var button = DigitalIn.ar(7);
		button.poll(0.5);
		RecordBuf.ar(in, buf, run: button, trigger: button);
	}).add;

	s.sync;

	l = Synth('looper', ['buf', b]);
	r = Synth('record', ['buf', b]);
};






