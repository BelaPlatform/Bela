#pragma once
#include <vector>
/**
 * @brief Connect a stepped potentiometer.
 *
 * It processes input signals to determine what step the pot is currently at.
 * It can be used also with non-stepped potentiometers (or anything else,
 * really, including a GUI slider) where a stepped behaviour is desired.
 */
class SteppedPot
{
public:
	SteppedPot() {};
	/**
	 * Same as setup().
	 */
	SteppedPot(const std::vector<float>& levelsV, float toleranceV, float fullScale = 1);
	/**
	 * Set up the stepped potentiometer.
	 *
	 * @param levelsV a vector of values corresponding to the approximate
	 * reading of each of the pot's positions.
	 * @param toleranceV the bipolar tolerance around each of the values in
	 * @p levelsV
	 * @param fullScale a scaling factors for @p levelsV and @p toleranceV.
	 */
	void setup(const std::vector<float>& levelsV, float toleranceV, float fullScale = 1);
	/**
	 * Process a new reading from the potentiometer.
	 *
	 * @return `true` if the pot has changed position, `false` otherwise.
	 */
	bool process(float value);
	/**
	 * Get the current position of the pot.
	 *
	 * @return the current position of the pot.
	 */
	unsigned int get();
private:
	unsigned int position;
	bool isInState(float value, unsigned int p);
	std::vector<float> levels;
	float tolerance;
	bool inited;
};
