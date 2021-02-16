/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io

*/
/**

\example Audio/filterbanks/render.cpp

Using optimised filter banks
-------------------------

Process up to four input channels through some looong filterbanks.
We use the QuadBiquad class which can process up to four channels in parallel.
We create 150 instances of it which are connected in series to create
some long filterbanks, each of which contains lowpass and highpass filters.
We then process (up to) four audio inputs through the filterbanks.
*/
#include <Bela.h>
#include <vector>
#include <libraries/Biquad/QuadBiquad.h>

std::vector<QuadBiquad> bs(150);

bool setup(BelaContext *context, void *userData)
{
	BiquadCoeff::Settings s = {
		.fs = context->audioSampleRate,
		.q = 0.8,
		.peakGainDb = 0,
	};
	// Setting cutoff and type for all the filters
	for(unsigned int b = 0; b < bs.size(); ++b)
	{
		if(b < bs.size() / 2) {
			// the first half of the filters are lowpass
			s.type = BiquadCoeff::lowpass;
			s.cutoff= 2000;
		} else {
			// the other half are highpass
			s.type = BiquadCoeff::highpass;
			s.cutoff = 500;
		}
		for(unsigned int q = 0; q < 4; ++q)
		{
			// Each QuadBiquad object contains four filters (in parallel), which
			// are completely independent of each other and you could set each
			// to a different type of filter, cutoff, Q, etc
			// Here we give to each of these four an increasing cutoff.
			// This will result, for instance, in the right channel being
			// brighter than the left channel.
			bs[b].filters[q].setup(s);
			s.cutoff *= 1.3;
		}
		// after updating the filter coefficients of the individual
		// filters, tell the QuadBiquad object to refresh its internal
		// registers
		bs[b].update();
	}
	return true;
}

void render(BelaContext *context, void *userData)
{
	unsigned int len = bs.size() & (~3);
	for(unsigned int n = 0; n < context->audioFrames; ++n)
	{
		const unsigned int datasz = 4;
		float data[datasz];
		// the data array is used for input and output of the four parallel filters in each QuadBiquad
		// we fill it with however audio inputs we have
		for(unsigned int c = 0; c < context->audioInChannels && c < datasz; ++c)
			data[c] = audioRead(context, n, c);
		// we then process it through all the filters in series
		for(unsigned int b = 0; b < len; ++b) {
			 bs[b].process(data);
			 // after each call to process(), data contains the output of the filter.
			 // by processing it over and over, we effectively place the filters in series.
		}
		// last, we output the results to however many audio channels we have
		for(unsigned int c = 0; c < context->audioOutChannels && c < datasz; ++c)
			audioWrite(context, n, c, data[c]);
	}
}

void cleanup(BelaContext *context, void *userData)
{}
