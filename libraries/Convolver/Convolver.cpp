#include "Convolver.h"
#include <string.h>
int ConvolverChannel::setup(const std::vector<float>& ir, unsigned int blockSize)
{
	cleanup();
	this->blockSize = blockSize;
	firFilterCoeff = (ne10_float32_t *) NE10_MALLOC (ir.size() * sizeof (ne10_float32_t));
	firFilterState = (ne10_float32_t *) NE10_MALLOC ((ir.size() + blockSize - 1) * sizeof (ne10_float32_t));
	if(!firFilterState || !firFilterCoeff)
		return -1;
	for(unsigned int n = 0; n < ir.size(); ++n)
	{
		// the filter coefficients are the time-inverse of the impulse response
		firFilterCoeff[n] = ir.data()[ir.size() - 1 - n];
	}
	ne10_fir_init_float(&firFilter, ir.size(), firFilterCoeff, firFilterState, blockSize);
	return 0;
}

void ConvolverChannel::process(ne10_float32_t* filterOut, const ne10_float32_t* filterIn)
{
	ne10_fir_float_neon(&firFilter, (float*)filterIn, filterOut, blockSize);
}

void ConvolverChannel::cleanup()
{
	NE10_FREE(firFilterState);
	NE10_FREE(firFilterCoeff);
	firFilterCoeff = nullptr;
	firFilterState = nullptr;
}

#include <stdio.h>
#include <libraries/AudioFile/AudioFile.h>
using namespace AudioFileUtilities;

int Convolver::setup(const std::string& filename, unsigned int blockSize, unsigned int maxLength)
{
	int numChannels = getNumChannels(filename);
	int numFrames = getNumFrames(filename);
	if(maxLength && numFrames > maxLength)
		numFrames = maxLength;
	std::vector<std::vector<float>> irs;
	for(unsigned int n = 0; n < numChannels; ++n)
	{
		std::vector<float> ir(numFrames);
		if(getSamples(filename, ir.data(), n, 0, ir.size()))
		{
			fprintf(stderr, "Unable to read data from %s\n", filename.c_str());
			return -1;
		}
		irs.push_back(ir);
	}
	return setup(irs, blockSize);
}

int Convolver::setup(const std::vector<std::vector<float>>& irs, unsigned int blockSize)
{
	filterIn = (ne10_float32_t *) NE10_MALLOC (blockSize * sizeof (ne10_float32_t));
	filterOut = (ne10_float32_t *) NE10_MALLOC (blockSize * sizeof (ne10_float32_t));
	convolverChannels.clear();
	for(auto& ir : irs)
	{
		convolverChannels.emplace_back(ir, blockSize);
	}
	return 0;
}

void Convolver::process(float* out, const float* in, unsigned int frames, unsigned int convolutionChannel)
{
	doProcessInterleaved(out, in, frames, 1, 1, convolutionChannel);
}

void Convolver::processInterleaved(float* out, const float* in, unsigned int frames, unsigned int outChannels, unsigned int inChannels)
{
	for(unsigned int channel = 0; channel < convolverChannels.size() && channel < outChannels && channel < inChannels; ++channel)
		doProcessInterleaved(out, in, frames, outChannels, inChannels, channel);
}

void Convolver::cleanup()
{
	NE10_FREE(filterOut);
	NE10_FREE(filterIn);
	filterOut = nullptr;
	filterIn = nullptr;
}

void Convolver::doProcessInterleaved(float* out, const float* in, unsigned int frames, unsigned int outChannels, unsigned int inChannels, unsigned int channel)
{
	if(!filterIn || channel >= convolverChannels.size())
		return;
	if(1 == inChannels) // fake de-interleaving, cheaper
		memcpy(filterIn, in, frames * sizeof(filterIn[0]));
	else { // actual de-interleaving
		for(unsigned int n = 0; n < frames; ++n)
			filterIn[n] = in[inChannels * n  + channel];
	}
	convolverChannels[channel].process(filterOut, filterIn);
	if(1 == outChannels) { // fake inteleaving, cheaper
		memcpy(out, filterOut, frames * sizeof(out[0]));
	} else { // actual interleaving
		for(unsigned int n = 0; n < frames; ++n)
			out[outChannels * n  + channel] = filterOut[n];
	}
}

#if 0
#undef NDEBUG
#include <assert.h>
bool ConvolverTest()
{
	std::vector<std::vector<float>> irs(2);
	const unsigned int len = 1000;
	for(unsigned int n = 0; n < len; ++n) {
		float val = (len - n) / (float)len;
		irs[0].push_back(val);
		irs[1].push_back(-val);
	}
	Convolver c;
	Convolver d;
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
