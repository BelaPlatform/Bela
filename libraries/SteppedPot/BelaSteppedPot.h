#pragma once
#include <Bela.h>
#include "SteppedPot.h"
#include <libraries/OnePole/OnePole.h>
/**
 *
 * @brief Connect a stepped potentiometer and handle it at audio rate from Bela
 *
 * This class is a Bela-specific wrapper for SteppedPot, which is Bela-agnostic.
 * All the methods of BelaEncoder map to those of SteppedPot, and so only the
 * differences between the two are documented here.
 */
class BelaSteppedPot : public SteppedPot
{
public:
	BelaSteppedPot() {};
	BelaSteppedPot(BelaContext* context, unsigned int analogInCh, const std::vector<float>& levelsV, float toleranceV, float fullScale = 1);
	/**
	 * @param context the Bela context
	 * @param analogInCh which analog input channel the potentiometer is connected to.
	 */
	void setup(BelaContext* context, unsigned int analogInCh, const std::vector<float>& levelsV, float toleranceV, float fullScale = 1);
	/**
	 * Call this method once per block.
	 *
	 * A built-in one-pole lowpass filter smooths the analog reads before
	 * they are processed through SteppedPot::process().
	 */
	bool process(BelaContext* context);
private:
	OnePole filter;
	unsigned int analogInCh;
};
