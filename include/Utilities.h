#pragma once
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

