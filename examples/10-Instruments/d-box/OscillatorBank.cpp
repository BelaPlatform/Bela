/*
 * OscillatorBank.cpp
 *
 *  Created on: May 23, 2014
 *      Author: Victor Zappi and Andrew McPherson
 */


/*
 * There is a problem with name consistency between this class and the Parser class in spear_parser files.
 * There, a "frame" is each of the time values where partials are sampled, while a "hop" is the actual jump between frames [calculated in samples]
 * Here, "hop" is used with the meaning of "frame", while "frame" became the local frame of a partial
 *
 * example
 *
 * frames:	0		1		2
 * p0				p0_0 	p0_1
 * p1		p1_0	p1_1 	p1_2
 * p2		p2_0	p2_1
 *
 * 	In this case:
 * 		 in Parser there are 2 hops, 3 total frames and the 3 partials have respectively 2, 3 and 2 local frames
 *
 * 		 here there are 3 total hops [the concept of jumps is discarded, cos not in use] and the 3 partials have respectively 2, 3 and 2 frames
 *
 * 	This must be fixed
*/

// TODO: fix hop-frame name consistency


#include <stdlib.h>

#include "OscillatorBank.h"

OscillatorBank::OscillatorBank() {
	loaded = false;
}

OscillatorBank::OscillatorBank(string filename, int hopsize, int samplerate) {
	loaded = false;
	loadFile(filename.c_str(), hopsize, samplerate);
}

OscillatorBank::OscillatorBank(char *filename, int hopsize, int samplerate) {
	loaded = false;
	loadFile(filename, hopsize, samplerate);
}

OscillatorBank::~OscillatorBank() {
	free(oscillatorPhases);
	free(oscillatorNextNormFreq);
	free(oscillatorNextAmp);
	free(oscillatorNormFrequencies);
	free(oscillatorAmplitudes);
	free(oscillatorNormFreqDerivatives);
	free(oscillatorAmplitudeDerivatives);
	free(phaseCopies);
	free(nextNormFreqCopies);
	free(nextAmpCopies);

	delete[] oscStatNormFrequenciesMean;
	delete[] oscStatNumHops;
	delete[] lookupTable;
	delete[] indicesMapping;
	delete[] freqFixedDeltas;
	delete[] ampFixedDeltas;
	delete[] nyquistCut;
}

bool OscillatorBank::initBank(int oversamp) {
	if (!loaded)
		return false;

	//---prepare look-up table
	lookupTableSize = 1024;
	lookupTable		= new float[lookupTableSize + 1];
	for (int n = 0; n < (lookupTableSize + 1); n++)
		lookupTable[n] = sin(2.0 * M_PI * (float) n / (float) lookupTableSize);
	frequencyScaler = (float) lookupTableSize / rate;
	nyqNorm			= rate / 2 * frequencyScaler;

	if (oversamp < 1)
		oversamp = 1;

	//---prepare oscillators
	partials = &(parser.partials); // pointer to paser's partials
	partialsHopSize = parser.getHopSize();
	lastHop = partials->getHopNum(); // last bank hop is equal to last partial frame, which is equal to partial hop num
	overSampling = oversamp;
	hopSize = partialsHopSize / overSampling; // if oversampling, osc bank hop num > partials hop num
	hopSizeReminder = partialsHopSize % overSampling;
	oscBankHopSize = hopSize;
	numOfPartials = partials->getPartialNum();
	numOfOscillators = partials->getMaxActivePartialNum(); // get the maximum number of active partials at the same time

	// set to next multiple of 4 [NEON]
	numOfOscillators = (numOfOscillators + 3) & ~0x3; // to be sure we can add up to 3 fake oscillators

	int err;
	//---allocate buffers
	// alligned buffers [NEON]
	err = posix_memalign((void**) &oscillatorPhases, 16,
			numOfOscillators * sizeof(float));
	err += posix_memalign((void**) &oscillatorNextNormFreq, 16,
			numOfOscillators * sizeof(float));
	err += posix_memalign((void**) &oscillatorNextAmp, 16,
			numOfOscillators * sizeof(float));
	err += posix_memalign((void**) &oscillatorNormFrequencies, 16,
			numOfOscillators * sizeof(float));
	err += posix_memalign((void**) &oscillatorAmplitudes, 16,
			numOfOscillators * sizeof(float));
	err += posix_memalign((void**) &oscillatorNormFreqDerivatives, 16,
			numOfOscillators * sizeof(float));
	err += posix_memalign((void**) &oscillatorAmplitudeDerivatives, 16,
			numOfOscillators * sizeof(float));
	err += posix_memalign((void**) &phaseCopies, 16,
			numOfOscillators * sizeof(float));
	err += posix_memalign((void**) &nextNormFreqCopies, 16,
			numOfOscillators * sizeof(float));
	err += posix_memalign((void**) &nextAmpCopies, 16,
			numOfOscillators * sizeof(float));

	// regular ones
	oscStatNormFrequenciesMean	= new float[numOfPartials];
	oscStatNumHops				= new float[numOfPartials];
	indicesMapping				= new int[numOfPartials];
	freqFixedDeltas				= new float[numOfPartials];
	ampFixedDeltas				= new float[numOfPartials];
	nyquistCut 					= new bool[numOfPartials];

	if (err > 0) {
		dbox_printf("Failed memory allocations %@#!\n");
		return false;
	}

	// copy stats [they do not change]
	for (int n = 0; n < numOfPartials; n++) {
		oscStatNormFrequenciesMean[n] = partials->partialFreqMean[n]
				* frequencyScaler;
		oscStatNumHops[n] = partials->partialNumFrames[n]; // in Parser and Partials "frames" are what we call here "hops" [see comment at top of file]
	}

	// deafult values
	actPartNum		= 0;
	loopStartHop	= 0;
	loopEndHop		= (parser.partials.getHopNum() - 2) * overSampling;
	ampTh			= 0.0001;
	hopNumTh		= 0;
	pitchMultiplier = 1;
	freqMovement	= 1;
	filterNum		= 0;
	note			= false;
	speed			= 1;
	nextSpeed		= -1;
	maxSpeed 		= 10;
	minSpeed 		= 0.1;
	jumpHop 		= -1;

	// filter
	filterMaxF		= 22000;
	filterAmpMinF	= 10 * frequencyScaler;
	filterAmpMaxF	= 5000 * frequencyScaler;
	filterAmpMul	= 10.0;

	// adsr
	minAttackTime	= .0001;
	deltaAttackTime = 2.;
	minReleaseTime	= 1;
	deltaReleaseTime = 2.5;

	adsr.setAttackRate(minAttackTime * rate);
	adsr.setDecayRate(.0001 * rate);
	adsr.setSustainLevel(1);
	adsr.setReleaseRate(minReleaseTime * rate);

	state = bank_stopped;
	return true;
}

