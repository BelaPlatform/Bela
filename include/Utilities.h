/**
 *  @file
 *  @brief Wiring-inspired utility functions and macros
 *
 *  Macros and functions for I/O and data processing taking after the Wiring
 *  (Arduino) language. This code began as part of the Hackable Instruments
 *  project (EPSRC) at Queen Mary University of London, 2013-14.
 *
 *  (c) 2014-15 Andrew McPherson, Victor Zappi and Giulio Moro,
 *  Queen Mary University of London
 */

#ifndef UTILITIES_H_
#define UTILITIES_H_

#include "Bela.h"

/**
 * \defgroup iofunctions I/O functions and constants
 *
 * These functions and macros are used for audio, analog and digital I/O. All the
 * I/O functions require the BelaContext data structure from render() to be passed
 * in. This means that these functions are, by design, \b only usable from within
 * the rendering thread.
 * 
 * The naming conventions are loosely derived from the Arduino environment, and the
 * syntax is similar. Unlike Arduino, the I/O functions require the frame number at which
 * the read or write should take place, since all I/O happens synchronously with the
 * audio clock.
 *
 * @{
 */

#ifndef INPUT
	#define INPUT 0x0
#endif /* INPUT */

#ifndef OUTPUT
	#define OUTPUT 0x1
#endif /* OUTPUT */

/** @} */

/**
 * \cond BIT_FUNCTIONS
 *
 * @{
 */

/// Set the given bit in \c word to 1.
#define setBit(word,bit) 			((word) | (1 << (bit)))

/// Clear the given bit in \c word to 0.
#define clearBit(word,bit) 			((word) &~ (1 << (bit)))

/// Check if the given bit in \c word is 1 (returns nonzero) or 0 (returns zero).
#define getBit(word,bit) 			(((word) >> (bit)) & 1)

/// Set/clear the given bit in \c word to \c value.
#define changeBit(word,bit,value) 	((clearBit((word),(bit))) | ((value) << (bit)))

/** @}
 * \endcond
 * */

/**
 * \ingroup iofunctions
 *
 * @{
 */

// Note: pinMode(), analogWrite() and digitalWrite() should be able to be called from setup()
// Likewise, thread launch should be able to be called from setup()
// Also, make volume change functions callable from render() thread -- as an aux task?

/**
 * \brief Read an audio input, specifying the frame number (when to read) and the channel.
 *
 * This function returns the value of an audio input, at the time indicated by \c frame.
 * The returned value ranges from -1 to 1.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to read the audio input. Valid values range
 * from 0 to (context->audioFrames - 1).
 * \param channel Which audio input to read. Valid values are between 0 and
 * (context->audioChannels - 1), typically 0 to 1 by default.
 * \return Value of the analog input, range  to 1.
 */
static inline float audioRead(BelaContext *context, int frame, int channel);

/**
 * Non-interleaved version of audioRead()
 */
static inline float audioReadNI(BelaContext *context, int frame, int channel);

/**
 * \brief Write an audio output, specifying the frame number (when to write) and the channel.
 *
 * This function sets the value of an audio output, at the time indicated by \c frame. Valid
 * values are between -1 and 1.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to write the audio output. Valid values range
 * from 0 to (context->audioFrames - 1).
 * \param channel Which analog output to write. Valid values are between 0 and
 * (context->audioChannels - 1), typically 0 to 1 by default.
 * \param value Value to write to the output, range -1 to 1.
 */
static inline void audioWrite(BelaContext *context, int frame, int channel, float value);

/**
 * Non-interleaved version of audioWrite()
 */
static inline void audioWriteNI(BelaContext *context, int frame, int channel, float value);

/**
 * \brief Read an analog input, specifying the frame number (when to read) and the channel.
 *
 * This function returns the value of an analog input, at the time indicated by \c frame.
 * The returned value ranges from 0 to 1, corresponding to a voltage range of 0 to 4.096V.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to read the analog input. Valid values range
 * from 0 to (context->analogFrames - 1).
 * \param channel Which analog input to read. Valid values are between 0 and
 * (context->analogInChannels - 1), typically 0 to 7 by default.
 * \return Value of the analog input, range 0 to 1.
 */
static inline float analogRead(BelaContext *context, int frame, int channel);

/**
 * Non-interleaved version of analogRead()
 */
static inline float analogReadNI(BelaContext *context, int frame, int channel);

/**
 * \brief Write an analog output, specifying the frame number (when to write) and the channel.
 *
 * This function sets the value of an analog output, at the time indicated by \c frame. Valid
 * values are between 0 and 1, corresponding to the range 0 to 5V.
 *
 * The value written will persist for all future frames if BELA_FLAG_ANALOG_OUTPUTS_PERSIST
 * is set in context->flags. This is the default behaviour.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to write the analog output. Valid values range
 * from 0 to (context->analogFrames - 1).
 * \param channel Which analog output to write. Valid values are between 0 and
 * (context->analogOutChannels - 1), typically 0 to 7 by default.
 * \param value Value to write to the output, range 0 to 1.
 */
