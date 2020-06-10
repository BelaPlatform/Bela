#pragma once

/**
 * @brief Connect a quadrature rotary encoder.
 *
 * Connect a quadrature rotary encoder.
 *
 * It provides a debouncer to ignore spurious readings due to mechanical
 * bouncing of the contacts.
 *
 * It contains an internal counter which tracks how many steps the encoder has
 * moved from its initial position. Position is incremented when it moves
 * clockwise and decremented when it movew counter-clockwise.
 */
class Encoder 
{
public:
	typedef enum {
		CCW = -1, ///< The encoder rotated counter-clockwise
		NONE = 0, ///< The encoder did not rotate
		CW = 1, ///< The encoder rotate clockwise
	} Rotation;

	/**
	 * Which edge of the `a` signal denotes a transition.
	 */
	typedef enum {
		ANY, ///< Trigger on any edge
		ACTIVE_LOW, ///< Trigger on negative edges
		ACTIVE_HIGH, ///< Trigger on negative edges
	} Polarity;

	Encoder() { setup(0, ANY); };

	/**
	 * Same as setup().
	 */
	Encoder(unsigned int debounce, Polarity polarity = ANY) { setup(debounce, polarity); };

	/**
	 * Set up the encoder with a given debounce interval.
	 *
	 * @param debounce the number of calls to process() during which
	 * changes are ignored after a change in `a` has been detected.
	 * @param polarity on which edge to trigger.
	 *
	 */
	void setup(unsigned int debounce, Polarity polarity = ANY);

	/**
	 * Sets the current position of the encoder to the specified value. 
	 *
	 * @param position The new position (defaults to 0).
	 */
	void reset(int position = 0);

	/**
	 * Process new readings from the encoder's terminals.
	 *
	 * @return whether, and in which direction, the encoder has moved in
	 * this last step.
	 */
	Rotation process(bool a, bool b);

	/**
	 * Get the position of the encoder.
	 */
	int get();
private:
	bool validEdge(bool a);
	unsigned int debouncing_;
	unsigned int debounce_;
	int position_;
	Polarity polarity_;
	bool a_;
	bool lastA_;
	bool primed_;
};
