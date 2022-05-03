/*
 * Resonators:
 * Resonator
 * ResonatorBank
 * 
 * https://github.com/jarmitage/resonators
 * 
 * Port of [resonators~] for Bela:
 * https://github.com/CNMAT/CNMAT-Externs/blob/6f0208d3a1/src/resonators~/resonators~.c
 */

/*
Copyright (c) 1999.  The Regents of the University of California (Regents).
All Rights Reserved.
Permission to use, copy, modify, and distribute this software and its
documentation for educational, research, and not-for-profit purposes, without
fee and without a signed licensing agreement, is hereby granted, provided that
the above copyright notice, this paragraph and the following two paragraphs
appear in all copies, modifications, and distributions.  Contact The Office of
Technology Licensing, UC Berkeley, 2150 Shattuck Avenue, Suite 510, Berkeley,
CA 94720-1620, (510) 643-7201, for commercial licensing opportunities.
Written by Adrian Freed, The Center for New Music and Audio Technologies,
University of California, Berkeley.
     IN NO EVENT SHALL REGENTS BE LIABLE TO ANY PARTY FOR DIRECT, INDIRECT,
     SPECIAL, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, INCLUDING LOST PROFITS,
     ARISING OUT OF THE USE OF THIS SOFTWARE AND ITS DOCUMENTATION, EVEN IF
     REGENTS HAS BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
     REGENTS SPECIFICALLY DISCLAIMS ANY WARRANTIES, INCLUDING, BUT NOT
     LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
     FOR A PARTICULAR PURPOSE. THE SOFTWARE AND ACCOMPANYING
     DOCUMENTATION, IF ANY, PROVIDED HEREUNDER IS PROVIDED "AS IS".
     REGENTS HAS NO OBLIGATION TO PROVIDE MAINTENANCE, SUPPORT, UPDATES,
     ENHANCEMENTS, OR MODIFICATIONS.
*/

#include "Resonators.h"

ResonatorUtils _setupResonatorUtils (float sampleRate, float framesPerBlock) {
  ResonatorUtils tmp = {};
  tmp.sampleRate     = sampleRate;
  tmp.sampleInterval = 1 / tmp.sampleRate;
  tmp.nyquistLimit   = 0.955 * tmp.sampleRate * 0.5;
  tmp.framesPerBlock = framesPerBlock;
  tmp.frameInterval  = 1 / tmp.framesPerBlock;
  tmp.interpTime     = tmp.frameInterval / tmp.interpTime;
  return tmp;
}

/**************************************************************************
 * Resonator
 *************************************************************************/

Resonator::Resonator(){}
Resonator::Resonator(ResonatorOptions options, float sampleRate, float framesPerBlock) {
  setup (options, sampleRate, framesPerBlock);
}
Resonator::~Resonator(){}

void Resonator::setup (ResonatorOptions options, float sampleRate, float framesPerBlock) {
  opt = options;
  utils = _setupResonatorUtils (sampleRate, framesPerBlock);
}
void Resonator::initParams(const float freq, const float gain, const float decay){
    ResonatorParams tmpParams = {freq, gain, decay};
    setParameters(tmpParams);
    update();
}

// resonator: main update and render functions
void Resonator::update(){ setState(); }
void Resonator::impulse (float impulse) { if (impulse < 0.1) renderUtils.out2 += state.a1Prime * impulse; }
float Resonator::render (float excitation) {
    renderUtils.yo = renderUtils.out1;
    renderUtils.yn = renderUtils.out2;
    renderUtils.x  = renderUtils.yo;
    
    float term1 = state.b1Prev * renderUtils.yo;
    float term2 = state.b2Prev * renderUtils.yn;
    float term3 = state.a1Prev * excitation;
    
    renderUtils.yo = term1 + term2 + term3;
    renderUtils.yn = renderUtils.x;
    
    renderUtils.out1 = renderUtils.yo;
    renderUtils.out2 = renderUtils.yn;
    
    state.a1Prev = state.a1;
    state.b1Prev = state.b1;
    state.b2Prev = state.b2;
  
    return _min(renderUtils.out1 * opt.outGain, utils.hardLimit);
}

// get and set: main functions
void Resonator::setParam(void* theResonator, const int index, const float value){
    Resonator* resonator = (Resonator*) theResonator;
    switch (index){
        case kFreq :
            resonator->params.freq = value;
            break;
        case kGain :
            resonator->params.gain = value;
            break;
        case kDecay :
            resonator->params.decay = value;
            break;
        default :
            printf("[Resonator] setParam(): Invalid Parameter Requested.\n");
            //            rt_printf("[Resonator] setParam(): Invalid Parameter Requested.\n");
    }
}

const float Resonator::getParam(void* theResonator, const int index){
    Resonator* resonator = (Resonator*) theResonator;
    switch (index){
        case kFreq :
            return resonator->params.freq;
        case kGain :
            return resonator->params.gain;
        case kDecay :
            return resonator->params.decay;
        default :
            //rt_printf("[Resonator] getParam(): Invalid Parameter Requested.\n");
            printf("[Resonator] getParam(): Invalid Parameter Requested.\n");
    }
    return -1.0f;
}

