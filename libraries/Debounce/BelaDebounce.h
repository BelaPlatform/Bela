#pragma once
#include <Bela.h>
#include <libraries/Debounce/Debounce.h>

/**
 * A debounced reading from a Bela digital in.
 */

class BelaDebounce : public Debounce
{
public:
	struct Settings{
		BelaContext* context; ///< BelaContext
		unsigned int channel; ///< Bela digital in channels to which the switch is connected
		double debounceMs; ///< Debounce time in milliseconds.
	};
	BelaDebounce();
	/**
	 * Same as setup(), but throws on error.
	 */
	BelaDebounce(const Settings& settings);
	/**
	 * Set up the switch.
	 *
	 * @return 0 on success or an error code otherwise.
	 */
	int setup(const Settings& settings);
	/**
	 * Process the current block of data.
	 * Call this once per block.
	 *
	 * @return the debounced value of the switch at the end of the block.
	 */
	bool process(BelaContext* context);
	/**
	 * Process the current frame of data.
	 * Call this every frame.
	 *
	 * @return the debounced value of the switch.
	 */
	bool process(BelaContext* context, unsigned int frame);
	using Debounce::process;
private:
	unsigned int channel;
};
