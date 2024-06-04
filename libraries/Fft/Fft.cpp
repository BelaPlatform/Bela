#include "Fft.h"

// heuristic to guess whether ne10 is available
#if ((defined(__aarch64__) || defined(__arm__)) && !defined(DARWIN))
#define NE10
#else
#define FFTW3
#endif

#if defined(FFTW3) + defined(NE10) != 1
#error Exactly one of FFTW3 or NE10 should be selected
#endif

#ifdef NE10
#include <libraries/ne10/NE10.h>
#endif // NE10
#ifdef FFTW3
#include <fftw3.h>
#endif // FFTW3

unsigned int Fft::roundUpToPowerOfTwo(unsigned int n)
{
	if(n <= 2)
		return 2;
	unsigned int highestBit = sizeof(n) * 8 - 1;
	while((1 << highestBit) >= n)
		--highestBit;
	if((1 << highestBit) == n)
		return n;
	return (1 << (highestBit + 1));
}

bool Fft::isPowerOfTwo(unsigned int n)
{
	if(!n)
		return false;
	while(0 == n % 2)
	{
		n >>= 1;
	}
	return 1 == n;
}

struct Fft::Private
{
#ifdef NE10
	ne10_fft_r2c_cfg_float32_t cfg = nullptr;
#endif
#ifdef FFTW3
	fftwf_plan cfgDirect = nullptr;
	fftwf_plan cfgInverse = nullptr;
#endif // FFTW3
};

Fft::Fft() : p(new Fft::Private) {}
Fft::Fft(size_t length) : p(new Fft::Private) {
	setup(length);
}

Fft::~Fft()
{
	cleanup();
	delete p;
}

int Fft::setup(size_t length)
{
	if(!isPowerOfTwo(length))
	{
		this->length = 0;
		return -1;
	}
	cleanup();
	this->length = length;
#ifdef NE10
	timeDomain = (ne10_float32_t*) NE10_MALLOC (length * sizeof (ne10_float32_t));
	frequencyDomain = (float*)NE10_MALLOC(length * sizeof (ne10_fft_cpx_float32_t));
	p->cfg = ne10_fft_alloc_r2c_float32 (length);
	bool good = !!p->cfg;
#endif // NE10
#ifdef FFTW3
	timeDomain = fftwf_alloc_real(length);
	frequencyDomain = (float*)fftwf_alloc_complex(length);
	// without FFTW_ESTIMATE things take a long time and seem to hang, but could provide better performance
	p->cfgDirect = fftwf_plan_dft_r2c_1d(length, timeDomain, (fftwf_complex*)frequencyDomain, FFTW_PRESERVE_INPUT | FFTW_ESTIMATE);
	p->cfgInverse = fftwf_plan_dft_c2r_1d(length, (fftwf_complex*)frequencyDomain, timeDomain, FFTW_PRESERVE_INPUT | FFTW_ESTIMATE);
	bool good = p->cfgDirect && p->cfgInverse;
#endif // FFTW3
	if(!good || !timeDomain || !frequencyDomain)
	{
		cleanup();
		return -1;
	}
	return 0;
}

void Fft::cleanup()
{
#ifdef NE10
	NE10_FREE(timeDomain);
	NE10_FREE(frequencyDomain);
	ne10_fft_destroy_r2c_float32(p->cfg);
	p->cfg = nullptr;
#endif // NE10
#ifdef FFTW3
	free(timeDomain);
	free(frequencyDomain);
	fftwf_destroy_plan(p->cfgDirect);
	fftwf_destroy_plan(p->cfgInverse);
	p->cfgDirect = nullptr;
	p->cfgInverse = nullptr;
#endif // FFTW3
	timeDomain = nullptr;
	frequencyDomain = nullptr;
}

void Fft::fft()
{
#ifdef NE10
	ne10_fft_r2c_1d_float32_neon((ne10_fft_cpx_float32_t*)frequencyDomain, (ne10_float32_t*)timeDomain, p->cfg);
#endif // NE10
#ifdef FFTW3
	fftwf_execute(p->cfgDirect);
#endif // FFTW3
}

#include <string.h>
void Fft::fft(const std::vector<float>& input)
{
	if(input.size() != length)
		return;
	memcpy(timeDomain, input.data(), sizeof(input[0]) * length);
	fft();
}

void Fft::ifft()
{
#ifdef NE10
	ne10_fft_c2r_1d_float32_neon(timeDomain, (ne10_fft_cpx_float32_t*)frequencyDomain, p->cfg);
#endif // NE10
#ifdef FFTW3
	fftwf_execute(p->cfgInverse);
#endif // FFTW3
}

void Fft::ifft(const std::vector<float>& reInput, const std::vector<float>& imInput)
{
	if(reInput.size() < length / 2 + 1 || imInput.size() < length / 2 + 1)
		return;
	for (int i = 0; i < length/2 + 1; i++) {
		fdr(i) = reInput[i];
		fdi(i) = imInput[i];
	}
	ifft();
}

#if 0
#include <stdio.h>
#include <array>
#undef NDEBUG
#include <assert.h>
#include <cmath>
#define ALMOST_EQUAL(a,b) (abs(a-b)<0.00001)
bool FftTest()
{
	std::array<float, 3> lengths = {{16384, 32768, 65536}};
	for(auto& length : lengths)
	{
		Fft X(length);
		std::vector<float> x(length);
		unsigned int k = 0;
		bool done = false;
		unsigned int bin = 100;
		while(!done)
		{
			for(unsigned int n = 0; n < x.size() / 2 + 1; ++n)
			{
				if(0 == k)
					x[n] = 0;
				else if(1 == k)
					x[n] = n % 2;
				else if(2 == k)
					x[n] = n/(float)x.size();
				else if(3 == k)
				{
					float Fs = 44100;
					float f = (bin/(float)length) * Fs;
					float t = n / Fs;
					x[n] = cos(2 * M_PI * f * t);
				}
				else
					done = true;
			}
			X.fft(x);
			for(unsigned int n = 0; n < x.size() / 2 + 1; ++n)
				assert(X.td(n) == x[n]);
			if(3 == k)
			{
				for(unsigned int n = 0; n < x.size(); ++n)
				{
					if(bin == n)
						assert(X.fdr(n) > length / 4);
					else
						assert(X.fdr(n) < 1);
					assert(X.fdi(n) < 1);
				}
			}
			X.ifft();
			for(unsigned int n = 0; n < x.size() / 2 + 1; ++n)
				 assert(ALMOST_EQUAL(X.td(n), x[n]));
			++k;
		}
		X.cleanup();
	}
	for(unsigned int n = 0; n < sizeof(unsigned int) * 8 - 1; ++n)
	{
		unsigned int num = 2 << n;
		assert(Fft::isPowerOfTwo(num));
		assert(Fft::roundUpToPowerOfTwo(num) == num);
		assert(Fft::roundUpToPowerOfTwo(num + 1) == 2 * num);
	}
	printf("FftTest successful\n");
	return true;
}
#endif