void OscillatorBank::resetOscillators() {
	currentHop			= -1;
	loopDir				= 1;
	loopDirShift 		= 0;
	fill(nyquistCut, nyquistCut + numOfPartials, false);
	prevAdsrVal			= 0;
	prevAmpTh			= ampTh;
	prevHopNumTh		= hopNumTh;
	prevPitchMultiplier = pitchMultiplier;
	prevFreqMovement 	= freqMovement;
	prevFilterNum = filterNum;
	memcpy(prevFilterFreqs, filterFreqs, filterNum * sizeof(float));
	memcpy(prevFilterQ, filterQ, filterNum * sizeof(float));

	int activePNum		= partials->activePartialNum[0];
	unsigned int *activeP = partials->activePartials[0];
	for (int i = 0; i < activePNum; i++) {
		freqFixedDeltas[activeP[i]] = partials->partialFreqDelta[activeP[i]][0]
				/ overSampling;
		ampFixedDeltas[activeP[i]]	= partials->partialAmpDelta[activeP[i]][0]
				/ overSampling;
	}
	// attack!
	adsr.gate(1);
	note = true;

	nextHop();

	state = bank_playing;
}

void OscillatorBank::nextHop() {
	hopSize = oscBankHopSize;

	// copy phases, next freqs and next amps from previous frame
	memcpy(phaseCopies, oscillatorPhases, actPartNum * sizeof(float));
	memcpy(nextNormFreqCopies, oscillatorNextNormFreq,
			actPartNum * sizeof(float));
	memcpy(nextAmpCopies, oscillatorNextAmp, actPartNum * sizeof(float));

	// next frame is forward or backwards, cos we could be in the loop
	currentHop += loopDir;

	checkDirection();

//	if((currentHop/overSampling)%100 == 0)
//		dbox_printf("currentHop %d, direction: %d\n", currentHop/overSampling, loopDir);

	// if needs jump, end here this method, cos jumpToHop() will do tee rest
	if (checkJump() == 0)
		return;
	// otherwise, if jump is not needed or fails, continue regular stuff

	if (nextEnvState() != 0)
		return; // release has ended!

	checkSpeed();

	// now let's decide how to calculate next hop
	if (!checkOversampling())
		nextOscBankHop();
	else
		nextPartialHop();
}

