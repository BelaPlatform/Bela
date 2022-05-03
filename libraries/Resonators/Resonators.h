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

#include <cmath>
#include <stdio.h>
#include <vector>
#include <string>

/**************************************************************************
 * Resonator
 *************************************************************************/

#ifndef Resonator_H_
#define Resonator_H_

typedef struct _ResonatorOptions {
    float outGain = 100.0f;
} ResonatorOptions;

typedef struct _ResonatorParams {
    
    float freq;
    float gain;
    float decay;
    
} ResonatorParams;

typedef struct _ResonatorUtils {
    
    float sampleRate;
    float sampleInterval;
    float decaySamples;
    float nyquistLimit;
    float framesPerBlock;
    float frameInterval;
    float interpTime = 16; // in blocks / MAGIC NUMBER!
    float M_2PI = M_PI * 2.0;
    float hardLimit = 0.999;
    
} ResonatorUtils;

class Resonator {
public:
    
    enum ResonatorParamsEnum {
        kFreq,
        kGain,
        kDecay
    };
    
    Resonator();
    Resonator(ResonatorOptions options, float sampleRate, float framesPerBlock);
    ~Resonator();
    
    // setup and initialisation
    void setup (ResonatorOptions options, float sampleRate, float framesPerBlock);
    void initParams(const float freq, const float gain, const float decay);
    
    // resonator: main update and render functions
    void update();
    void impulse (float impulse);
    float render (float excitation);
    
    // get and set: main functions
    void setParam(void* theResonator, const int index, const float value);
    const float getParam(void* theResonator, const int index);
    
    // Non-static versions of get and set (that use the static versions.)
    void setParameter(const int index, const float value);
    const float getParameter(const int index);
    void setParameters(ResonatorParams resParams);
    void setParameters(float _freq, float _gain, float _decay);
    const ResonatorParams getParameters();
    
private:
    ResonatorOptions opt = {};
    ResonatorParams params = {};
    ResonatorUtils utils = {};
    
    struct State
    {
        float freqPrev;
        float gainPrev;
        float decayPrev;
        float freqPrime;
        float a1;
        float b1;
        float b2;
        float a1Prev;
        float b1Prev;
        float b2Prev;
        float a1Prime;
    };
    State state = {};
    
    struct RenderUtils {
        float x;
        float yo;
        float yn;
        float out1;
        float out2;
    };
    RenderUtils renderUtils = {};
    
    // private methods
    void setState();
    void clearRender();
    void clearState();

    struct ParameterRanges
    {
        float gainMin;
        float gainMax;
        float decayMin;
        float decayMax;
    };
    const ParameterRanges paramRanges = {0,0.3,0.05,50.0};

    float mapGain(float inputGain);
    float mapDecay(float inputDecay);
    
};

#endif /* Resonator_H_ */

/**************************************************************************
 * ResonatorBank
 *************************************************************************/

#ifndef ResonatorBank_H_
#define ResonatorBank_H_

typedef struct _ResonatorBankOptions {
    
    bool res = true; // global on/off
    int  total; // total resonators
    bool render = true; // should render
    bool updateRT = true; // should update in real-time
    int  updateRTRate; // millis
    bool v = true; // verbose printing

    ResonatorOptions resOpt = {};
    
} ResonatorBankOptions;

class ResonatorBank {
public:
    ResonatorBank();
    ResonatorBank(ResonatorBankOptions options, float sampleRate, float framesPerBlock);
    ~ResonatorBank();
    
    void setup(ResonatorBankOptions options, float sampleRate, float framesPerBlock);

    void setResonatorParam(const int resIndex, const int paramIndex, const float value);
    const float getResonatorParam(const int resIndex, const int paramIndex);
    void setResonator(const int index, const ResonatorParams params);
    const ResonatorParams getResonator(const int index);
    void setBank(std::vector<ResonatorParams> bankParams);
    const std::vector<ResonatorParams> getBank();
    
    float renderResonator(int index, float excitation);
    float render(float excitation);    
    void update();

private:
    ResonatorBankOptions opt = {};
    ResonatorUtils utils = {};
    
    std::vector<Resonator> resBank;
    
    void setupResonators();
    
};

static inline float _map(float x, float in_min, float in_max, float out_min, float out_max)
{
    return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

static inline float _min(float x, float y)
{
    return (x < y)? x : y;
}

#endif /* ResonatorBank_H_ */