// Non-static versions of get and set (that use the static versions.)
void Resonator::setParameter(const int index, const float value){
  setParam(this, index, value);
};
const float Resonator::getParameter(const int index){
  return getParam(this, index);
};
void Resonator::setParameters(ResonatorParams resParams) {
  setParam(this, kFreq, resParams.freq);
  setParam(this, kGain, resParams.gain);
  setParam(this, kDecay, resParams.decay);
}
void Resonator::setParameters(float _freq, float _gain, float _decay){
  setParam(this, kFreq, _freq);
  setParam(this, kGain, _gain);
  setParam(this, kDecay, _decay); 
}
const ResonatorParams Resonator::getParameters() {
  return params;
}

// private methods
void Resonator::setState(){

  // map from normalised input values to param ranges
  params.gain  = mapGain(params.gain); // 0-1 -> 0-0.3
  params.decay = mapDecay(params.decay); // 0-1 -> 0.5-50

  state.freqPrev  = params.freq;
  state.gainPrev  = params.gain;
  state.decayPrev = params.decay;
  
  utils.decaySamples = exp (-params.decay * utils.sampleInterval);
  
  if (0.0 >= params.freq || params.freq >= utils.nyquistLimit ||
      0.0 >= utils.decaySamples || utils.decaySamples > 1.0) {
      clearState();
  }
  else {
      state.freqPrime = params.freq * utils.M_2PI * utils.sampleInterval; // w / pole angle?
      float ts = params.gain * sin (state.freqPrime); // q / pole magnitude?
      state.a1 = ts * (1.0 - utils.decaySamples);
      state.b2 = -utils.decaySamples * utils.decaySamples; // r?
      state.b1 = utils.decaySamples * cos (state.freqPrime) * 2.0; // c? / cutoff?
      state.a1Prime = ts / state.b2;
  }
}
void Resonator::clearRender() {renderUtils.out1 = renderUtils.out2 = 0.0;}
void Resonator::clearState() {state.b1 = state.b2 = state.a1Prime = 0.0;}

float Resonator::mapGain(float inputGain) {

  // map
  float outputGain = _map(inputGain, 0.0, 1.0, paramRanges.gainMin, paramRanges.gainMax);

  // constrain
  if (paramRanges.gainMin > outputGain) outputGain = paramRanges.gainMin;
  if (paramRanges.gainMax < outputGain) outputGain = paramRanges.gainMax;

  return outputGain;

}

float Resonator::mapDecay(float inputDecay) {

  // map
  float outputDecay = _map(inputDecay, 0.0, 1.0, paramRanges.decayMin, paramRanges.decayMax);

  // constrain
  if (paramRanges.decayMin > outputDecay) outputDecay = paramRanges.decayMin;
  if (paramRanges.decayMax < outputDecay) outputDecay = paramRanges.decayMax;

  return outputDecay;

}

/**************************************************************************
 * ResonatorBank
 *************************************************************************/

ResonatorBank::ResonatorBank(){}
ResonatorBank::ResonatorBank(ResonatorBankOptions options, float sampleRate, float framesPerBlock){
    setup (options, sampleRate, framesPerBlock);
}
ResonatorBank::~ResonatorBank(){}

void ResonatorBank::setup(ResonatorBankOptions options, float sampleRate, float framesPerBlock){
    opt = options;
    utils = _setupResonatorUtils (sampleRate, framesPerBlock);
    setupResonators();
}

void ResonatorBank::setResonatorParam(const int resIndex, const int paramIndex, const float value) {
    resBank[resIndex].setParameter(paramIndex, value);
}

const float ResonatorBank::getResonatorParam(const int resIndex, const int paramIndex) {
    return resBank[resIndex].getParameter(paramIndex);
}

void ResonatorBank::setResonator(const int index, const ResonatorParams params) {
    resBank[index].setParameters(params); // &params?
}

const ResonatorParams ResonatorBank::getResonator(const int index) {
    return resBank[index].getParameters();
}

void ResonatorBank::setBank(std::vector<ResonatorParams> bankParams) {
    for (int i = 0; i < opt.total; ++i) setResonator(i, bankParams[i]);
}

const std::vector<ResonatorParams> ResonatorBank::getBank() {
    std::vector<ResonatorParams> resBankParams;
    for (int i = 0; i < opt.total; ++i) resBankParams.push_back(getResonator(i));
    return resBankParams;
}

float ResonatorBank::renderResonator(int index, float excitation){
  return resBank[index].render(excitation);
}

float ResonatorBank::render(float excitation){
  float out = 0.0f;
  for (int i = 0; i < opt.total; ++i) 
    out += renderResonator(i, excitation);
  return _min(out, utils.hardLimit);
}

void ResonatorBank::update(){
  for (int i = 0; i < opt.total; ++i) resBank[i].update();
}

// private methods
void ResonatorBank::setupResonators(){
  if (opt.v) printf ("[ResonatorBank] Initialising bank of %d\n", opt.total);
  opt.updateRTRate *= (utils.sampleRate / 1000.0);
  for (int i = 0; i < opt.total; ++i) {
    Resonator res;
    res.setup (opt.resOpt, utils.sampleRate, utils.framesPerBlock);
    resBank.push_back (res);
  }
}
