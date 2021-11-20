/*
* Play noise through loudspeaker and record at mic or record signal of two mics.
*/

#include <Bela.h>
#include <libraries/AudioFile/AudioFile.h>
#include <libraries/Scope/Scope.h>

#include "Resample.h"

const unsigned int gDecimationFactor = 4;
const unsigned int gInputChannel     = 0;
const unsigned int gOutputChannel    = 0;

Scope        scope;
Decimator    decimator;
Interpolator interpolator;

float* x;
float* y;

unsigned int blockSize;
unsigned int blockSizeResampled;

bool setup(BelaContext* context, void* userData) {
    unsigned int sampleRateResampled = context->audioSampleRate / gDecimationFactor;

    blockSize           = context->audioFrames;
    blockSizeResampled  = blockSize / gDecimationFactor;

    scope.setup(2, sampleRateResampled);
    if(decimator.setup(gDecimationFactor, blockSize, ResampleBase::fir_quality::high, ResampleBase::fir_phase::linear)) {
		return false;
	};
	if (interpolator.setup(gDecimationFactor, blockSizeResampled, ResampleBase::fir_quality::high, ResampleBase::fir_phase::linear)) {
		return false;
	};

    x = new float[blockSize]();
    y = new float[blockSizeResampled]();

    return true;
}

void  render(BelaContext* context, void* userData) {
    for (unsigned int n = 0; n < blockSize; ++n) {
        x[n] = audioRead(context, n, gInputChannel);
    }

    // downsample
    decimator.process(y, x);

    // do some processing at a lower sampling rate
    for (unsigned int n = 0; n < blockSizeResampled; n++) {
        y[n] *= 2;
    }

    // upsample
    interpolator.process(x, y);

	for (unsigned int n = 0; n < blockSize; ++n) {
        audioWrite(context, n, gOutputChannel, x[n]);
    }
}

void cleanup(BelaContext* context, void* userData) {
}