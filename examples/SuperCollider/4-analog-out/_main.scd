/*******************
Analog Input
Connect analog sources (e.g.: potentiometers, LDR, FSR) to analog input 0 and 1
Connect a an LED+resistor to analog output 0.

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
s.options.numDigitalChannels = 0;
s.options.maxLogins = 16;  	   // set max number of clients

s.options.blockSize = 16;
s.options.numInputBusChannels = 2;
s.options.numOutputBusChannels = 2;

s.waitForBoot{
	"Server Booted".postln;
	SynthDef('ledFade', {
		var rate = AnalogIn.ar(0).exprange(0.3, 20);
		var amp = AnalogIn.ar(1); // returns a value from 0-1
		rate.poll(1); amp.poll(1);
		AnalogOut.ar(0, SinOsc.ar(rate).range(0.0, amp)); // send to Analog Output 0
	}).add;

	s.sync;

	a = Synth('ledFade');
};

