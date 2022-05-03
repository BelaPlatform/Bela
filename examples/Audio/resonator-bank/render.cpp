/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Audio/resonator-bank/render.cpp

Resonator Bank
--------------

Example 4: multiple banks of resonators based on a model file, tranposed up a scale

*/

#include <vector>
#include <Bela.h>

#include <libraries/Resonators/Resonators.h>
#include <libraries/Resonators/Model.h>

std::vector<ResonatorBank> resBank;
ResonatorBankOptions resBankOptions = {};
std::vector<std::string> pitches = {"c4", "d4", "e4", "f4"};

std::vector<float> piezo;

ModelLoader model;

int audioPerAnalog;

bool setup (BelaContext *context, void *userData) {

  model.load("models/marimba.json");
  resBankOptions.total = model.getSize();

  resBank.reserve(pitches.size());
  piezo.reserve(pitches.size());

  for (int i = 0; i < pitches.size(); ++i) {

    ResonatorBank tmpRB;
    tmpRB.setup(resBankOptions, context->audioSampleRate, context->audioFrames);
    tmpRB.setBank(model.getShiftedToNote(pitches[i]));
    tmpRB.update();

    resBank.push_back (tmpRB);

    float tmpF = 0.0f;
    piezo.push_back(tmpF);

  }

  audioPerAnalog = context->audioFrames / context->analogFrames;

  updateModelTaskInterval *= (int)(context->audioSampleRate / 1000); // ms to samples

  if ((updateModelTask = Bela_createAuxiliaryTask (&updateModel, 80, "update-model")) == 0) return false;

  return true;
}

void render (BelaContext *context, void *userData) {

  for (unsigned int n = 0; n < context->audioFrames; ++n) {

    if (audioPerAnalog && ! (n % audioPerAnalog))
      for (int i = 0; i < pitches.size(); ++i) piezo[i] = analogRead(context, n, i);

    float out = 0.0f;
    for (int i = 0; i < pitches.size(); ++i) out += resBank[i].render(piezo[i]);

    audioWrite(context, n, 0, out);
    audioWrite(context, n, 1, out);

  }

}

void cleanup (BelaContext *context, void *userData) { }