void OscillatorBank::nextOscBankHop() {
	int parIndex, localHop;
	float parDamp = 1;
	int currentPartialHop = (currentHop / overSampling) + loopDirShift;

	// if going backwards in the loop, get previous frame active partials...
	actPartNum = partials->activePartialNum[currentPartialHop - loopDirShift];
	actPart = partials->activePartials[currentPartialHop - loopDirShift];
	//cout << "actPartNum: " << actPartNum << endl;

	envState = adsr.getState(); // to determine what state we will be in next hop [attack, decay, sustain, release]

	int parCnt = 0;
	int currentHopReminder = currentHop % overSampling;
	// steps to reach next bank hop from previous partial hop
	int steps = currentHopReminder + 1;
	if (loopDir < 0)
		steps = overSampling - currentHopReminder + 1;

	for (int i = 0; i < actPartNum; i++) {
		// find partial and frame
		parIndex = actPart[i];
		//localHop	= partials->localPartialFrames[currentPartialHop][parIndex];
		localHop = currentPartialHop - partials->partialStartFrame[parIndex]; // in Parser and Partials "frames" are what we call here "hops". These particular ones are local frames [see comment at top of file]

		//float delta = partials->partialFrequencies[parIndex][localHop+loopDir] - partials->partialFrequencies[parIndex][localHop];

		// if this partial was over nyquist on previous hop...
		if (nyquistCut[parIndex]) {
			// ...restart from safe values
			oscillatorPhases[parCnt] = 0;
			//TODO add freqmove dependency
			oscillatorNextNormFreq[parCnt] =
					(partials->partialFrequencies[parIndex][localHop]
							+ freqFixedDeltas[parIndex] * (steps - 1))
							* frequencyScaler * prevPitchMultiplier;
			oscillatorNextAmp[parCnt] = 0;
		} else if (loopDir == 1) // otherwise recover phase, target freq and target amp from previous frame
				{
			if ((localHop != 0) || (currentHopReminder != 0)) {
				oscillatorPhases[parCnt] =
						phaseCopies[indicesMapping[parIndex]];
				oscillatorNextNormFreq[parCnt] =
						nextNormFreqCopies[indicesMapping[parIndex]];
				oscillatorNextAmp[parCnt] =
						nextAmpCopies[indicesMapping[parIndex]];
			} else // first oscillator hop [both for bank and partial], so no previous data are available
			{
				oscillatorPhases[parCnt] = 0;
				//TODO add freqmove dependency
				oscillatorNextNormFreq[parCnt] =
						partials->partialFrequencies[parIndex][localHop]
								* frequencyScaler * prevPitchMultiplier;
				parDamp = calculateParDamping(parIndex, prevHopNumTh,
						prevAdsrVal, oscillatorNextNormFreq[parCnt],
						prevFilterNum, prevFilterFreqs, prevFilterQ);
				oscillatorNextAmp[parCnt] =
						partials->partialAmplitudes[parIndex][localHop]
								* parDamp;
				if(oscillatorNextAmp[parCnt] > 1)
						oscillatorNextAmp[parCnt] = 1;
				freqFixedDeltas[parIndex] =
						partials->partialFreqDelta[parIndex][localHop + loopDir]
								* loopDir / overSampling;
				ampFixedDeltas[parIndex] =
						partials->partialAmpDelta[parIndex][localHop + loopDir]
								* loopDir / overSampling;
			}
		} else {
			oscillatorPhases[parCnt] = phaseCopies[indicesMapping[parIndex]];
			oscillatorNextNormFreq[parCnt] =
					nextNormFreqCopies[indicesMapping[parIndex]];
			oscillatorNextAmp[parCnt] = nextAmpCopies[indicesMapping[parIndex]];
		}

		// remove aliasing, skipping partial over nyquist freq
		if (oscillatorNextNormFreq[parCnt] > nyqNorm) {
			nyquistCut[parIndex] = true;
			continue;
		}
		nyquistCut[parIndex] = false;

		// first set up freq, cos filter affects amplitude damping according to freq content
		oscillatorNormFrequencies[parCnt] = oscillatorNextNormFreq[parCnt]; // to fix any possible drifts
		// save next values, current for next round
		oscillatorNextNormFreq[parCnt] = (freqMovement
				* (partials->partialFrequencies[parIndex][localHop]
						+ freqFixedDeltas[parIndex] * steps) * frequencyScaler
				+ (1 - freqMovement) * oscStatNormFrequenciesMean[parIndex])
				* pitchMultiplier;
		// derivatives are (next hop value*next damping) - (current hop value*current damping)  ---> next hop must be available, in both directions, because of control on active partials
		oscillatorNormFreqDerivatives[parCnt] = (oscillatorNextNormFreq[parCnt]
				- oscillatorNormFrequencies[parCnt]) / hopCounter;
		// this second weird passage handles dissonance control, morphing between regular and mean frequencies
		oscillatorNormFreqDerivatives[parCnt] = freqMovement
				* oscillatorNormFreqDerivatives[parCnt]
				+ (1 - freqMovement)
						* ((oscStatNormFrequenciesMean[parIndex]
								* pitchMultiplier)
								- oscillatorNormFrequencies[parCnt])
						/ hopCounter;

		parDamp = calculateParDamping(parIndex, hopNumTh, adsrVal,
				oscillatorNextNormFreq[parCnt], filterNum, filterFreqs, filterQ);

		// now amplitudes
		oscillatorAmplitudes[parCnt] = oscillatorNextAmp[parCnt]; // to fix any possible drifts
		// save next values, current for next round
		//delta = partials->partialAmplitudes[parIndex][localHop+loopDir] - partials->partialAmplitudes[parIndex][localHop];
		oscillatorNextAmp[parCnt] =
				(partials->partialAmplitudes[parIndex][localHop]
						+ ampFixedDeltas[parIndex] * steps) * parDamp;
		if(oscillatorNextAmp[parCnt] > 1)
				oscillatorNextAmp[parCnt] = 1;
		if ((loopDir == -1) && (localHop = 1) && (currentHopReminder == 1))
			oscillatorNextAmp[parCnt] = 0;
		// derivatives are (next hop value*next damping) - (current hop value*current damping)  ---> next hop must be available, in both directions, because of control on active partials
		oscillatorAmplitudeDerivatives[parCnt] = (oscillatorNextAmp[parCnt]
				- oscillatorAmplitudes[parCnt]) / hopCounter;

		// finally update current mapping between oscillators and partials
		indicesMapping[parIndex] = parCnt;
		parCnt++;
	}
	actPartNum = parCnt;
	// [NEON] if not multiple of 4...
	if (actPartNum % 4 != 0)
		addFakeOsc();
}

