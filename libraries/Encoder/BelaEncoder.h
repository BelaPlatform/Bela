#pragma once
#include <libraries/Encoder/Encoder.h>
#include <Bela.h>

/**
 *
 * @brief Connect a quadrature rotary encoder, and handle it at audio rate from Bela.
 *
 * This class is a Bela-specific wrapper for Encoder, which is Bela-agnostic.
 * All the methods of BelaEncoder map to those of Encoder, and so only the
 * differences between the two are documented here.
 */
class BelaEncoder : public Encoder
{
public:
	struct Pins {
		unsigned int a; ///< Bela's digital pin connected to the encoder's A pin
		unsigned int b; ///< Bela's digital pin connected to the encoder's B pin
	};
	struct Settings {
		BelaContext* context;
		float debounceMs;
		Pins pins;
		Polarity polarity;
	};
	BelaEncoder();
	BelaEncoder(const Settings& settings);
	int setup(const Settings& settings);
	/**
	 * Call this method once per block.
	 *
	 * If more than one rotation happens during a block, the internal
	 * counter is updated for each rotation, but only the direction of the
	 * last one is returned.
	 */
	Rotation process(BelaContext* context);
	/**
	 * Call this method once per frame.
	 */
	Rotation process(BelaContext* context, unsigned int frame)
	{
		bool a = digitalRead(context, frame, pins.a);
		bool b = digitalRead(context, frame, pins.b);
		return Encoder::process(a, b);
	}
private:
	Pins pins;
};
