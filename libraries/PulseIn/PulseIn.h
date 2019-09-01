#pragma once

#include <Bela.h>
#include <vector>

/**
 * \brief A class to measure the duration of a pulse on a digital pin.
 *
 * This can be used to measure distance in conjunction with an ultrasonic
 * ranging sensor (e.g.: HC-SR04).
 */
class PulseIn {
private:
	std::vector<int> _array;
	int _pulseOnState;
	int _digitalInput;
	bool _pulseIsOn;
	uint64_t _pulseStart;
	uint64_t _lastContext;
public:
	PulseIn(){
		_digitalInput = -1;
	};

	/**
	 * Initializes the PulseIn object. Also takes care of setupializing the digital pin as input.
	 *
	 * @param context the BelaContext
	 * @param digitalInput the digital input where to activate a pulse detector
	 * @param direction the direction of the pulse,
	 *  can be 1 to detect positive pulses, e.g.:( 0 0 0 0 1 1 0 0 0 0 0)
	 *  or -1 to detect negative pulses, e.g.: ( 1 1 1 1 0 0 1 1 1 1)
	 */
	PulseIn(BelaContext* context, unsigned int digitalInput, int direction=1){
		setup(context, digitalInput, direction);
	};

	/**
	 * Initializes the PulseIn object. Also takes care of initializing the digital pin as input.
	 *
	 * If the object has been created with the default constructor, the user will
	 * need to call setup() before calling check() or hasPulsed().
	 * @param context the BelaContext
	 * @param digitalInput the digital input where to activate a pulse detector
	 * @param direction the direction of the pulse,
	 *  can be 1 to detect positive pulses, e.g.:( 0 0 0 0 1 1 0 0 0 0 0)
	 *  or -1 to detect negative pulses, e.g.: ( 1 1 1 1 0 0 1 1 1 1)
	 */
	void setup(BelaContext* context, unsigned int digitalInput, int direction=1);

	/**
	 * Detects pulses.
	 *
	 * The user does not need to call this method as long as they call hasPulsed() at least once per context.
	 * The rationale why we check() for pulses in a different method
	 * than hasPulsed() is because user might not query for hasPulsed() every sample,
	 * so we are safe so long as they call hasPulsed() or check() at least once per buffer.
	 * Also, results are cached (i.e.: we do not check() for pulses twice for the same context.
	 * context->audioFramesElapsed is used as an identifier.
	 */
	void check(BelaContext* context);

	/**
	 * Looks for the end of a pulse.
	 *
	 * @param context the current BelaContext
	 * @param frame the frame at which to check if a pulse was detected.
	 * @return the length of the pulse if a pulse ending was detected at sample n, zero otherwise.
	 */
	int hasPulsed(BelaContext* context, unsigned int frame){//let's leave this in PulseIn.h to allow the compiler to optimize out the call.
		if(_lastContext != context->audioFramesElapsed){ // check for pulses in the whole context and cache the result
			check(context);
		}
		return _array[frame];
	}
	void cleanup();
	virtual ~PulseIn();
};