void OscillatorBank::nextPartialHop() {
	unsigned int parIndex, localHop;
	float parDamp = 1;
	int currentPartialHop = currentHop / overSampling;

	// if going backwards in the loop, get previous frame active partials...
	actPartNum = partials->activePartialNum[currentPartialHop - loopDirShift];
	actPart    = partials->activePartials[currentPartialHop - loopDirShift];

	envState = adsr.getState(); // to determine what state we will be in next hop [attack, decay, sustain, release]

	int parCnt = 0;
	int steps = overSampling - 1; // steps to reach next hop [partial or bank] from previous partial hop

	for (int i = 0; i < actPartNum; i++) {
		// find partial and frame
		parIndex = actPart[i];
		//localHop	= partials->localPartialFrames[currentPartialHop][parIndex];
		localHop = currentPartialHop - partials->partialStartFrame[parIndex]; // in Parser and Partials "frames" are what we call here "hops". These particular ones are local frames [see comment at top of file]

		// if this partial was over nyquist on previous hop...
		if (nyquistCut[parIndex]) {
			// ...restart from safe values
			oscillatorPhases[parCnt] = 0;
			//TODO add freqmove dependency
			oscillatorNextNormFreq[parCnt] =
					(partials->partialFrequencies[parIndex][localHop]
							+ freqFixedDeltas[parIndex] * steps
									* (1 - loopDirShift)) * frequencyScaler
							* prevPitchMultiplier;
			oscillatorNextAmp[parCnt] = 0;
		} else if (loopDir == 1) // otherwise recover phase, target freq and target amp from previous frame
		{
			if ((localHop != 0) || (overSampling > 1)) {
				oscillatorPhases[parCnt] =
						phaseCopies[indicesMapping[parIndex]];
				oscillatorNextNormFreq[parCnt] =
						nextNormFreqCopies[indicesMapping[parIndex]];
				oscillatorNextAmp[parCnt] =
						nextAmpCopies[indicesMapping[parIndex]];
			} else // first oscillator hop [both for bank and partial], so no previous data are available
			{
				oscillatorPhases[parCnt] = 0;
				//TODO add freqmove dependency
				oscillatorNextNormFreq[parCnt] =
						partials->partialFrequencies[parIndex][localHop]
								* frequencyScaler * prevPitchMultiplier;
				parDamp = calculateParDamping(parIndex, prevHopNumTh,
						prevAdsrVal, oscillatorNextNormFreq[parCnt],
						prevFilterNum, prevFilterFreqs, prevFilterQ);
				oscillatorNextAmp[parCnt] =
						partials->partialAmplitudes[parIndex][localHop]
								* parDamp;
				if(oscillatorNextAmp[parCnt] > 1)
						oscillatorNextAmp[parCnt] = 1;
				freqFixedDeltas[parIndex] =
						partials->partialFreqDelta[parIndex][localHop + loopDir]
								* loopDir / overSampling;
				ampFixedDeltas[parIndex] =
						partials->partialAmpDelta[parIndex][localHop + loopDir]
								* loopDir / overSampling;
			}
		} else {
			if (localHop != partials->partialNumFrames[parIndex] - 1) {
				oscillatorPhases[parCnt] =
						phaseCopies[indicesMapping[parIndex]];
				oscillatorNextNormFreq[parCnt] =
						nextNormFreqCopies[indicesMapping[parIndex]];
				oscillatorNextAmp[parCnt] =
						nextAmpCopies[indicesMapping[parIndex]];
			} else // first oscillator hop [going backwards - both for bank and partial] , so no previous data are available
			{
				oscillatorPhases[parCnt] = 0;
				//TODO add freqmove dependency
				oscillatorNextNormFreq[parCnt] =
						partials->partialFrequencies[parIndex][localHop]
								* frequencyScaler * prevPitchMultiplier;
				parDamp = calculateParDamping(parIndex, prevHopNumTh,
						prevAdsrVal, oscillatorNextNormFreq[parCnt],
						prevFilterNum, prevFilterFreqs, prevFilterQ);
				oscillatorNextAmp[parCnt] =
						partials->partialAmplitudes[parIndex][localHop]
								* parDamp;
				if(oscillatorNextAmp[parCnt] > 1)
						oscillatorNextAmp[parCnt] = 1;
				freqFixedDeltas[parIndex] =
						partials->partialFreqDelta[parIndex][localHop + loopDir]
								* loopDir / overSampling;
				ampFixedDeltas[parIndex] =
						partials->partialAmpDelta[parIndex][localHop + loopDir]
								* loopDir / overSampling;
			}
		}
		// remove aliasing, skipping partial over nyquist freq
		if (oscillatorNextNormFreq[parCnt] > nyqNorm) {
			//cout << nyqNorm << endl;
			nyquistCut[parIndex] = true;
			continue;
		}
		nyquistCut[parIndex] = false;

		// first set up freq, cos filter affects amplitude damping according to freq content
		oscillatorNormFrequencies[parCnt] = oscillatorNextNormFreq[parCnt]; // to fix any possible drifts
		// save next values, current for next round
		oscillatorNextNormFreq[parCnt] = (freqMovement
				* (partials->partialFrequencies[parIndex][localHop + loopDir]
						- freqFixedDeltas[parIndex] * steps * loopDirShift)
				* frequencyScaler
				+ (1 - freqMovement) * oscStatNormFrequenciesMean[parIndex])
				* pitchMultiplier;
		// derivatives are (next hop value*next damping) - (current hop value*current damping)  ---> next hop must be available, in both directions, because of control on active partials
		oscillatorNormFreqDerivatives[parCnt] = (oscillatorNextNormFreq[parCnt]
				- oscillatorNormFrequencies[parCnt]) / hopCounter;
		// this second weird passage handles dissonance control, morphing between regular and mean frequencies
		oscillatorNormFreqDerivatives[parCnt] = freqMovement
				* oscillatorNormFreqDerivatives[parCnt]
				+ (1 - freqMovement)
						* ((oscStatNormFrequenciesMean[parIndex]
								* pitchMultiplier)
								- oscillatorNormFrequencies[parCnt])
						/ hopCounter;

		parDamp = calculateParDamping(parIndex, hopNumTh, adsrVal,
				oscillatorNextNormFreq[parCnt], filterNum, filterFreqs, filterQ);

		// now amplitudes
		oscillatorAmplitudes[parCnt] = oscillatorNextAmp[parCnt]; // to fix any possible drifts
		// save next values, current for next round
		//delta = partials->partialAmplitudes[parIndex][localHop+loopDir] - partials->partialAmplitudes[parIndex][localHop];
		oscillatorNextAmp[parCnt] =
				(partials->partialAmplitudes[parIndex][localHop + loopDir]
						- (ampFixedDeltas[parIndex]) * steps * loopDirShift)
						* parDamp;
		if(oscillatorNextAmp[parCnt] > 1)
			oscillatorNextAmp[parCnt] = 1;

		// to avoid bursts when transients are played backwards
		if ((loopDir == -1) && (localHop - 1 == 0) && (overSampling == 1)) {
			oscillatorNextAmp[parCnt] = 0;
		}
		// derivatives are (next hop value*next damping) - (current hop value*current damping)  ---> next hop must be available, in both directions, because of control on active partials
		oscillatorAmplitudeDerivatives[parCnt] = (oscillatorNextAmp[parCnt]
				- oscillatorAmplitudes[parCnt]) / hopCounter;

		// if next is not going to loop boundaries, get next deltas [same direction]
		if ((((currentPartialHop + loopDir) * overSampling != loopEndHop)
				|| (loopDir == -1))
				&& (((currentPartialHop + loopDir) * overSampling + loopDir
						!= loopStartHop) || (loopDir == 1))) {
			freqFixedDeltas[parIndex] =
					partials->partialFreqDelta[parIndex][localHop + loopDir]
							* loopDir / overSampling;
			ampFixedDeltas[parIndex] =
					partials->partialAmpDelta[parIndex][localHop + loopDir]
							* loopDir / overSampling;
		} else // .. otherwise, keep deltas but change sign [co swe change direction]
		{
			freqFixedDeltas[parIndex] = -freqFixedDeltas[parIndex];
			ampFixedDeltas[parIndex] = -ampFixedDeltas[parIndex];
		}

		// finally update current mapping between oscillators and partials
		indicesMapping[parIndex] = parCnt;
		parCnt++;
	}
	actPartNum = parCnt;
	// [NEON] if not multiple of 4...
	if (actPartNum % 4 != 0)
		addFakeOsc();

	updatePrevControls();
}

