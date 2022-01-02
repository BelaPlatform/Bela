/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Audio/resample/render.cpp

Downsample a signal to process it at a lower sample rate.
=========================================================

This project downsamples a source signal, does some processing at the a lower
sample rate and then upsamples the processed signal again such that it can be
send to the output channel.
The source signal is a simple sine tone. The original signal and the downsampled
signal are send to the scope and can be compared there. Note that the resampling
introduces a small delay due to the anti-aliasing filter that is applied both
during decimation (downsampling) and interpolation (upsampling).
By changing the global variable gDecimationFactor, you can decide the ratio between
the original samplerate and the samplerate after downsampling.
*/

#include <Bela.h>
#include <libraries/AudioFile/AudioFile.h>
#include <libraries/Resample/Resample.h>
#include <libraries/Scope/Scope.h>

const float gFrequency = 440.0;
const unsigned int gDecimationFactor = 4;
const unsigned int gOutputChannel = 0;

Scope scope;
Decimator decimator;
Interpolator interpolator;

unsigned int gBlockSizeResampled;
float gPhase;
float gInverseSampleRate;

float sinetone() {
	float out = 0.8f * sinf(gPhase);
	gPhase += 2.0f * (float)M_PI * gFrequency * gInverseSampleRate;
	if (gPhase > M_PI)
		gPhase -= 2.0f * (float)M_PI;
	return out;
}

bool setup(BelaContext* context, void* userData) {
	gBlockSizeResampled = context->audioFrames / gDecimationFactor;
	scope.setup(2, context->audioSampleRate);

	if (decimator.setup(gDecimationFactor, context->audioFrames, ResampleBase::fir_quality::high, ResampleBase::fir_phase::linear)) {
		return false;
	};
	if (interpolator.setup(gDecimationFactor, gBlockSizeResampled, ResampleBase::fir_quality::high, ResampleBase::fir_phase::linear)) {
		return false;
	};

	gInverseSampleRate = 1.0 / context->audioSampleRate;
	gPhase = 0.0;

	return true;
}

void render(BelaContext* context, void* userData) {

	// source is a sine tone
	float inOutBuf[context->audioFrames];
	for (unsigned int n = 0; n < context->audioFrames; ++n) {
		inOutBuf[n] = sinetone();
	}

	// downsample
	float downsampledBuf[gBlockSizeResampled];
	decimator.process(downsampledBuf, inOutBuf);

	// do some processing at a lower sampling rate
	for (unsigned int n = 0; n < gBlockSizeResampled; n++) {
		downsampledBuf[n] *= 1;  // obviously this doen't do anything
	}

	// inspect source and resampled signal in scope
	for (unsigned int n = 0; n < context->audioFrames; n++) {
		scope.log(inOutBuf[n], downsampledBuf[n / gDecimationFactor]);
	}

	// upsample before output
	interpolator.process(inOutBuf, downsampledBuf);

	// play at output channel
	for (unsigned int n = 0; n < context->audioFrames; ++n) {
		audioWrite(context, n, gOutputChannel, inOutBuf[n]);
	}
}

void cleanup(BelaContext* context, void* userData) {
}