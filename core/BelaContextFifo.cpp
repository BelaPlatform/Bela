#include <BelaContextFifo.h>

int BelaContextFifo::setup(const BelaContext* context, unsigned int factor)
{
	this->factor = factor;
	for(auto& bcs : bcss[kToLong])
		bcs.setup(factor, 1, context);

	BelaContext cctx = *context;
	InternalBelaContext* ctx = (InternalBelaContext*)&cctx;
	ctx->audioFrames *= factor;
	ctx->analogFrames *= factor;
	ctx->digitalFrames *= factor;

	for(auto& bcs : bcss[kToShort])
		bcs.setup(1, factor, (BelaContext*)ctx);

	if(dfs[kToLong].setup("/toLong", sizeof(BelaContext*), 10, 1))
	{
		printf("couldn't create queue\n");
		return -1;
	}
	if(dfs[kToShort].setup("/toShort", sizeof(BelaContext*), 10, 0))
	{
		printf("couldn't create queue\n");
		return -1;
	}

	counts.fill(0);
	return 0;
}

void BelaContextFifo::push(fifo_id_t fifo, BelaContext* context)
{
	unsigned int& count = counts[fifo];
	BelaContextSplitter& bcs = bcss[fifo][getCurrentBuffer(fifo)];
	DataFifo& df = dfs[fifo];

	bcs.push(context);
	const BelaContext* ctx;
	while((ctx = bcs.pop())){
		df.send((const char*)&ctx, sizeof(ctx));
		count++;
	}
}

BelaContext* BelaContextFifo::pop(fifo_id_t fifo)
{
	DataFifo& df = dfs[fifo];

	BelaContext* ctx;
	size_t ret = df.receive((char*)&ctx);
	if(sizeof(BelaContext*) != ret)
		ctx = nullptr;
	return ctx;
}

unsigned int BelaContextFifo::getCurrentBuffer(fifo_id_t fifo)
{
	return (counts[fifo] / kNumFifos) % kNumBuffers;
}

#undef NDEBUG
#include <assert.h>
#include <vector>
#include <string.h>

bool BelaContextFifo::test()
{
	InternalBelaContext ctx;

	memset((void*)&ctx, 0, sizeof(ctx));
	ctx.audioFrames = 16;
	ctx.analogFrames = 8;
	ctx.digitalFrames = 16;
	ctx.audioInChannels = 2;
	ctx.audioOutChannels = 2;
	ctx.analogInChannels = 8;
	ctx.analogOutChannels = 8;
	BelaContextSplitter::contextAllocate(&ctx);

	unsigned int factor = 4;
	BelaContextFifo bcf;
	int ret = bcf.setup((BelaContext*)&ctx, factor);
	assert(0 == ret);

	// short thread
	for(unsigned int n = 0; n < factor; ++n)
		bcf.push(kToLong, ctx);

	// long thread
	BelaContext* context = bcf.pop(kToLong);
	assert(context);
	//render(context, NULL);
	bcf.push(kToShort, context);

	// short thread
	std::vector<InternalBelaContext> recCtxs(factor);
	for(unsigned int n = 0; n < factor; ++n)
	{
		const InternalBelaContext* rctx = (InternalBelaContext*)bcf.pop(kToShort);
		BelaContextSplitter::contextCopy(rctx, &recCtxs[n]);
		assert(BelaContextSplitter::contextEqual(&recCtxs[n], &ctx));
	}

	return true;
}