void OscillatorBank::addFakeOsc() {
	// ...calculate difference
	int newPartNum = (actPartNum + 3) & ~0x3;
	// ...add fake oscillators until total num is multiple of 4
	for (int i = actPartNum; i < newPartNum; i++) {
		oscillatorAmplitudes[i] = 0;
		oscillatorNormFrequencies[i] = 0;
		oscillatorAmplitudeDerivatives[i] = 0;
		oscillatorNormFreqDerivatives[i] = 0;
		oscillatorPhases[i] = 0;
	}
	// ...and update num of active partials
	actPartNum = newPartNum;
}

void OscillatorBank::play(float vel) {
	// set attack and release params according to velocity
	//adsr.setAttackRate((minAttackTime + ((1 - vel) * deltaAttackTime)) * rate);
	adsr.setAttackRate(minAttackTime * rate);
	//adsr.setReleaseRate((minReleaseTime + (1 - vel) * deltaReleaseTime) * rate);
	adsr.setReleaseRate(minReleaseTime * rate);

	// set timbre
	hopNumTh = log((1 - vel) + 1) / log(2) * 20000;

	state = bank_toreset;
}

//---------------------------------------------------------------------------------------------------------------------------
// private methods
//---------------------------------------------------------------------------------------------------------------------------

bool OscillatorBank::loader(char *filename, int hopsize, int samplerate) {
	rate = samplerate;
	loaded = parser.parseFile(filename, hopsize, samplerate);
	return loaded;
}

