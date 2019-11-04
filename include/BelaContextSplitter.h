#pragma once

#include <Bela.h>
#include <PRU.h> // InternalBelaContext
#include <vector>
class BelaContextSplitter {
public:
	BelaContextSplitter(unsigned int in = 1, unsigned int out = 1, const BelaContext* context = nullptr)
	{
		setup(in, out, context);
	}
	~BelaContextSplitter(){cleanup();}
	/**
	 * Initialize the object. The #in and #out parameters will determine
	 * the frames ratio between the input context (passsed through push(),
	 * and of which a template has to be provided here as #context), and
	 * the output contexts (retrieved via pop())
	 * The output contexts will have a frame count that is #out/#in the
	 * ones of the input contexts.
	 *
	 * @param in how many input contexts are needed to create 1 output context
	 * @param out how many output contexts
	 * @param context a template input context. F
	 * @pre One of #in or #out has to be 1.
	 * @pre Calls to push() will have to pass a BelaContext which is
	 * compatible (same number of channels) with the one passed here
	 *
	 * @return 0 on success, an error code otherwise.
	 */
	int setup(unsigned int in, unsigned int out, const BelaContext* context);
	/**
	 * Add a context for processing.
	 *
	 * @param inContext the context to process. This has to have the same
	 * number of I/O channels as the one passed to setup()
	 */
	int push(const BelaContext* inContext);
	/**
	 *
	 * Retrieve an output BelaContext, if there is one available.
	 *
	 * @return a pointer to a BelaContext, or null if there is none available.
	 */
	BelaContext* pop();
	void cleanup();
	/**
	 *
	 * Return one of the output contexts, initialised, but containing
	 * invalid data.
	 */
	BelaContext* getContext();

	static bool contextEqual(const InternalBelaContext* ctx1, const InternalBelaContext* ctx2);
	/**
	 * Copy context by allocating memory as necessary.
	 */
	static void contextCopy(const InternalBelaContext* src, InternalBelaContext* dst);
	/**
	 * Copy context data between two pre-allocated contexts. The caller has
	 * to ensure that he number of analog, audio and digital frames and
	 * channels has to be the same between the two contexts.
	 */
	static void contextCopyData(const InternalBelaContext* src, InternalBelaContext* dst);
	static void contextAllocate(InternalBelaContext* ctx);
	static bool test();
private:
	static void resizeContext(InternalBelaContext& context, size_t in, size_t out);
	static void stackFrames(bool interleaved, const float* source, float* dest, unsigned int channels, unsigned int sourceStartFrame, unsigned int destStartFrame, unsigned int sourceFrames, unsigned int destFrames);
	std::vector<InternalBelaContext> outContexts;
	unsigned int inCount;
	unsigned int inLength;
	unsigned int outCount;
	unsigned int outLength;

	typedef enum {
		kIn,
		kOut,
	} direction_t;
	typedef enum {
		kAudioIn,
		kAudioOut,
		kAnalogIn,
		kAnalogOut,
		kDigital,
		kNumStreams,
	} stream_t;
	struct streamOffsets {
		unsigned int frames;
		unsigned int channels;
		unsigned int data;
	};
	uint32_t getFramesForStream(const struct streamOffsets& o, const InternalBelaContext* context);
	uint32_t getChannelsForStream(const struct streamOffsets& o, const InternalBelaContext* context);
	float* getDataForStream(const struct streamOffsets& o, const InternalBelaContext* context);
	struct streamOffsets offsets[kNumStreams];
	direction_t direction;
};

