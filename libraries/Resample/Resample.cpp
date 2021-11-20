#include <iostream>
#include <math.h>    // ceil
#include <string.h>  // memcpy

#define ENABLE_NE10_FIR_DECIMATE_FLOAT_NEON // Defines needed for Ne10 library
#define ENABLE_NE10_FIR_INTERPOLATE_FLOAT_NEON
#include <libraries/ne10/NE10.h> // neon library, must be included before `Resample.h` (or anything else that #includes NE10.h)

#include "Resample.h"
#include "aa_fir.h"

std::vector<float> ResampleBase::get_fir(unsigned int factor, fir_quality quality, fir_phase phase) {
    if (factor == 2 && quality == high && phase == minimum)
        return fir_2_high_minphase;
    else if (factor == 2 && quality == high && phase == linear)
        return fir_2_high_linear;
    else if (factor == 2 && quality == low && phase == minimum)
        return fir_2_low_minphase;
    else if (factor == 2 && quality == low && phase == linear)
        return fir_2_low_linear;
    else if (factor == 4 && quality == high && phase == minimum)
        return fir_4_high_minphase;
    else if (factor == 4 && quality == high && phase == linear)
        return fir_4_high_linear;
    else if (factor == 4 && quality == low && phase == minimum)
        return fir_4_low_minphase;
    else if (factor == 4 && quality == low && phase == linear)
        return fir_4_low_linear;
    else if (factor == 8 && quality == high && phase == minimum)
        return fir_8_high_minphase;
    else if (factor == 8 && quality == high && phase == linear)
        return fir_8_high_linear;
    else if (factor == 8 && quality == low && phase == minimum)
        return fir_8_low_minphase;
    else if (factor == 8 && quality == low && phase == linear)
        return fir_8_low_linear;
    else if (factor == 16 && quality == high && phase == minimum)
        return fir_16_high_minphase;
    else if (factor == 16 && quality == high && phase == linear)
        return fir_16_high_linear;
    else if (factor == 16 && quality == low && phase == minimum)
        return fir_16_low_minphase;
    else if (factor == 16 && quality == low && phase == linear)
        return fir_16_low_linear;
    else {
        std::cerr << "get_fir: invalid combination " << factor << quality << phase << std::endl;
        return std::vector<float>();
    }
}

void ResampleBase::cleanup() {
    NE10_FREE(pCoeff);
    NE10_FREE(pState);
    pCoeff = nullptr;
    pState = nullptr;
}

int Decimator::setup(unsigned int decimationFactor, unsigned int blockSize, fir_quality quality, fir_phase phase) {
    cleanup();
    this->blockSizeIn = blockSize;
    this->factor      = decimationFactor;
    if (decimationFactor == 1) {
        // Don't do anything
        return 0;
    }
    std::vector<float> fir     = get_fir(decimationFactor, quality, phase);
    uint               numTaps = fir.size();

    pCoeff = (ne10_float32_t*)NE10_MALLOC(numTaps * sizeof(ne10_float32_t));
    pState = (ne10_float32_t*)NE10_MALLOC(
        (numTaps + blockSize - 1) * sizeof(ne10_float32_t));
    if (!pState || !pCoeff)
        return -1;

    for (unsigned int n = 0; n < numTaps; ++n) {
        // reverse filter coefficients
        pCoeff[n] = fir[numTaps - 1 - n];
    }
    int err = ne10_fir_decimate_init_float(&decimator, numTaps, decimationFactor, pCoeff, pState, blockSize);
    if (err) {
        std::cerr << "ERR: blockSize must be whole multiple of decimationFactor" << std::endl;
        return -1;
    }

    return 0;
}

void Decimator::process(ne10_float32_t* outBlock, const ne10_float32_t* inBlock) {
    if (factor == 1 && outBlock != inBlock) {
        memcpy(outBlock, inBlock, blockSizeIn * sizeof *outBlock);
        return;
    }
    ne10_fir_decimate_float_neon(&decimator, (float*)inBlock, outBlock, blockSizeIn);
}

