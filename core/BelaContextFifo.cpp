#include <BelaContextFifo.h>

BelaContext* BelaContextFifo::setup(const BelaContext* context, unsigned int factor)
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

	if(dfs[kToLong].setup("/toLong", sizeof(BelaContext*), factor * kNumBuffers, 1))
	{
		printf("couldn't create queue\n");
		return nullptr;
	}
	if(dfs[kToShort].setup("/toShort", sizeof(BelaContext*), factor * kNumBuffers, 0))
	{
		printf("couldn't create queue\n");
		return nullptr;
	}

	counts.fill(0);
	return bcss[kToLong][0].getContext();
}

void BelaContextFifo::push(fifo_id_t fifo, const BelaContext* context)
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

BelaContext* BelaContextFifo::pop(fifo_id_t fifo, double timeoutMs)
{
	DataFifo& df = dfs[fifo];

	BelaContext* ctx;
	size_t ret = df.receive((char*)&ctx, timeoutMs);
	if(sizeof(BelaContext*) != ret)
		ctx = nullptr;
	return ctx;
}

unsigned int BelaContextFifo::getCurrentBuffer(fifo_id_t fifo)
{
	if(kToLong == fifo)
		return counts[fifo] % kNumBuffers;
	else
		return (counts[fifo] / factor) % kNumBuffers;
}

#undef NDEBUG
#include <assert.h>
#include <vector>
#include <string.h>

static void contextFill(InternalBelaContext* ctx, unsigned int start)
{
	for(unsigned int n = 0; n < ctx->audioFrames * ctx->audioInChannels; ++n)
		ctx->audioIn[n] = n + start;
	for(unsigned int n = 0; n < ctx->audioFrames * ctx->audioOutChannels; ++n)
		ctx->audioOut[n] = n + start;
	for(unsigned int n = 0; n < ctx->analogFrames * ctx->analogInChannels; ++n)
		ctx->analogIn[n] = n + start;
	for(unsigned int n = 0; n < ctx->analogFrames * ctx->analogOutChannels; ++n)
		ctx->analogOut[n] = n + start;
	for(unsigned int n = 0; n < ctx->digitalFrames; ++n)
		ctx->digital[n] = n + start;
}

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

	BelaContext* tmp = bcf.setup((BelaContext*)&ctx, factor);
	assert(tmp);

	unsigned int buffers = BelaContextFifo::kNumBuffers;
	// short thread
	std::vector<InternalBelaContext> sentCtxs(factor * buffers, ctx);
	for(unsigned int n = 0; n < sentCtxs.size(); ++n)
	{
		BelaContextSplitter::contextAllocate(&sentCtxs[n]);
		contextFill(&sentCtxs[n], n * ctx.audioFrames);
		bcf.push(kToLong, (BelaContext*)&sentCtxs[n]);
	}

	// long thread
	for(unsigned int n = 0; n < buffers; ++n)
	{
		BelaContext* context = bcf.pop(kToLong);
		assert(context);
		//render(context, NULL);
		bcf.push(kToShort, context);
	}

	// short thread
	std::vector<InternalBelaContext> recCtxs(sentCtxs.size(), ctx);
	for(unsigned int n = 0; n < factor * buffers; ++n)
	{
		BelaContextSplitter::contextAllocate(&recCtxs[n]);
		const InternalBelaContext* rctx = (InternalBelaContext*)bcf.pop(kToShort);
		assert(rctx);
		BelaContextSplitter::contextCopy(rctx, &recCtxs[n]);
		assert(BelaContextSplitter::contextEqual(&recCtxs[n], &sentCtxs[n]));
	}

	return true;
}
