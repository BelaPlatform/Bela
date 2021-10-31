#include <iostream>
#include <math.h> // ceil
#include <string.h>

#include "Resample.h"
#include "aa_fir.h"

std::vector<float> get_fir(unsigned int factor, enum fir_quality quality, enum fir_phase phase) {
    if (factor == 2 && quality == FIR_HIGH && phase == MINIMUM)
        return fir_2_high_minphase;
    else if (factor == 2 && quality == FIR_HIGH && phase == LINEAR)
        return fir_2_high_linear;
    else if (factor == 2 && quality == FIR_LOW && phase == MINIMUM)
        return fir_2_low_minphase;
    else if (factor == 2 && quality == FIR_LOW && phase == LINEAR)
        return fir_2_low_linear;
    else if (factor == 4 && quality == FIR_HIGH && phase == MINIMUM)
        return fir_4_high_minphase;
    else if (factor == 4 && quality == FIR_HIGH && phase == LINEAR)
        return fir_4_high_linear;
    else if (factor == 4 && quality == FIR_LOW && phase == MINIMUM)
        return fir_4_low_minphase;
    else if (factor == 4 && quality == FIR_LOW && phase == LINEAR)
        return fir_4_low_linear;
    else if (factor == 8 && quality == FIR_HIGH && phase == MINIMUM)
        return fir_8_high_minphase;
    else if (factor == 8 && quality == FIR_HIGH && phase == LINEAR)
        return fir_8_high_linear;
    else if (factor == 8 && quality == FIR_LOW && phase == MINIMUM)
        return fir_8_low_minphase;
    else if (factor == 8 && quality == FIR_LOW && phase == LINEAR)
        return fir_8_low_linear;
    else if (factor == 16 && quality == FIR_HIGH && phase == MINIMUM)
        return fir_16_high_minphase;
    else if (factor == 16 && quality == FIR_HIGH && phase == LINEAR)
        return fir_16_high_linear;
    else if (factor == 16 && quality == FIR_LOW && phase == MINIMUM)
        return fir_16_low_minphase;
    else if (factor == 16 && quality == FIR_LOW && phase == LINEAR)
        return fir_16_low_linear;
    else {
        std::cerr << "get_fir: invalid combination" << std::endl;
        return std::vector<float>();
    }
}

int DecimatorChannel::setup(unsigned int decimationFactor, unsigned int blockSize, enum fir_quality quality, enum fir_phase phase) {
    cleanup();
    this->blockSize            = blockSize;
    this->decimationFactor     = decimationFactor;
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

void DecimatorChannel::process(ne10_float32_t* outBlock, ne10_float32_t* inBlock) {
    ne10_fir_decimate_float_neon(&decimator, inBlock, outBlock, blockSize);
}

void DecimatorChannel::cleanup() {
    NE10_FREE(pCoeff);
    NE10_FREE(pState);
    pCoeff = nullptr;
    pState = nullptr;
}

int InterpolatorChannel::setup(unsigned int interpolationFactor, unsigned int blockSize, enum fir_quality quality, enum fir_phase phase) {
    cleanup();
    this->blockSize             = blockSize;
    this->interpolationFactor   = interpolationFactor;
    std::vector<float> fir      = get_fir(interpolationFactor, quality, phase);
    uint               filtSize = fir.size();
    // numTaps must be a multiple of the interpolation factor
    uint numTaps = ceil((float)filtSize / interpolationFactor) * interpolationFactor;

    pCoeff = (ne10_float32_t*)NE10_MALLOC(numTaps * sizeof(ne10_float32_t));
    pState = (ne10_float32_t*)NE10_MALLOC(
        (blockSize + numTaps / interpolationFactor - 1) * sizeof(ne10_float32_t));
    if (!pState || !pCoeff)
        return -1;

    for (unsigned int n = 0; n < filtSize; ++n) {
        // reverse fir coefficients
        pCoeff[numTaps - filtSize + n] = fir[filtSize - 1 - n];
    }
    for (uint n = 0; n < numTaps - filtSize; ++n) {
        pCoeff[n] = 0;
    }

    int err = ne10_fir_interpolate_init_float(&Interpolator, interpolationFactor, numTaps, pCoeff, pState, blockSize);
    if (err) {
        std::cerr << "Error: couldn't init interpolator" << std::endl;
        return -1;
    }

    return 0;
}

void InterpolatorChannel::process(ne10_float32_t* outBlock, ne10_float32_t* inBlock) {
    ne10_fir_interpolate_float_neon(&Interpolator, inBlock, outBlock, blockSize);
}

void InterpolatorChannel::cleanup() {
    NE10_FREE(pCoeff);
    NE10_FREE(pState);
    pCoeff = nullptr;
    pState = nullptr;
}

#if 0
#undef NDEBUG
#include <assert.h>
bool DecimatorTest()
{
    // TODO
    return false;
}
#endif
