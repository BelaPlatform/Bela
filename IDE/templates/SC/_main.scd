/*
This script exemplifies the use of SuperCollider on Bela.
When a project contains a `_main.scd` file, `sclang` is started
and the content of the file is executed.
The examples in SuperCollider/ include more code examples to interface
with Bela-specific UGens.
If you want to interact with SuperCollider running on the board
from within the SuperCollider IDE on your computer, check out 
the SuperCollider/7-remote-control examples instead.
*/
s = Server.default;

s.options.numAnalogInChannels = 8;
s.options.numAnalogOutChannels = 8;
s.options.numDigitalChannels = 16;

s.options.blockSize = 16;
s.options.numInputBusChannels = 2;
s.options.numOutputBusChannels = 2;

s.options.postln;

s.waitForBoot({
  // modulate frequency of a sine oscillator
  (
  SynthDef("help-AnalogIn",{ arg out=0;
    Out.ar(out,
      SinOsc.ar( AnalogIn.ar( DC.ar( 0 ) ).exprange( 200, 5000 ), 0, 0.1 )
      )
  }).send(s);
  );

  s.sync;
  Synth.new("help-AnalogIn", target: s);
});
ServerQuit.add({ 0.exit }); // quit if the button is pressed