int OscillatorBank::jumpToHop() {
	int jumpGap = abs(jumpHop - currentHop / overSampling); // gaps in partial reference

	// can't jump to self dude
	if (jumpGap == 0)
		return 1;

	// direction is in general maintained with jump
	if (jumpHop == 0)
		setDirection(1);
	else if (jumpHop == lastHop)
		setDirection(-1);

	dbox_printf("\tJump from %d to %d\n", currentHop / overSampling, jumpHop);
	dbox_printf("\tdirection %d\n", loopDir);

	currentHop = jumpHop * overSampling;

	if (nextEnvState() != 0)
		return 0; // release has ended!

	checkSpeed();

	int parIndex, localHop, targetHop;
	float parDamp = 1;
	int currentPartialHop = currentHop / overSampling;
	int targetPartialHop = jumpHop;

	actPartNum = partials->activePartialNum[currentPartialHop];
	actPart = partials->activePartials[currentPartialHop];
	int targetActParNum = partials->activePartialNum[targetPartialHop];
	unsigned int *targetActPar = partials->activePartials[targetPartialHop];

	envState = adsr.getState(); // to determine what state we will be in next hop [attack, decay, sustain, release]

	int parCnt = 0;
	int currentHopReminder = currentHop % overSampling;

	// steps to walk where i am [bank of partial hop] from previous partial hop
	int steps = currentHopReminder * (overSampling != 1); // no oversampling 0, oversampling and going ff currentHopReminder

	for (int i = 0; i < actPartNum; i++) {
		// find partial and frame
		parIndex = actPart[i];
		//localHop	= partials->localPartialFrames[currentPartialHop][parIndex];
		localHop = currentPartialHop - partials->partialStartFrame[parIndex]; // in Parser and Partials "frames" are what we call here "hops". These particular ones are local frames [see comment at top of file]

		// if this partial was over nyquist on previous hop...
		if (nyquistCut[parIndex]) {
			// ...restart from safe values
			oscillatorPhases[parCnt] = 0;
			//TODO add freqmove dependency
			oscillatorNextNormFreq[parCnt] =
					(partials->partialFrequencies[parIndex][localHop]
							+ freqFixedDeltas[parIndex] * steps * loopDir)
							* frequencyScaler * prevPitchMultiplier;
			oscillatorNextAmp[parCnt] = 0;
		} else if (loopDir == 1) {// otherwise recover phase, target freq and target amp from previous frame
			if ((localHop != 0)
					|| ((overSampling > 1) && (currentHopReminder != 0))) {
				oscillatorPhases[parCnt] =
						phaseCopies[indicesMapping[parIndex]];
				oscillatorNextNormFreq[parCnt] =
						nextNormFreqCopies[indicesMapping[parIndex]];
				oscillatorNextAmp[parCnt] =
						nextAmpCopies[indicesMapping[parIndex]];
			} else { // first oscillator hop [both for bank and partial], so no previous data are available
				oscillatorPhases[parCnt] = 0;
				//TODO add freqmove dependency
				oscillatorNextNormFreq[parCnt] =
						partials->partialFrequencies[parIndex][localHop]
								* frequencyScaler * prevPitchMultiplier;
				parDamp = calculateParDamping(parIndex, prevHopNumTh,
						prevAdsrVal, oscillatorNextNormFreq[parCnt],
						prevFilterNum, prevFilterFreqs, prevFilterQ);
				oscillatorNextAmp[parCnt] =
						partials->partialAmplitudes[parIndex][localHop]
								* parDamp;
				if(oscillatorNextAmp[parCnt] > 1)
						oscillatorNextAmp[parCnt] = 1;
			}
		} else {
			if (( (unsigned)localHop != partials->partialNumFrames[parIndex] - 1)
					|| ((overSampling > 1) && (currentHopReminder != 0))) {
				oscillatorPhases[parCnt] =
						phaseCopies[indicesMapping[parIndex]];
				oscillatorNextNormFreq[parCnt] =
						nextNormFreqCopies[indicesMapping[parIndex]];
				oscillatorNextAmp[parCnt] =
						nextAmpCopies[indicesMapping[parIndex]];
			} else // first oscillator hop [going backwards - both for bank and partial] , so no previous data are available, so retrieve where i am
			{
				oscillatorPhases[parCnt] = 0;
				//TODO add freqmove dependency
				oscillatorNextNormFreq[parCnt] =
						partials->partialFrequencies[parIndex][localHop]
								* frequencyScaler * prevPitchMultiplier;
				parDamp = calculateParDamping(parIndex, prevHopNumTh,
						prevAdsrVal, oscillatorNextNormFreq[parCnt],
						prevFilterNum, prevFilterFreqs, prevFilterQ);
				oscillatorNextAmp[parCnt] =
						partials->partialAmplitudes[parIndex][localHop]
								* parDamp;
				if(oscillatorNextAmp[parCnt] > 1)
						oscillatorNextAmp[parCnt] = 1;
			}
		}
		// remove aliasing, skipping partial over nyquist freq
		if (oscillatorNextNormFreq[parCnt] > nyqNorm) {
			//cout << nyqNorm << endl;
			nyquistCut[parIndex] = true;
			continue;
		}
		nyquistCut[parIndex] = false;

		// check what happens of this partial at target hop
		float targetFreqVal, targetAmpVal;
		//targetHop = partials->localPartialFrames[targetPartialHop][parIndex];
		targetHop = targetPartialHop - partials->partialStartFrame[parIndex];

		if (targetHop == -1)
			targetFreqVal = targetAmpVal = 0;
		else {
			targetFreqVal = partials->partialFrequencies[parIndex][targetHop]
					* frequencyScaler; // pitch shift will be multiplied later!!!
			targetAmpVal = partials->partialFrequencies[parIndex][targetHop]; // parDamp will be multiplied later!!!
		}

		// first set up freq, cos filter affects amplitude damping according to freq content
		oscillatorNormFrequencies[parCnt] = oscillatorNextNormFreq[parCnt]; // to fix any possible drifts
		// save next values, current for next round
		oscillatorNextNormFreq[parCnt] = (freqMovement * targetFreqVal
				+ (1 - freqMovement) * oscStatNormFrequenciesMean[parIndex])
				* pitchMultiplier;
		// derivatives are (next hop value*next damping) - (current hop value*current damping)  ---> next hop must be available, in both directions, because of control on active partials
		oscillatorNormFreqDerivatives[parCnt] = (oscillatorNextNormFreq[parCnt]
				- oscillatorNormFrequencies[parCnt]) / hopCounter;
		// this second weird passage handles dissonance control, morphing between regular and mean frequencies
		oscillatorNormFreqDerivatives[parCnt] = freqMovement
				* oscillatorNormFreqDerivatives[parCnt]
				+ (1 - freqMovement)
						* ((oscStatNormFrequenciesMean[parIndex]
								* pitchMultiplier)
								- oscillatorNormFrequencies[parCnt])
						/ hopCounter;

		parDamp = calculateParDamping(parIndex, hopNumTh, adsrVal,
				oscillatorNextNormFreq[parCnt], filterNum, filterFreqs, filterQ);

		// now amplitudes
		oscillatorAmplitudes[parCnt] = oscillatorNextAmp[parCnt]; // to fix any possible drifts
		// save next values, current for next round
		oscillatorNextAmp[parCnt] = targetAmpVal * parDamp;
		if(oscillatorNextAmp[parCnt] > 1)
				oscillatorNextAmp[parCnt] = 1;
		// to avoid bursts when transients are played backwards
		if ((loopDir == -1) && (targetHop == 0)
				&& ((overSampling == 1) || (currentHopReminder == 0))) {
			oscillatorNextAmp[parCnt] = 0;
		}
		// derivatives are (next hop value*next damping) - (current hop value*current damping)  ---> next hop must be available, in both directions, because of control on active partials
		oscillatorAmplitudeDerivatives[parCnt] = (oscillatorNextAmp[parCnt]
				- oscillatorAmplitudes[parCnt]) / hopCounter;

		//if partial does not die at target, calculate deltas according to direction
		if (targetHop != -1) {
			freqFixedDeltas[parIndex] =
					partials->partialFreqDelta[parIndex][targetHop] * loopDir
							/ overSampling;
			ampFixedDeltas[parIndex] =
					partials->partialAmpDelta[parIndex][targetHop] * loopDir
							/ overSampling;
		}

		// finally update current mapping between oscillators and partials
		indicesMapping[parIndex] = parCnt;
		parCnt++;
	}
	actPartNum = parCnt;

	// now add the ones that start at target hop!
	for (int i = 0; i < targetActParNum; i++) {
		// find partial and frame
		parIndex = targetActPar[i];
		//targetHop	= partials->localPartialFrames[targetPartialHop][parIndex];
		targetHop = targetPartialHop - partials->partialStartFrame[parIndex]; // in Parser and Partials "frames" are what we call here "hops". These particular ones are local frames [see comment at top of file]

		// check if this partials was already active before the jump
		//localHop = partials->localPartialFrames[currentPartialHop][parIndex];
		localHop = currentPartialHop - partials->partialStartFrame[parIndex];

		// if yes, skip it
		if (localHop != -1)
			continue;

		// otherwise add it to active bunch and calcucalte values

		// first set up freq, cos filter affects amplitude damping according to freq content
		oscillatorNormFrequencies[parCnt] = 0;
		// save next values, current for next round
		oscillatorNextNormFreq[parCnt] = (freqMovement
				* partials->partialFrequencies[parIndex][targetHop]
				* frequencyScaler
				+ (1 - freqMovement) * oscStatNormFrequenciesMean[parIndex])
				* pitchMultiplier;
		// derivatives are (next hop value*next damping) - (current hop value*current damping)  ---> next hop must be available, in both directions, because of control on active partials
		oscillatorNormFreqDerivatives[parCnt] = (oscillatorNextNormFreq[parCnt]
				- oscillatorNormFrequencies[parCnt]) / hopCounter;
		// this second weird passage handles dissonance control, morphing between regular and mean frequencies
		oscillatorNormFreqDerivatives[parCnt] = freqMovement
				* oscillatorNormFreqDerivatives[parCnt]
				+ (1 - freqMovement)
						* ((oscStatNormFrequenciesMean[parIndex]
								* pitchMultiplier)
								- oscillatorNormFrequencies[parCnt])
						/ hopCounter;

		parDamp = calculateParDamping(parIndex, hopNumTh, adsrVal,
				oscillatorNextNormFreq[parCnt], filterNum, filterFreqs, filterQ);

		// now amplitudes
		oscillatorAmplitudes[parCnt] = 0;
		// save next values, current for next round
		oscillatorNextAmp[parCnt] =
				partials->partialFrequencies[parIndex][targetHop] * parDamp;
		if(oscillatorNextAmp[parCnt] > 1)
				oscillatorNextAmp[parCnt] = 1;
		// derivatives are (next hop value*next damping) - (current hop value*current damping)  ---> next hop must be available, in both directions, because of control on active partials
		oscillatorAmplitudeDerivatives[parCnt] = (oscillatorNextAmp[parCnt]
				- oscillatorAmplitudes[parCnt]) / hopCounter;

		//calculate deltas according to direction
		freqFixedDeltas[parIndex] =
				partials->partialFreqDelta[parIndex][targetHop] * loopDir
						/ overSampling;
		ampFixedDeltas[parIndex] =
				partials->partialAmpDelta[parIndex][targetHop] * loopDir
						/ overSampling;

		// finally update current mapping between oscillators and partials
		indicesMapping[parIndex] = parCnt;
		parCnt++;

	}
	// [NEON] if not multiple of 4...
	if (actPartNum % 4 != 0)
		addFakeOsc();

	updatePrevControls();

	jumpHop = -1;

	return 0;
}

