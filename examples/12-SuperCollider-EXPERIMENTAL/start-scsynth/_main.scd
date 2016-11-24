/**
 * Please note that support for SuperCollider on Bela is still experimental,
 * so feel free to report issues here: https://github.com/sensestage/supercollider/issues
 *
 * This script simply starts scsynth, which then waits for messages.
 * Use the code in remote-examples to interact with the board from
 * the SuperCollider IDE running on the host.
 */

// NOTE: the settings provided here may not be the most sensible in terms of gains.

s = Server.default;

s.options.numAnalogInChannels = 8;
s.options.numAnalogOutChannels = 8;
s.options.numDigitalChannels = 16;
s.options.maxLogins = 64;  	   // set max number of clients

s.options.pgaGainLeft = 4;     // sets the pga gain of the left channel to 4 dB
s.options.pgaGainRight = 5;    // sets the pga gain of the right channel to 5 dB
s.options.headphoneLevel = -8; // sets the headphone level to -8 dB
s.options.speakerMuted = 0;    // the speakers are not muted (so active)
s.options.dacLevel = -5;       // sets the gain of the dac to -5 dB
s.options.adcLevel = -3;       // sets the gain of the adc to -3 dB
s.options.numMultiplexChannels = 0; // do not enable multiplexer channels
s.options.belaPRU = 0;         // select the PRU on which Bela audio will run

s.options.blockSize = 16;
s.options.numInputBusChannels = 2;
s.options.numOutputBusChannels = 2;

s.options.postln;

s.boot;
