/*******************
Multichannel output

This example sends a sinetone with a different frequency to 8
output channels. Simple send an array to Out.ar.

This example was designed to work with the Bela Mini Multichannel
Expander or the CTAG family of boards.

(c) 2017: Jonathan Reus, Marije Baalman, Giulio Moro, Andrew McPherson
*/

s = Server.default;

s.options.numAnalogInChannels = 2; // can only be 2, 4 or 8
s.options.numAnalogOutChannels = 2;
s.options.numDigitalChannels = 0;
s.options.maxLogins = 4;  	   // set max number of clients
s.options.bindAddress = "0.0.0.0"; // allow anyone on the network connect to this server

s.options.blockSize = 16;
s.options.numInputBusChannels = 8;
s.options.numOutputBusChannels = 8;

s.waitForBoot{
	"Server Booted".postln;
	(
	SynthDef("Multi-out",{ arg out=0;
		// For multichannel output send an array to the output
		Out.ar(0, SinOsc.ar([220, 330, 440, 550, 660, 770, 880, 990], 0, 0.2));
	}).send(s);
	);

	s.sync;
	Synth.new("Multi-out", target: s);
};

ServerQuit.add({ 0.exit }); // quit if the button is pressed