int OscillatorBank::nextEnvState() {
	/*
	 envState = Attack.getState();	// to determine what state we are in [attack, decay, sustain, release]

	 // osc bank is playing the tail and the tail ends...
	 if( (state == bank_playing)&&(envState == env_idle) )
	 {
	 state = bank_stopped;	// ...stop bank
	 return 1;					// and return immediately
	 }
	 else if( (envState == env_attack) || (envState == env_decay) )
	 {
	 // run envelopes until next frame
	 dampWeight	= Attack.process(hopSize);
	 }
	 else if(envState == env_release)
	 {
	 // run envelopes until next frame
	 dampWeight 	= Attack.process(hopSize);
	 releaseDamp = Release.process(hopSize);
	 }*/

	envState = adsr.getState();
	// osc bank is playing the tail and the tail ends...
	if ((state == bank_playing) && (envState == env_idle)) {
		state = bank_stopped; // ...stop bank
		adsrVal = 0;
		return 1; // and return immediately
	} else
		adsrVal = adsr.process(hopSize);

	return 0;
}

void OscillatorBank::checkDirection() {
	// end of the loop or end of file
	if (((currentHop >= loopEndHop) && (loopDir == 1))
			|| ((currentHop >= lastHop) && (loopDir == 1))) {
		// move backwards
		setDirection(-1);
		//dbox_printf("backward from %d\n", loopEndHop);
	} else if (((currentHop <= loopStartHop) && (loopDir == -1))
			|| ((currentHop <= 0) && (loopDir == -1))) // start of the loop or start of file
			{
		// move forward
		setDirection(1);
		//dbox_printf("forward from %d\n", loopStartHop);
	}
}