int Interpolator::setup(unsigned int L, unsigned int blockSize, fir_quality quality, fir_phase phase) {
    cleanup();
    this->blockSizeIn = blockSize / L;
    this->factor      = L;
    if (L == 1) {
        // Don't do anything
        return 0;
    }
    std::vector<float> fir      = get_fir(L, quality, phase);
    uint               filtSize = fir.size();
    // numTaps must be a multiple of the interpolation factor
    uint numTaps     = ceil((float)filtSize / L) * L;
    uint phaseLength = numTaps / L;
    pCoeff           = (ne10_float32_t*)NE10_MALLOC(numTaps * sizeof(ne10_float32_t));
    pState           = (ne10_float32_t*)NE10_MALLOC(
        (blockSizeIn + phaseLength - 1) * sizeof(ne10_float32_t));
    if (!pState || !pCoeff) {
        return -1;
    }

    for (unsigned int n = 0; n < filtSize; ++n) {
        // reverse fir coefficients
        pCoeff[numTaps - filtSize + n] = fir[filtSize - 1 - n];
    }
    for (uint n = 0; n < numTaps - filtSize; ++n) {
        // rest are are zeros
        pCoeff[n] = 0;
    }

    int err = ne10_fir_interpolate_init_float(&interpolator, L, numTaps, pCoeff, pState, blockSizeIn);
    if (err) {
        std::cerr << "Error: couldn't init interpolator" << std::endl;
        return -1;
    }

    return 0;
}

void Interpolator::process(ne10_float32_t* outBlock, const ne10_float32_t* inBlock) {
    if (factor == 1 && outBlock != inBlock) {
        memcpy(outBlock, inBlock, blockSizeIn * sizeof *outBlock);
        return;
    }
    ne10_fir_interpolate_float_neon(&interpolator, (float*)inBlock, outBlock, blockSizeIn);
}

#if 0
#undef NDEBUG
#include <assert.h>
bool DecimatorTest()
{
	std::vector<std::vector<float>> irs(2);
	const unsigned int len = 1000;
	for(unsigned int n = 0; n < len; ++n) {
		float val = (len - n) / (float)len;
		irs[0].push_back(val);
		irs[1].push_back(-val);
	}
	Decimator c;
	Decimator d;
	const unsigned int blockSize = 16;
	c.setup(irs, blockSize);
	d.setup(irs, blockSize);
	const unsigned int outChannels = 3;
	for(int inChannels = 1; inChannels < 5; ++inChannels)
	{
		const unsigned int numFrames = 3 * len;
		// interleaved buffers
		std::vector<float> outs(numFrames * outChannels);
		std::vector<float> douts(numFrames * outChannels);
		std::vector<float> ins(numFrames * inChannels);
		// ins contains impulses
		for(unsigned int n = 0; n < inChannels; ++n)
			ins[n] = n + 1;
		for(unsigned int n = 0; n < numFrames - blockSize; n += blockSize) {
			unsigned int outOffset = n * outChannels;
			unsigned int inOffset = n * inChannels;
			c.processInterleaved(outs.data() + outOffset, ins.data() + inOffset,
					blockSize, outChannels, inChannels);
			for(unsigned int i = 0; i < inChannels && i < d.getChannels(); ++i)
			{
				float out[blockSize];
				float in[blockSize];
				for(unsigned int k = 0; k < blockSize; ++k)
					in[k] = ins[numFrames + k * inChannels + i];
				d.process(out, in, blockSize, i);
				for(unsigned int k = 0; k < blockSize; ++k)
					outs[numFrames + k * inChannels + i] = out[k];
			}
		}
		for(unsigned int n = 0; n < numFrames; ++n)
		{
			for(unsigned int i = 0; i < outChannels; ++i) {
				float expected;
				if(i < irs.size() && n < irs[i].size() && i < inChannels)
					expected = irs[i][n] * (i + 1);
				else
					expected = 0;
				float out = outs[n * outChannels + i];
				float dout = outs[n * outChannels + i];
				if(out != expected || dout != expected) {
					fprintf(stderr, "error at n: %d, ch: %d. inChannels: %d, inVal: %f, expected: %f, got: %f, dgot: %f\n", n, i, inChannels, ins[n * inChannels +i], expected, out, dout);
					assert(false);
				}
			}
		}
	}
	return true;
}
#endif
