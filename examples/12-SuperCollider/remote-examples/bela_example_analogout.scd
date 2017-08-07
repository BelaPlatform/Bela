/**
 This file contains code that should be run on your computer from
 within the SuperCollider IDE, while `scsynth` is running on the board.

 In order to start `scsynth`, run the `12-SuperCollider/start-scsynth`
 example project or run the `scripts/scsynth.sh` script from a terminal
 on the host.

 You will need to add the class files for the Bela-specific UGens to your
 computer in order to run these scripts. You can get them here
 https://github.com/sensestage/bela-remote
 */
Server.default = s = Server("belaServer", NetAddr("192.168.7.2", 57110));
s.initTree;
s.startAliveThread;

fork{
	s.sync;

	(
	SynthDef("help-AnalogOut",{ arg out=0;
	    AnalogOut.ar( out, SinOsc.ar( 10, 0, 0.5, 0.5 ) );
	}).send(s);
	);

	s.sync;
	Synth.new("help-AnalogOut", target: s).postln;
};
