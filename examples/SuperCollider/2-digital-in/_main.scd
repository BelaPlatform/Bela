/*******************
Blink a LED using a Tactile Switch
Connect a LED+resistor to digital pin 0
Connect a tactile switch+pull-down resistor to digital pin 1

DigitalOut takes three arguments:
ar (digitalPin: 0, output: 0, writeMode: 0, mul: 1, add: 0)

digitalPin:  Digital pin number to write to. Pin numbers begin at 0. This value cannot be modulated.
Pin numbers are labled in the Pin Diagram tab in the Bela IDE.

output:  Value to write out to the pin - the value will be 1 when the argument is larger than 0, otherwise 0.

writeMode:	Mode of writing to the output, this can be 0 (only when value changes) or 1 (continuously, at audio rate). This value cannot be modulated.

DigitalIn takes one argument:
ar (digitalPin: 0, mul: 1, add: 0)

digitalPin: Digital pin number to read. Pin numbers begin at 0. This value cannot be modulated.

(c) 2017: Jonathan Reus, Marije Baalman, Giulio Moro, Andrew McPherson
*/

s = Server.default;

s.options.numAnalogInChannels = 2;
s.options.numAnalogOutChannels = 2;
s.options.numDigitalChannels = 16;
s.options.maxLogins = 4;  	   // set max number of clients
s.options.bindAddress = "0.0.0.0"; // allow anyone on the network connect to this server

s.options.blockSize = 16;
s.options.numInputBusChannels = 2;
s.options.numOutputBusChannels = 2;

s.waitForBoot{
	SynthDef('buttonControl', {arg inPin, outPin;
		// read the value at the pin
		var button = DigitalIn.ar(inPin);
		// toggle an LED on outPin
		DigitalOut.ar(outPin, button);
		// gate a sinewave
		Out.ar(0, SinOsc.ar(300, 0, 0.2 * button));
	}).add;	
	
	s.sync;
	
	a = Synth('buttonControl', ['inPin', 1, 'outPin', 0]);
};

ServerQuit.add({ 0.exit }); // quit if the button is pressed