static inline void analogWrite(BelaContext *context, int frame, int channel, float value);

/**
 * Non-interleaved version of analogWrite()
 */
static inline void analogWriteNI(BelaContext *context, int frame, int channel, float value);

/**
 * \brief Write an analog output, specifying the frame number (when to write) and the channel.
 *
 * This function sets the value of an analog output, at the time indicated by \c frame. Valid
 * values are between 0 and 1, corresponding to the range 0 to 5V.
 *
 * Unlike analogWrite(), the value written will affect \b only the frame specified, with
 * future values unchanged. This is faster than analogWrite() so is better suited
 * to applications where every frame will be written to a different value. If
 * BELA_FLAG_ANALOG_OUTPUTS_PERSIST is not set within context->flags, then
 * analogWriteOnce() and analogWrite() are equivalent.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to write the analog output. Valid values range
 * from 0 to (context->analogFrames - 1).
 * \param channel Which analog output to write. Valid values are between 0 and
 * (context->analogOutChannels - 1), typically 0 to 7 by default.
 * \param value Value to write to the output, range 0 to 1.
 */
static inline void analogWriteOnce(BelaContext *context, int frame, int channel, float value);

/**
 * Non-interleaved version of analogWriteNI();
 */
static inline void analogWriteOnceNI(BelaContext *context, int frame, int channel, float value);

/**
 * \brief Read a digital input, specifying the frame number (when to read) and the pin.
 *
 * This function returns the value of a digital input, at the time indicated by \c frame.
 * The value is 0 if the pin is low, and nonzero if the pin is high (3.3V).
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to read the digital input. Valid values range
 * from 0 to (context->digitalFrames - 1).
 * \param channel Which digital input to read. 16 pins across the headers are
 * available. Check your board diagram to know where they are on the specific
 * board you have.
 * \return Value of the digital input.
 */
static inline int digitalRead(BelaContext *context, int frame, int channel);

/**
 * \brief Write a digital output, specifying the frame number (when to write) and the pin.
 *
 * This function sets the value of a digital output, at the time indicated by \c frame.
 * A value of 0 sets the pin low; any other value sets the pin high (3.3V).
 *
 * The value written will persist for all future frames.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to write the digital output. Valid values range
 * from 0 to (context->digitalFrames - 1).
 * \param channel Which digital output to write. 16 pins across the headers are
 * available. Check your board diagram to know where they are on the specific
 * board you have.
 * \param value Value to write to the output.
 */
static inline void digitalWrite(BelaContext *context, int frame, int channel, int value);

/**
 * \brief Write a digital output, specifying the frame number (when to write) and the pin.
 *
 * This function sets the value of a digital output, at the time indicated by \c frame.
 * A value of 0 sets the pin low; any other value sets the pin high (3.3V).
 *
 * Unlike digitalWrite(), the value written will affect \b only the frame specified, with
 * future values unchanged. This is faster than digitalWrite() so is better suited
 * to applications where every frame will be written to a different value.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to write the digital output. Valid values range
 * from 0 to (context->digitalFrames - 1).
 * \param channel Which digital output to write. 16 pins across the headers are
 * available. Check your board diagram to know where they are on the specific
 * board you have.
 * \param value Value to write to the output.
 */
static inline void digitalWriteOnce(BelaContext *context, int frame, int channel, int value);

/**
 * \brief Set the direction of a digital pin to input or output.
 *
 * This function sets the direction of a digital pin, at the time indicated by \c frame.
 * Valid values are \c INPUT and \c OUTPUT. All pins begin as inputs by default.
 *
 * The value written will persist for all future frames.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to set the pin direction. Valid values range
 * from 0 to (context->digitalFrames - 1).
 * \param channel Which digital channel to set. 16 pins across the headers are
 * available. Check your board diagram to know where they are on the specific
 * board you have.
 * \param mode Direction of the pin (\c INPUT or \c OUTPUT).
 */
static inline void pinMode(BelaContext *context, int frame, int channel, int mode);

/**
 * \brief Set the direction of a digital pin to input or output.
 *
 * This function sets the direction of a digital pin, at the time indicated by \c frame.
 * Valid values are \c INPUT and \c OUTPUT. All pins begin as inputs by default.
 *
 * The value written will affect only the specified frame.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame Which frame (i.e. what time) to set the pin direction. Valid values range
 * from 0 to (context->digitalFrames - 1).
 * \param channel Which digital channel to set. 16 pins across the headers are
 * available. Check your board diagram to know where they are on the specific
 * board you have.
 * \param mode Direction of the pin (\c INPUT or \c OUTPUT).
 */
