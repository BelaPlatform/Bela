/*****
Run the code below from the SuperCollider IDE after you started scsynth on Bela (see -main.scd)

Make sure you have the Bela Remote SC classes are in the extensions directory of your SC installation.
Get them here: https://github.com/sensestage/bela-remote

(c) 2017: Jonathan Reus, Marije Baalman, Giulio Moro, Andrew McPherson
*****/


( // connect to the already-running remote belaserver
Server.default = s = Server("belaServer", NetAddr("192.168.7.2", 57110));
s.options.maxLogins = 4; // should match the settings on the Bela
s.initTree;
s.startAliveThread;
);

// Communicate with the server
s.plotTree; // show all active nodes
s.freeAll;  // free all nodes

(
SynthDef('karp', {arg freq=200, amp=0.5, pan=0, dur=1, trig=1, delaytime=2, decaytime=2, coef=0.1;
		var sig, env;
	coef.poll(2);
		sig = Pluck.ar(WhiteNoise.ar(1), trig, delaytime, freq.reciprocal, decaytime, coef);
		env = EnvGen.ar(Env.perc(0.01, dur), trig, doneAction: 2);
		Out.ar(50, Pan2.ar(sig * env * amp, pan));
}).add;
);

Ndef('mix', {
	var sig = In.ar(50, 2);
	Out.ar(0, FreeVerb.ar(sig));
}).play;



Synth('karp', ['dur', 20, 'freq', 62.midicps, 'amp', 1.0, 'decaytime', 0.5, 'coef', 0.1]);

(
p = Pdef('arp', Pbind('instrument', 'karp',
	'freq', Pseq(Scale.major.ratios * [0.5, 1, 2, 4] * 220, inf),
	'amp', 0.5,
	'dur', 0.3,
	'coef', 0.6,
	'decaytime', 3,
	'delaytime', 4
)).play(quant: 4);
);

p.stop;
