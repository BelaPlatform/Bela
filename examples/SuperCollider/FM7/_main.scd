/*
Fm7 example

This example generates a slow modulating drone using the FM7 plugin. You need the sc3-plugins installed in order for this to work (get them from https://github.com/giuliomoro/supercollider/releases if you don't have them).

(c) 2018: David Meckin
*/

s = Server.default;

s.options.numAnalogInChannels = 8;
s.options.numAnalogOutChannels = 8;
s.options.numDigitalChannels = 16;

s.options.blockSize = 16;
s.options.numInputBusChannels = 2;
s.options.numOutputBusChannels = 2;

s.options.headphoneLevel = -18;

s.options.postln;

s.waitForBoot({

SynthDef(\fm7BelaTest,
	{|freq = 220, attackTime = 0.5, releaseTime = 4, gate = 1|
    var ctls = [
        // freq, phase, amp
		[ freq, 0,    1   ],
		[ freq*2, pi/2, 1],
		[ 0,    0,    0   ],
		[ 0,   0,    0   ],
		[ 0,   0,    0   ],
		[ 0,   0,    0   ]
    ];
	var mods = [
		[SinOsc.kr(0.001,0, 1.3), SinOsc.kr(2,0,1), 0, SinOsc.kr(0.015,0,1), 0, 0],
		[SinOsc.kr(0.0012,0, 0.3), SinOsc.kr(1.5,0,0.5), 0, SinOsc.kr(0.025,0,1), 0, 0],
		[0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0],
		[0, 0, 0, 0, 0, 0]
    ];
	var env = EnvGen.kr(Env.adsr(attackTime, 1, 1, releaseTime),gate,doneAction:2);
	var fm = FM7.ar(ctls, mods).at([0,1])*env;
	Out.ar(0,fm);
}).send(s);

  s.sync;
  ~synth = Synth(\fm7BelaTest, [\freq, 110, \attackTime, 3], target: s);
});
