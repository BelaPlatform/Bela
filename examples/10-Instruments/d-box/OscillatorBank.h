/*
 * OscillatorBank.h
 *
 *  Created on: May 23, 2014
 *      Author: Victor Zappi and Andrew McPherson
 */

#ifndef OSCILLATORBANK_H_
#define OSCILLATORBANK_H_


#include <string>

#include "spear_parser.h"
#include "ADSR.h"
#include "config.h"

using namespace std;

enum OscBankstates {bank_stopped, bank_playing, bank_toreset};

class OscillatorBank
{
public:
	OscillatorBank();
	OscillatorBank(string filename, int hopsize=-1, int samplerate=44100);
	OscillatorBank(char *filename, int hopsize=-1, int samplerate=44100);
	~OscillatorBank();
	float *oscillatorPhases;
	float *oscillatorNormFrequencies;
	float *oscillatorNormFreqDerivatives;
	float *oscillatorAmplitudes;
	float *oscillatorAmplitudeDerivatives;
	float *oscStatNormFrequenciesMean;
	float *oscStatNumHops;
	OscBankstates state;
	bool note;
	int actPartNum;
	unsigned int *actPart;
	int hopCounter;
	int lookupTableSize;
	float *lookupTable;
	float ampTh;
	int hopNumTh;
	float pitchMultiplier;
	float freqMovement;
	int filterNum;
	float filterFreqs[5];
	float filterQ[5];
	float filterMaxF;
	float filterAmpMinF;
	float filterAmpMaxF;
	float filterAmpMul;

	bool loadFile(string filename, int hopsize=-1, int samplerate=44100);
	bool loadFile(char *filename, int hopsize=-1, int samplerate=44100);
	bool initBank(int oversamp=1);
	void resetOscillators();
	int getHopSize() { return hopSize; }
	void nextHop();
	void setLoopHops(int start, int end);
	void play(float vel);
	void stop();
	void afterTouch(float vel);
	int getEnvelopeState();
	float getFrequencyScaler();
	void setSpeed(float sp);
	float getSpeed();
	float getMaxSpeed();
	float getMinSpeed();
	void setJumpHop(int hop);
	int getLastHop();
	int getCurrentHop() { return currentHop; }

private:

	bool loaded;
	int numOfPartials;
	int numOfOscillators;
	int partialsHopSize;
	int overSampling;
	int hopSize;
	int hopSizeReminder;
	int oscBankHopSize;
	float frequencyScaler;
	float nyqNorm;
	int lastHop;
	int currentHop;
	int	loopDir;
	int loopDirShift;
	int loopStartHop;
	int loopEndHop;
	int *indicesMapping;
	float *phaseCopies;
	float *oscillatorNextNormFreq;
	float *oscillatorNextAmp;
	float *nextNormFreqCopies;
	float *nextAmpCopies;
	float *freqFixedDeltas;
	float *ampFixedDeltas;
	bool *nyquistCut;
	Spear_parser parser;
	Partials *partials;
	ADSR adsr;
	float minAttackTime;
	float deltaAttackTime;
	float minReleaseTime;
	float deltaReleaseTime;
	int envState;
	int rate;
	float speed;
	float nextSpeed;
	float maxSpeed;
	float minSpeed;
	int jumpHop;
	float adsrVal;
	float prevAdsrVal;
	float prevAmpTh;
	int prevHopNumTh;
	float prevPitchMultiplier;
	float prevFreqMovement;
	int prevFilterNum;
	float prevFilterFreqs[5];
	float prevFilterQ[5];

	bool loader(char *filename, int hopsize=-1, int samplerate=44100);
	void addFakeOsc();
	void nextOscBankHop();
	void nextPartialHop();
	int jumpToHop();
	void setDirection(int dir);
	int nextEnvState();
	void checkDirection();
	void checkSpeed();
	int checkJump();
	bool checkOversampling();
	void updatePrevControls();
	float calculateParDamping(int parIndex, int hopNTh, float adsrVl, float nextFreq,
							  int filNum, float *filFreq, float *filQ);
};

inline bool OscillatorBank::loadFile(string filename, int hopsize, int samplerate)
{
	return loader((char *)filename.c_str(), hopsize, samplerate);
}

inline bool OscillatorBank::loadFile(char *filename, int hopsize, int samplerate)
{
	return loader(filename, hopsize, samplerate);
}

inline void OscillatorBank::setLoopHops(int start, int end)
{
	if(start > end)
		end = start;

	if(start<0)
		start = 0;
	else if(start>lastHop)
		start = 0;
	if(end < 1)
		end = 1;
	end = (end<=lastHop) ? end : lastHop;

	// set it, take into consideration hop oversampling
	loopStartHop = start*overSampling;
	loopEndHop	 = end*overSampling;
}

inline void OscillatorBank::stop()
{
	note = false;
	adsr.gate(0);
}

inline float OscillatorBank::getFrequencyScaler()
{
	return frequencyScaler;
}

inline void OscillatorBank::afterTouch(float vel)
{
	hopNumTh = log((1-vel)+1)/log(2)*20000;
	if(adsr.getState()==env_attack)
		adsr.setAttackRate( (minAttackTime + ( (1-vel)*deltaAttackTime )) * rate );
	adsr.setReleaseRate( (minReleaseTime+(1-vel)*deltaReleaseTime)* rate );
}

inline int OscillatorBank::getEnvelopeState()
{
	return envState;
}

inline void OscillatorBank::setSpeed(float sp)
{
	nextSpeed = sp;
}

inline float OscillatorBank::getSpeed()
{
	return speed;
}

inline float OscillatorBank::getMaxSpeed()
{
	return maxSpeed;
}

inline float OscillatorBank::getMinSpeed()
{
	return minSpeed;
}

inline void OscillatorBank::setJumpHop(int hop)
{
	if(hop<0)
		return;
	hop = (hop<=lastHop) ? hop : lastHop;
	jumpHop = hop;
}

inline void OscillatorBank::setDirection(int dir)
{
	if(dir>=0)
	{
		loopDir			= 1;
		loopDirShift	= 0;
	}
	else
	{
		loopDir			= -1;
		loopDirShift	= 1;
	}
}

inline int OscillatorBank::getLastHop()
{
	return lastHop;
}
#endif /* OSCILLATORBANK_H_ */
