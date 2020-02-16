
/**************************************************************************************

## Salt SuperCollider Quick Start ##

This file provides an overview of the inputs and outputs available in Salt and Salt+.
Note: I am using NodeProxies as it is my preffered style. For more details on 
proxies see the JITLib help in Supercollider.

(c) 2020: Dionysis Athinaios

***************************************************************************************/

s = Server.default;

s.options.numAnalogInChannels = 8;
s.options.numAnalogOutChannels = 8;
s.options.numDigitalChannels = 16;

s.options.blockSize = 16;
s.options.numInputBusChannels = 2;
s.options.numOutputBusChannels = 2;

s.latency = nil;

s.waitForBoot({ var proxy1;

  proxy1 = NodeProxy.new(s, \audio);
  proxy1.play;

  proxy1.source = {
    var button1, button2, button3, button4,
    cv1in, cv2in, cv3in, cv4in,
    cv5in, cv6in, cv7in, cv8in,
    cv1out, cv2out, cv3out, cv4out,
    cv5out, cv6out, cv7out, cv8out,
    trig1out, trig2out, trig3out, trig4out,
    trig1in, led1, led2, led3, led4; // the other triggerst are the same as the buttons

    button1 = DigitalIn.ar(6);
    button2 = DigitalIn.ar(14);
    button3 = DigitalIn.ar(1);
    button4 = DigitalIn.ar(3);

    trig1in = DigitalIn.ar(15);
    cv1in = AnalogIn.ar(DC.ar(0));
    cv2in = AnalogIn.ar(DC.ar(1));
    cv3in = AnalogIn.ar(DC.ar(2));
    cv4in = AnalogIn.ar(DC.ar(3));
    cv5in = AnalogIn.ar(DC.ar(4));
    cv6in = AnalogIn.ar(DC.ar(5));
    cv7in = AnalogIn.ar(DC.ar(6));
    cv8in = AnalogIn.ar(DC.ar(7));

    // a few LFO's to test the CV outs. For testing
    // patch them to the cv ins controlling the rate
    // of the trig outs below
    cv1out = AnalogOut.ar(0, SinOsc.ar(0.4, mul: 0.5, add: 0.5));
    cv2out = AnalogOut.ar(1, LFSaw.ar(0.4, mul: 0.5, add: 0.5));
    cv3out = AnalogOut.ar(2, LFPulse.ar(0.4, mul: 0.5, add: 0.5));
    cv4out = AnalogOut.ar(3, LFTri.ar(0.4, mul: 0.5, add: 0.5));
    cv5out = AnalogOut.ar(4, LFDNoise0.ar(0.4, mul: 0.5, add: 0.5));
    cv6out = AnalogOut.ar(5, LFDNoise1.ar(0.4, mul: 0.5, add: 0.5));
    cv7out = AnalogOut.ar(6, LFDNoise3.ar(0.4, mul: 0.5, add: 0.5));
    cv8out = AnalogOut.ar(7, LFCub.ar(0.4, mul: 0.5, add: 0.5));

    // patch these to something that responds to triggers
    trig1out = DigitalOut.ar(0,
      // pressing button 2 for trigger out 1
      button2,
      writeMode: 1
    );
    trig2out = DigitalOut.ar(5,
      LFPulse.ar(cv2in.range(0.1, 40), width: 0.5),
      writeMode: 1
    );
    trig3out = DigitalOut.ar(12,
      LFPulse.ar(cv3in.range(0.1, 40), width: 0.5),
      writeMode: 1
    );
    trig4out = DigitalOut.ar(13,
      LFPulse.ar(cv4in.range(0.1, 40), width: 0.5),
      writeMode: 1
    );

    // LED's
    DigitalIO.ar( // this affects all leds
      digitalPin:7, pinMode:1,
      output:LFPulse.ar( freq:(44100/32), width: cv2in.range(0,1))
    );

    // turn cv1 and cv2  pots and observe the results
    led1 = DigitalOut.ar(digitalPin:2,
      output:LFPulse.ar(freq:(44100/32), width: cv1in.range(0,1)),
      writeMode:1);
    led1 = DigitalOut.ar(digitalPin:4,
      output:LFPulse.ar(freq:(44100/32), width: cv1in.range(0, 1)),
      writeMode:1);
    led3 = DigitalOut.ar(digitalPin:8, output:DC.ar(0) ,writeMode:1);
    led4 = DigitalOut.ar(digitalPin:9, output:DC.ar(0),writeMode:1);

    // press button1 to send a trigger and send the values
    // of the analog ins to the post window
    cv1in.poll(button1, "CV in 1");
    cv2in.poll(button1, "CV in 2");
    cv3in.poll(button1, "CV in 3");
    cv4in.poll(button1, "CV in 4");
    cv5in.poll(button1, "CV in 5");
    cv6in.poll(button1, "CV in 6");
    cv7in.poll(button1, "CV in 7");
    cv8in.poll(button1, "CV in 8");

    // testing the audio outs (control with pot 1 and 2)
    Out.ar(0, Impulse.ar(cv1in.exprange(5, 200)));
    Out.ar(1, Saw.ar(cv2in.exprange(5, 200)));
  };

});