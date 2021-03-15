/*******************
This example shows you how to send signals to the Bela scope.

We generate a series of sine oscillators which are modulated in frequency and
amplitude by a series of LFOs. Open the Bela scope via the button on the bottom
menu to see the signals.
*/

s = Server.default;

s.options.numAnalogInChannels = 8;
s.options.numAnalogOutChannels = 8;
s.options.numDigitalChannels = 16;
s.options.numInputBusChannels = 2;
s.options.numOutputBusChannels = 2;
s.options.maxLogins = 4;

s.options.belaMaxScopeChannels = 8;

s.waitForBoot({
	SynthDef("help-scope",{ arg out=0;
		var in = SoundIn.ar([0,1]).belaScope(0);
		var sin = SinOsc.ar(TExpRand.kr(50,1000,Dust.kr(1!5)).lag2(1)) * LFNoise2.ar(1!5).exprange(0.01,1);
		sin.belaScope(2);
		Out.ar(out, Pan2.ar(sin,[-1,1])+in);
	}).play;
});

ServerQuit.add({ 0.exit }); // quit if the button is pressed
