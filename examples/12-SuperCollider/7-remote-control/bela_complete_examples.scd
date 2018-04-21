/*****
Run the code below from the SuperCollider IDE after you started scsynth on Bela (see -main.scd)

Make sure you have the Bela Remote SC classes are in the extensions directory of your SC installation.
Get them here: https://github.com/sensestage/bela-remote

(c) 2017: Jonathan Reus, Marije Baalman, Giulio Moro, Andrew McPherson
*****/

// connect to an already running server on Bela.
Server.default = s = Server("belaServer", NetAddr("192.168.7.2", 57110));
s.initTree;
s.startAliveThread;


/// AnalogIn

// at audio rate
(
SynthDef("AnalogIn",{ arg out=0;
	Out.ar(out,
		SinOsc.ar( AnalogIn.ar( 0 ).poll.exprange( 200, 5000 ), 0, 0.1 )
	)
}).send(s);
);

a = Synth.new("AnalogIn", target: s).postln;
a.free;

// at control rate:
// step through analog inputs - make your own step sequencer!
(
SynthDef("AnalogIn",{ arg out=0;
	Out.ar(out,
		SinOsc.ar( AnalogIn.kr(
			Stepper.kr(Impulse.kr(1), 0, 0, 7, 1 ).poll
		).poll.exprange( 200, 5000 ), 0, 0.1 )
	)
}).send(s);
);

a = Synth.new("AnalogIn", target: s).postln;
a.free;


/// AnalogOut

// at audio rate
(
SynthDef("AnalogOut",{ arg out=0;
	AnalogOut.ar( out, SinOsc.ar( 10, 0, 0.5, 0.5 ) );
}).send(s);
);

a = Synth.new("AnalogOut", target: s).postln;
a.free;

// at control rate
(
SynthDef("AnalogOut",{ arg out=0;
	AnalogOut.kr( out, SinOsc.kr( 10, 0, 0.5, 0.5 ) );
}).send(s);
);

a = Synth.new("AnalogOut", target: s).postln;
a.free;

// DigitalIn - the input pin cannot be modulated

// at audio rate
(
SynthDef("DigitalIn",{ arg out=0;
	Out.ar(out,
		SinOsc.ar( 500, 0, 0.1 * DigitalIn.ar( 0 ) )
	)
}).send(s);
);

a = Synth.new("DigitalIn", target: s).postln;
a.free;

// at control rate
(
SynthDef("DigitalIn",{ arg out=0;
	Out.ar(out,
		SinOsc.ar( 500, 0, 0.1 * DigitalIn.kr( 0 ) )
	)
}).send(s);
);

a = Synth.new("DigitalIn", target: s).postln;
a.free;



// DigitalOut - the output pin cannot be modulated

// at audio rate
(
SynthDef("DigitalOut",{
	DigitalOut.ar( 0, SinOsc.ar( 10 ) );
}).send(s);
);

a = Synth.new("DigitalOut", target: s).postln;
a.free;

// at control rate
(
SynthDef("DigitalOut",{
	DigitalOut.kr( 0, SinOsc.kr( 10 ) );
}).send(s);
);

a = Synth.new("DigitalOut", target: s).postln;
a.free;


//at audio rate, but use digitalWriteOnce in the backend code
(
SynthDef("DigitalOut",{ arg out=0;
	DigitalOut.ar( 0, SinOsc.ar( 10 ), 1 );
}).send(s);
);

a = Synth.new("DigitalOut", target: s).postln;
a.free;


// DigitalIO

// all arguments at audio-rate
(
SynthDef("DigitalIO",{ arg out=0;
	DigitalIO.ar( out, SinOsc.ar( 10 ), LFPulse.ar( 0.1 ) ).poll; // arguments: digitalpin, outputvalue to write, pin mode
}).send(s);
);

a = Synth.new("DigitalIO", target: s).postln;
a.free;


// all arguments at control-rate
(
SynthDef("DigitalIO",{ arg out=0;
	DigitalIO.kr( out, SinOsc.kr( 10 ), LFPulse.kr( 0.1 ) ).poll;
}).send(s);
);

a = Synth.new("DigitalIO", target: s).postln;
a.free;

// you can also use any mix of audio-rate and control-rate input arguments, if you use DigitalIO.ar


// free anything that may still be hanging
s.freeAll;
