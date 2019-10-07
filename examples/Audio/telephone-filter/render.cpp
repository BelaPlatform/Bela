 /**
 * \example Audio/telephone-fiter
 *
 * Telephone filter
 * ================
 *
 * This sketch demonstrates how to use the Biquad library to filter an audio signal.
 * A low-pass and a high-pass Butterwoth filters are used at 2kHz and 800Hz respectively to recreate
 * the so-called 'Telephone filter' effect by band-limitting the input signal, making it sound like
 * if it was played through a small bandwith speaker.
 *
 * Both biquad filters are applied in series to a mono sum of the input signal creating a bandpass filter.
 *
 * To learn more about Biquad filters and how to use the Biquad library, make sure to check Nigel Redmon's fantastic blog:
 * https://www.earlevel.com/main/category/digital-audio/filters/iir-filters/biquads/
 *
 **/
#include <Bela.h>
#include <libraries/Biquad/Biquad.h>

Biquad lpFilter;	// Biquad low-pass frequency;
Biquad hpFilter;	// Biquad high-pass frequency;

float gHPfreq = 800.0;	// Cut-off frequency for high-pass filter (Hz)
float gLPfreq = 2000.0;	// Cut-off frequency for low-pass filter (Hz)

float gFilterQ = 0.707; // Quality factor for the biquad filters to provide a Butterworth response


bool setup(BelaContext *context, void *userData)
{
	// Set low pass filter parameters (type, frequency & Q)
	lpFilter.setup(gLPfreq, context->audioSampleRate, Biquad::lowpass, gFilterQ, 0);
	// Set high pass filter parameters (type, frequency & Q)
	hpFilter.setup(gHPfreq, context->audioSampleRate, Biquad::highpass, gFilterQ, 0);

	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {

		float monoSum = 0.0; // Mono sum of input channels
		float out = 0.0;

		// Sum all input channels to mono
		for(unsigned int ch = 0; ch < context->audioInChannels; ch++)
			monoSum += audioRead(context, n, ch);
		// Divide sum by the number of channels
		monoSum = monoSum / context->audioInChannels;

		// Process input signal with high pass filter
		out = hpFilter.process(monoSum);
		// Process signal with low pass filter
		out = lpFilter.process(out);

		for(unsigned int ch = 0; ch < context->audioOutChannels; ch++)
			audioWrite(context, n, ch, out);

	}
}

void cleanup(BelaContext *context, void *userData)
{
}
