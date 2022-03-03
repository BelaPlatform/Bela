#pragma once
#include <libraries/ne10/NE10.h>
#include <vector>
#include <cmath>
#include <libraries/math_neon/math_neon.h>

/**
 * A real-to-complex FFT and complex-to-real IFFT. This is a wrapper for the libne10 FFT.
*/

class Fft
{
public:
	Fft(){};
	Fft(unsigned int length){ setup(length); };
	~Fft(){ cleanup(); };
	int setup(unsigned int length);
	void cleanup();
	/**
	 * Perform the FFT of the signal whose time-domain representation is stored internally.
	 */
	void fft();
	/**
	 * Perform the FFT of the signal whose time-domain representation is passed as an argument.
	 */
	void fft(const std::vector<float>& input);
	/**
	 * Perform the IFFT of the internal frequency-domain signal.
	 */
	void ifft();
	/**
	 * Perform the IFFT of the signal whose frequency-domain representation
	 * is passed as arguments.
	 */
	void ifft(const std::vector<float>& reInput, const std::vector<float>& imInput);
	/**
	 * Get the real part of the frequency-domain representation at index `n`.
	 */
	float& fdr(unsigned int n) { return frequencyDomain[n].r; };
	/**
	 * Get the imaginary part of the frequency-domain representation at index `n`.
	 */
	float& fdi(unsigned int n) { return frequencyDomain[n].i; };
	/**
	 * Get the absolute value of the frequency-domain representation at index `n`.
	 * The value is computed on the fly at each call and is not cached.
	 */
	float fda(unsigned int n) { return sqrtf_neon(fdr(n) * fdr(n) + fdi(n) * fdi(n)); };
	/**
	 * Get the time-domain representation at index `n`.
	 */
	float& td(unsigned int n) { return timeDomain[n]; };
	static bool isPowerOfTwo(unsigned int n);
	static unsigned int roundUpToPowerOfTwo(unsigned int n);
private:
	ne10_float32_t* timeDomain = nullptr;
	ne10_fft_cpx_float32_t* frequencyDomain = nullptr;
	ne10_fft_r2c_cfg_float32_t cfg = nullptr;
	unsigned int length;
};
