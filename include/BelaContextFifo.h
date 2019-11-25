#pragma once

#include <array>
#include <BelaContextSplitter.h>
#include <DataFifo.h>

class BelaContextFifo {
public:
	typedef enum {
		kToLong,
		kToShort,
		kNumFifos,
	} fifo_id_t;
	BelaContextFifo() {};
	BelaContextFifo(const BelaContext* context, unsigned int factor){
		setup(context, factor);
	}
	/**
	 * Initialize the object.
	 *
	 * @param context a template of the input contexts that will be sent
	 * with push()
	 * @param factor the number of 
	 *
	 */
	BelaContext* setup(const BelaContext* context, unsigned int factor);
	/**
	 * Send in a context.
	 *
	 * @param fifo the fifo to write to.
	 * @param the context to push in.
	 */
	void push(fifo_id_t fifo, const BelaContext* context);
	/**
	 * Receive a context.
	 *
	 * @param fifoId the fifo to write tp
	 * @return the context, or NULL if no context is ready to be retrieved.
	 */
	BelaContext* pop(fifo_id_t fifo, double timeoutMs = 100);
	static constexpr unsigned int kNumBuffers = 2;
	static bool test();
private:
	unsigned int getCurrentBuffer(fifo_id_t fifo);
	std::array<std::array<BelaContextSplitter, kNumBuffers>, kNumFifos> bcss;
	std::array<DataFifo, kNumFifos> dfs;
	std::array<unsigned int, kNumFifos> counts;
	unsigned int factor;
};