static inline void pinModeOnce(BelaContext *context, int frame, int channel, int mode);

/*
 * \brief Returns the value of the given multiplexer channel for the given analog input. 
 *
 * This function reads an input from the Multiplexer Capelet hardware, which needs to be
 * attached and enabled by selecting 16, 32 or 64 analog input channels in the command line
 * arguments. With the Multiplexer Capelet, each analog input can be connected to one of 8
 * multiplexer channels. This function will return a particular multiplexer channel for a
 * particular input, with the returned valued being the most recent sample taken from that pin.
 *
 * Depending on the block size, it may take longer than a single block to scan all multiplexer
 * channels. For this reason, successive calls to multiplexerAnalogRead() may return the same
 * sample. If you want precise timing control on when a multiplexer input was sampled, use
 * multiplexerChannelForFrame() instead to determine which multiplexer channels were sampled
 * in a particular block.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param input The analog input to read, i.e. what would be passed as \c channel to analogRead().
 * Valid values are 0 to (context->analogInChannels - 1).
 * \param muxChannel Which multiplexer channel to read. Valid values are 0 to 
 * (context->multiplexerChannels - 1).
 * \return Value of the analog input from the Multiplexer Capelet.
 */

static inline float multiplexerAnalogRead(BelaContext *context, int input, int muxChannel);

/*
 * \brief Returns which multiplexer channel the given analog frame was taken from.
 * 
 * This function indicates what the multiplexer setting was for a given analog input frame.
 * This can be used to work out which pin on the Multiplexer Capelet a given analog input sample 
 * was taken from. For this function to have any meaning, the Multiplexer Capelet hardware must
 * be attached and it should be enabled by selecting 16, 32 or 64 analog input channels in the
 * command line arguments.
 *
 * Depending on the block size, it may take longer than a single block to scan all multiplexer
 * channels. For this reason, each call to render() may contain only a subset of the available
 * multiplexer channels. This function allows you timing precision by knowing at what frame each
 * multiplexer reading was taken, but it does not guarantee that all channels can be read in 
 * any given callback. If you need access to all the multiplexer inputs in every call to render(),
 * use multiplexerAnalogRead() instead.
 *
 * \param context The I/O data structure which is passed by Bela to render().
 * \param frame The analog frame (i.e. the time) whose multiplexer setting should be queried.
 * \return Multiplexer channel setting at the given frame.
 */

static inline unsigned int multiplexerChannelForFrame(BelaContext *context, int frame);

/** @} */

/**
 * \defgroup wiring Wiring language support
 *
 * These are functions found in the Wiring (Arduino) language which are not directly
 * related to I/O but are provided as a convenience.
 *
 * @{
 */

/**
 * \brief Linearly rescale a number from one range of values to another.
 *
 * This function linearly scales values of \c x such that the range in_min to
 * in_max at the input corresponds to the range out_min to out_max
 * at the output. Values outside this range are extrapolated.
 *
 * This function behaves identically to the function of the same name in Processing. It
 * is also similar to the corresponding function in Arduino, except that it supports floating
 * point values.
 *
 * \param x Input value to be mapped.
 * \param in_min Lower bound of the input range.
 * \param in_max Upper bound of the input range.
 * \param out_min Lower bound of the output range.
 * \param out_max Upper bound of the output range.
 * \return Rescaled value.
 */
static inline float map(float x, float in_min, float in_max, float out_min, float out_max);

/**
 * \brief Constrain a number to stay within a given range.
 *
 * This function constrains \c x to remain within the range min_val to
 * max_val. Values of \c x outside this range are clipped to the edges
 * of the range.
 *
 * This function behaves identically to the function of the same name in Processing. It
 * is also similar to the corresponding function in Arduino, except that it supports floating
 * point values.
 *
 * \param x Input value to be constrained.
 * \param min_val Minimum possible value.
 * \param max_val Maximum possible value.
 * \return Constrained value.
 */
static inline float constrain(float x, float min_val, float max_val);

/**
 * \brief Returns the maximum of two numbers
 *
 * Returns the maximum of two numbers
 */
static inline float min(float x, float y);

/**
 * \brief Returns the minimum of two numbers
 *
 * Returns the minimum of two numbers
 */
static inline float max(float x, float y);

/** @} */
// audioRead()
//
// Returns the value of the given audio input at the given frame number.
static inline float audioRead(BelaContext *context, int frame, int channel) {
	return context->audioIn[frame * context->audioInChannels + channel];
}

static inline float audioReadNI(BelaContext *context, int frame, int channel) {
	return context->audioIn[channel * context->audioFrames + frame];
}

