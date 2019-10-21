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
	int setup(unsigned int in, unsigned int out, const BelaContext* context);
	int push(const BelaContext* inContext);
	BelaContext* pop();
	void cleanup();
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
	static bool contextEqual(const InternalBelaContext* ctx1, const InternalBelaContext* ctx2);
	static void contextCopy(const InternalBelaContext* src, InternalBelaContext* dst);
	static void contextAllocate(InternalBelaContext* ctx);
	struct streamOffsets offsets[kNumStreams];
	direction_t direction;
};

