#pragma once
#include <vector>
#include <cmath>
#include <libraries/math_neon/math_neon.h>
#include <stddef.h>

/**
 * A real-to-complex FFT and complex-to-real IFFT. This is a wrapper for the libne10 FFT.
*/

class Fft
{
public:
	Fft();
	Fft(size_t length);
	~Fft();
	int setup(size_t length);
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
	float& fdr(unsigned int n) {
		return frequencyDomain[n * 2];
	};
	/**
	 * Get the imaginary part of the frequency-domain representation at index `n`.
	 */
	float& fdi(unsigned int n) {
		return frequencyDomain[n * 2 + 1];
	};
	/**
	 * Get the absolute value of the frequency-domain representation at index `n`.
	 * The value is computed on the fly at each call and is not cached.
	 */
	float fda(unsigned int n) {
		if(0 == fdr(n) && 0 == fdi(n))
			return 0;
		return sqrtf_neon(fdr(n) * fdr(n) + fdi(n) * fdi(n));
	};
	/**
	 * Get the time-domain representation at index `n`.
	 */
	float& td(unsigned int n) { return timeDomain[n]; };
	static bool isPowerOfTwo(unsigned int n);
	static unsigned int roundUpToPowerOfTwo(unsigned int n);
private:
	float* timeDomain = nullptr;
	float* frequencyDomain = nullptr;
	size_t length;
	struct Private;
	struct Private* p;
};
