/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Audio/resonator-basic/render.cpp

Resonator Basic
--------------


*/

#include <Bela.h>

#include <libraries/Resonators/Resonators.h>

Resonator resonator;
ResonatorOptions options; // will initialise to default

bool setup (BelaContext *context, void *userData) {

  resonator.setup(options, context->audioSampleRate, context->audioFrames);
  resonator.setParameters(432, 0.5, 0.05); // freq, gain, decay
  resonator.update(); // update the state of the resonator based on the new parameters

  return true;
}

void render (BelaContext *context, void *userData) {

  for (unsigned int n = 0; n < context->audioFrames; ++n) {

    float in = audioRead(context, n, 0); // an excitation signal
    float out = 0.0f;

    out = resonator.render(in);

	for(unsigned int ch = 0; ch < context->audioOutChannels; ch++)
    	audioWrite(context, n, ch, out);

  }

}

void cleanup (BelaContext *context, void *userData) { }
