/**
 * Please note that support for SuperCollider on Bela is still experimental,
 * so feel free to report issues here: https://github.com/sensestage/supercollider/issues
 *
 * This script simply starts scsynth, which then waits for messages.
 * Use the code in remote-examples to interact with the board from
 * the SuperCollider IDE running on the host.
 */

s = Server.default;

s.options.numAnalogInChannels = 8;
s.options.numAnalogOutChannels = 8;
s.options.numDigitalChannels = 16;

s.options.pgaGainLeft = 4;
s.options.pgaGainRight = 5;
s.options.headphoneLevel = -8;
s.options.speakerMuted = 0;
s.options.dacLevel = -5;
s.options.adcLevel = -3;
s.options.numMultiplexChannels = 0;

s.options.blockSize = 16;
s.options.numInputBusChannels = 2;
s.options.numOutputBusChannels = 2;

s.options.postln;

s.boot;
