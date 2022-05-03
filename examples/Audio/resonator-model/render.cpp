/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Audio/resonator-model/render.cpp

Resonator Model
--------------


*/

#include <Bela.h>

#include <libraries/Resonators/Resonators.h>
#include <libraries/Resonators/Model.h>

// Example 2: a bank of resonators based on a model file

ResonatorBank resBank;
ResonatorBankOptions resBankOptions = {}; // will initialise to default
ModelLoader model; // ModelLoader is deliberately decoupled from Resonators

bool setup (BelaContext *context, void *userData) {

  model.load("models/marimba.json"); // load a model from a file
  resBankOptions.total = model.getSize();

  resBank.setup(resBankOptions, context->audioSampleRate, context->audioFrames);
  resBank.setBank(model.getModel()); // pass the model parameters to the resonator bank
  resBank.update(); // update the state of the bank based on the model parameters

  return true;
}

void render (BelaContext *context, void *userData) {

  for (unsigned int n = 0; n < context->audioFrames; ++n) {

    float in = audioRead(context, n, 0); // an excitation signal
    float out = 0.0f;

    out = resBank.render(in);

    audioWrite(context, n, 0, out);
    audioWrite(context, n, 1, out);

  }

}

void cleanup (BelaContext *context, void *userData) { }