void OscillatorBank::checkSpeed() {
	// speed control [alike on highways, LOL]
	if (nextSpeed > 0) {
		nextSpeed = (nextSpeed < maxSpeed) ? nextSpeed : maxSpeed;
		nextSpeed = (nextSpeed > minSpeed) ? nextSpeed : minSpeed;
		speed = nextSpeed;
		nextSpeed = -1;
	}
	hopCounter = hopSize / speed;
}

int OscillatorBank::checkJump() {
	//check if has to jump somewhere
	if (jumpHop > -1) {
		// needs to jump!
		if (jumpToHop() == 0)
			return 0;
	}
	return 1; // no jump
}

bool OscillatorBank::checkOversampling() {
	//TODO fix this, but need andrew to fix oversampling multiple of period size
	// if partialsHopSize is not a multiple of oversampling, change hop size to periodically match next partial hop
	if (hopSizeReminder > 0) {
		// if next osc bank hop overtakes next partial hop...
		if ((currentHop + loopDir) * hopSize > partialsHopSize) {
			hopSize = hopSizeReminder; // ...shrink osc bank hop size to match partial hop
			return true; // and set next hop as matching with next partial hop
		}
	} else if (((currentHop + (1 - loopDirShift)) % overSampling) == 0) // if next osc bank hop matches next partial hop
		return true; // ...mark next hop as partial hop

	return false; // ,otherwise mark next hop as osc bank hop
}

void OscillatorBank::updatePrevControls() {
	prevAdsrVal = adsrVal;
	prevAmpTh = ampTh;
	prevHopNumTh = hopNumTh;
	prevPitchMultiplier = pitchMultiplier;
	prevFreqMovement = freqMovement;
	prevFilterNum = filterNum;
	memcpy(prevFilterFreqs, filterFreqs, filterNum * sizeof(float));
	memcpy(prevFilterQ, filterQ, filterNum * sizeof(float));
}

float OscillatorBank::calculateParDamping(int parIndex, int hopNTh,
		float adsrVl, float nextFreq, int filNum, float *filFreq, float *filQ) {
	float parDamp = 1;

	// timbre
	parDamp = ((float) (oscStatNumHops[parIndex] + 1)) / (hopNTh + 1);
	parDamp = (parDamp > 1) ? 1 : parDamp;
	parDamp = adsrVl * parDamp;

	//filters

	float filterWeights[MAX_TOUCHES];
	float filterDamp[MAX_TOUCHES];
	float filDist;
	float filterWeightsAcc;
	float filDmp;
	float filAmp;

// 		band reject notch filter
//		float dist, dmp;
//		for(int k=0; k<filterNum; k++)
//		{
//			dist = fabs(oscillatorNextNormFreq[parCnt]-filterFreqs[k]);
//			if(dist<=filterQ[k])
//			{
//				dmp 	= dist/filterQ[k];
//				parDamp *= dmp*dmp*dmp;
//			}
//		}


	// each filter is a band pass notch filter

	// if at least one is active
	if (filNum > 0) {
		// reset values
		filDist = 0;
		filterWeightsAcc = 0;
		filDmp = 0;
		filAmp = 0;
		// for each filter
		for (int k = 0; k < filNum; k++) {
			// here are a couple of kludges to boost sound output of hi freq filters

			// damping effect of filter increases with distance, but decreases with filter frequency [kludge]
			float mul = ((filterMaxF-nextFreq)/filterMaxF) * 0.9 + 0.1 ;
			//filDist = fabs(nextFreq - filFreq[k])*( ((exp(a*4)-1)/EXP_DENOM) * 0.9 + 0.1 );
			filDist = fabs(nextFreq - filFreq[k])*mul;

			// these to merge all filters contributions according to distance
			filterWeights[k] = filterMaxF - filDist;
			filterWeightsAcc += filterWeights[k];
			// freqs very close to filter center are slightly amplified
			// the size of this amp area and the effect of amplification increase with frequency [kludge]
			if (filDist
					< filterAmpMinF
							+ (filterAmpMaxF*(1-mul) - filterAmpMinF) * (1 - filQ[k]) )
				filAmp = filQ[k] * filterAmpMul*(1-mul);
			else
				filAmp = 0;
			// actual damping
			filDmp = 1 / (filDist * filQ[k]);
			filDmp = (filDmp > 1) ? 1 : filDmp;
			// sum damp+amplification
			filterDamp[k] = filDmp + filAmp;
		}
		// do weighted mean to merge all filters contributions
		filDmp = 0;
		for (int k = 0; k < filNum; k++)
			filDmp += filterDamp[k] * filterWeights[k];
		filDmp /= filterWeightsAcc;
		// apply
		parDamp *= filDmp;
	}


	return parDamp;
}
