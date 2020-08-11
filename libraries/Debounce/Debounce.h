#pragma once

/**
 * @brief Debounce a boolean reading.
 *
 * Debounce a boolean reading which is read at regular intervals. Additionally,
 * provide edge detection functionalities.
 */

class Debounce
{
public:
	/**
	 * Some systems have different bouncing behaviours when transitioning
	 * from low to high versus when transitioning from high to low.
	 * Using this structure allows to specify different debounce intervals in
	 * the two directions.
	 */
	struct Settings
	{
		unsigned int intervalPositiveEdge; ///< Debouncing interval when encountering a positive edge (`false` to `true` transition)
		unsigned int intervalNegativeEdge; ///< Debouncing interval when encountering a negative edge ('true' to 'false' transition)
	};
	typedef enum {
		FALLING = -1, ///< The state has transitioned from high to low
		NONE = 0, ///< The state has remained the same
		RISING = 1, ///< The state has transitioned from low to high
	} Edge;
	Debounce();
	/**
	 * Same as setup().
	 */
	Debounce(unsigned int interval);
	/**
	 * Same as setup().
	 */
	Debounce(const Settings& settings);
	/**
	 * Set up the debouncer and reset the internal state.
	 *
	 * @param debounce the number of calls to process() during which
	 * changes are ignored after a change in the input vaulue has been
	 * detected.
	 */
	void setup(unsigned int interval);
	/**
	 * Set up the debouncer and reset the internal state.
	 *
	 * @param settings the number of calls to process() during which
	 * changes are ignored after a change in the input vaulue has been
	 * detected.
	 */
	void setup(const Settings& settings);
	/**
	 * Process an input through the debouncer and obtain an output.
	 */
	bool process(bool input)
	{
		oldState = state;
		if(debouncing) {
			--debouncing;
		} else {
			if(input > state) {
				debouncing = intervalPositiveEdge;
			}
			else if(input < state) {
				debouncing = intervalNegativeEdge;
			}
			state = input;
		}
		return state;
	}
	/**
	 * Get the current debounced state.
	 */
	bool get() { return state; }
	/**
	 * Return what edge was detected during the previous call to process()
	 */
	Edge edgeDetected() { return detectEdge(oldState, state); };
	/**
	 * Detect what edge occurs between two values.
	 */
	static Edge detectEdge(bool oldState, bool newState) {
		Edge edge = NONE;
		if(oldState != newState)
			edge = newState > oldState ? RISING : FALLING;
		return edge;
	}
private:
	unsigned int debouncing;
	unsigned int intervalPositiveEdge;
	unsigned int intervalNegativeEdge;
protected:
	bool state;
	bool oldState;
};
