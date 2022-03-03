#pragma once
#define ENABLE_NE10_FIR_FLOAT_NEON // Define needed for Ne10 library
#include <libraries/ne10/NE10.h> // neon library
#include <vector>

class ConvolverChannel
{
public:
	ConvolverChannel(const std::vector<float>& ir, unsigned int blockSize) {setup(ir, blockSize);};
	int setup(const std::vector<float>& ir, unsigned int blockSize);
	void process(ne10_float32_t* filterOut, const ne10_float32_t* filterIn);
	void cleanup();
private:
	ne10_fir_instance_f32_t firFilter;
	unsigned int blockSize;
	ne10_float32_t* firFilterCoeff = nullptr;
	ne10_float32_t* firFilterState = nullptr;
};

#include <string>
/**
 *
 * Convolve a monophonic input signal with one or more impulse responses.
 */
class Convolver
{
public:
	Convolver() {};
	~Convolver() { cleanup(); };
	/**
	 * Use this to load an impulse response from an audio file. Every
	 * channel in the audio file corresponds to a convolution channel.
	 *
	 * @param path to the audio file to use as an impulse response
	 * @param blockSize the maximum number of frames passed to process...()
	 * @param maxLength the max length of the impulse response. If @p
	 * filename contains more than @p maxLength frames, it will be
	 * truncated.
	 */
	int setup(const std::string& filename, unsigned int blockSize, unsigned int maxLength = 0);
	/**
	 * Use this to set up a multi-channel impulse response from memory.
	 *
	 * @param irs a vector of vectors, each of which correponds to the
	 * impulse response for one channel. The length of @p irs is the
	 * maximum number of input channels to be passed to process...().
	 * @param blockSize the maximum number of frames passed to process...()
	 */
	int setup(const std::vector<std::vector<float>>& irs, unsigned int blockSize);
	/**
	 * Process a block of samples through the specified convolution channel.
	 *
	 * @param out pointer to the output buffer.
	 * @param in pointer to the input buffer.
	 * @param frames the number of frames to process.
	 * @param channel which convolution channel to use.
	 */
	void process(float* out, const float* in, unsigned int frames, unsigned int channel = 0);
	/**
	 * Process a block of interleaved samples. Each input channel is
	 * processed through the convolver channels, and the output of each
	 * convolution is written into the respective channel of @p out.
	 *
	 * @param out pointer to the output buffer.
	 * @param in pointer to the input buffer.
	 * @param frames the number of frames to process.
	 * @param outChannels the number of channels in @p out.
	 * @param inChannels the number of input channels in @p in.
	 */
	void processInterleaved(float* out, const float* in, unsigned int frames, unsigned int outChannels, unsigned int inChannels);
	void cleanup();
	/**
	 * Return the number of channels in the convolver.
	 */
	unsigned int getChannels() { return convolverChannels.size(); }
private:
	void doProcessInterleaved(float* out, const float* in, unsigned int frames, unsigned int outChannels, unsigned int inChannels, unsigned int channel);
	std::vector<ConvolverChannel> convolverChannels;
	ne10_float32_t* filterIn = nullptr;
	ne10_float32_t* filterOut = nullptr;
};
