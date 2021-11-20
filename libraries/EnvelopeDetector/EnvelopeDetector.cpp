#include "EnvelopeDetector.h"
#define _USE_MATH_DEFINES


EnvelopeDetector::EnvelopeDetector()
{
}

EnvelopeDetector::EnvelopeDetector(float attackTimeMs, float releaseTimeMs, float sampleRate, unsigned int constantMode, unsigned int branchingMode, unsigned int detectionMode, bool smooth)
{
	setup(attackTimeMs, releaseTimeMs, sampleRate, constantMode, branchingMode, detectionMode, smooth);
}

int EnvelopeDetector::setup(float attackTimeMs, float releaseTimeMs, float sampleRate, unsigned int constantMode, unsigned int branchingMode, unsigned int detectionMode, bool smooth)
{
	_fs = sampleRate;
	setAttackTime(attackTimeMs);
	setReleaseTime(releaseTimeMs);
	setConstantMode(constantMode);
	setBranchingMode(branchingMode);
	setDetectionMode(detectionMode);
	setSmooth(smooth);

	return 0;
}

double EnvelopeDetector::computeTimeConstant(float timeSec)
{
	return pow(exp(_tc/timeSec), 1.0 /_fs);
}

void EnvelopeDetector::setAttackTime(float attackTimeMs)
{
	_tConstantAttack = computeTimeConstant(attackTimeMs*0.001);
	_attackTimeMs = attackTimeMs;
}

void EnvelopeDetector::setReleaseTime(float releaseTimeMs)
{
	_tConstantRelease = computeTimeConstant(releaseTimeMs*0.001);
	_releaseTimeMs = releaseTimeMs;
}

void EnvelopeDetector::resetState()
{
	_fastPeakEstimation = 0.0;
	_envelope = 0.0;
}

void EnvelopeDetector::setConstantMode(unsigned int mode)
{
	_constantMode = mode;
	_tc = (_constantMode == ANALOG) ? kTcAnalog : kTcDigital;
}

void EnvelopeDetector::setBranchingMode(unsigned int mode)
{
	resetState();
	_branchingMode= mode;
}

void EnvelopeDetector::setDetectionMode(unsigned int mode)
{
	_detectionMode = mode;
}

void EnvelopeDetector::setSmooth(bool isSmooth)
{
	_smooth = isSmooth;
}

float EnvelopeDetector::process(float input)
{
	float envelope = 0.0;
	float processedInput = input;
	// If input has not been preprocessed before calling process()
	if(_detectionMode != PREPROCESSED)
	{
		// Compute absolute value of input (PEAK detector)
		processedInput = fabsf(processedInput);

		// Compute squared value of input for MS and RMS detection
		if(_detectionMode == MS || _detectionMode == RMS)
		{
			processedInput = processedInput * processedInput;
		}
	}
	// If attack and release are decoupled...
	if(_branchingMode == DECOUPLING)
	{
		// Compute reease time estimation for instantaneous attack
		float filtEstimation = _tConstantRelease*_fastPeakEstimation;
		// Smooth release if smooth operation is active via 1st order LP filter
		if(_smooth) filtEstimation += (1 - _tConstantRelease) * processedInput;
		// Compute peak estimation as the maximum between input and initial estimation
		float estimation = fmax(processedInput, filtEstimation);
		_fastPeakEstimation = estimation;
		// Apply attack ballistics
		envelope = _tConstantAttack * _envelope + (1 - _tConstantAttack) * estimation;
	}
	// If branching mode operation is active process attack and release independently
	// Envelope state only discharges during release
	else if(_branchingMode == BRANCHING)
	{
		if (processedInput > _envelope)
		{
			envelope = _tConstantAttack * _envelope + (1 - _tConstantAttack) * processedInput;
		}
		else
		{
			envelope = _tConstantRelease * _envelope;
			if(_smooth)
				envelope += (1 - _tConstantRelease) * processedInput;
		}
	}
	_envelope = envelope;
	// If RMS detection is used, compute square root of envelope
	if(_detectionMode == RMS) envelope = sqrt(envelope);

	return envelope;
}

int EnvelopeDetector::cleanup()
{
	return 0;
}

EnvelopeDetector::~EnvelopeDetector()
{
	cleanup();
}