// audioWrite()
//
// Sets a given audio output channel to a value for the current frame
static inline void audioWrite(BelaContext *context, int frame, int channel, float value) {
	context->audioOut[frame * context->audioOutChannels + channel] = value;
}

static inline void audioWriteNI(BelaContext *context, int frame, int channel, float value) {
	context->audioOut[channel * context->audioFrames + frame] = value;
}

// analogRead()
//
// Returns the value of the given analog input at the given frame number.
static inline float analogRead(BelaContext *context, int frame, int channel) {
	return context->analogIn[frame * context->analogInChannels + channel];
}

static inline float analogReadNI(BelaContext *context, int frame, int channel) {
	return context->analogIn[channel * context->analogFrames + frame];
}

// analogWriteOnce()
//
// Sets a given channel to a value for only the current frame
static inline void analogWriteOnce(BelaContext *context, int frame, int channel, float value) {
	context->analogOut[frame * context->analogOutChannels + channel] = value;
}

static inline void analogWriteOnceNI(BelaContext *context, int frame, int channel, float value) {
	context->analogOut[channel * context->analogFrames + frame] = value;
}

// analogWrite()
//
// Sets a given analog output channel to a value for the current frame and, if persistent outputs are
// enabled, for all subsequent frames
static inline void analogWrite(BelaContext *context, int frame, int channel, float value) {
	unsigned int f;
	for(f = frame; f < context->analogFrames; f++)
		analogWriteOnce(context, f, channel, value);
}

static inline void analogWriteNI(BelaContext *context, int frame, int channel, float value) {
	unsigned int f;
	for(f = frame; f < context->analogFrames; f++)
		analogWriteOnceNI(context, f, channel, value);
}

// digitalRead()
//
// Returns the value of a given digital input at the given frame number
static inline int digitalRead(BelaContext *context, int frame, int channel) {
	return getBit(context->digital[frame], channel + 16);
}

// digitalWrite()
//
// Sets a given digital output channel to a value for the current frame and all subsequent frames
static inline void digitalWrite(BelaContext *context, int frame, int channel, int value) {
	unsigned int f;
	for(f = frame; f < context->digitalFrames; f++) {
		if(value)
			context->digital[f] |= 1 << (channel + 16);
		else
			context->digital[f] &= ~(1 << (channel + 16));
	}
}

// digitalWriteOnce()
//
// Sets a given digital output channel to a value for the current frame only
static inline void digitalWriteOnce(BelaContext *context, int frame, int channel, int value) {
	if(value)
		context->digital[frame] |= 1 << (channel + 16);
	else
		context->digital[frame] &= ~(1 << (channel + 16));
}

// pinMode()
//
// Sets the direction of a digital pin for the current frame and all subsequent frames
static inline void pinMode(BelaContext *context, int frame, int channel, int mode) {
	unsigned int f;
	for(f = frame; f < context->digitalFrames; f++) {
		if(mode == INPUT)
			context->digital[f] |= (1 << channel);
		else
			context->digital[f] &= ~(1 << channel);
	}
}

// pinModeOnce()
//
// Sets the direction of a digital pin for the current frame only
static inline void pinModeOnce(BelaContext *context, int frame, int channel, int mode) {
	if(mode == INPUT)
		context->digital[frame] |= (1 << channel);
	else
		context->digital[frame] &= ~(1 << channel);
}

// multiplexerAnalogRead()
//
// Returns the value of the given multiplexer channel for the given analog input. 
static inline float multiplexerAnalogRead(BelaContext *context, int input, int muxChannel) {
	return context->multiplexerAnalogIn[muxChannel * context->analogInChannels + input];
}

// multiplexerChannelForFrame()
//
// Returns which multiplexer channel the given analog frame was taken from.
static inline unsigned int multiplexerChannelForFrame(BelaContext *context, int frame) {
	if(context->multiplexerChannels <= 1)
		return 1;
	return (context->multiplexerStartingChannel + frame) % context->multiplexerChannels;
}

// map()
//
// Scale an input value from one range to another. Works like its Wiring language equivalent.
// x is the value to scale; in_min and in_max are the input range; out_min and out_max
// are the output range.

static inline float map(float x, float in_min, float in_max, float out_min, float out_max)
{
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// constrain()
//
// Clips an input value to be between two end points
// x is the value to constrain; min_val and max_val are the range

static inline float constrain(float x, float min_val, float max_val)
{
	if(x < min_val) return min_val;
	if(x > max_val) return max_val;
	return x;
}

static inline float max(float x, float y){
	return x > y ? x : y;
}

static inline float min(float x, float y){
	return x < y ? x : y;
}

#endif /* UTILITIES_H_ */
