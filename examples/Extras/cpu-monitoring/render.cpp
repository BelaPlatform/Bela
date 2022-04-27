/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Extra/cpu-monitoring/render.cpp

Monitor the CPU usage of your code
---------------------------

We use Bela_cpuMonitoringSet() and Bela_cpuMonitoringGet() to measure the CPU
usage of the entire audio thread. This is roughly equivalent to the CPU usage
as reported by the IDE.We also use `Bela_cpuToc()` and `Bela_cpuTic()` to
measure the CPU usage of a specific portion of code.
We generate a white noise signal and filter it through a lowpass filter and we
want to measure the CPU usage of the noise generation part only. We write the
the code in such a way that the noise signal for all frames is computed first
and only then the filter is applied to all frames, so that `Bela_cpuTic()` and
`Bela_cpuToc()` are called only once per block, minimising overhead and
increasing the accuracy of the measured time.

From a separate thread we print the CPU usage of the entire audio thread and of
the noise generator.

*/

#include <Bela.h>
#include <stdlib.h>
#include <libraries/Biquad/Biquad.h>

Biquad gFilter;

BelaCpuData gCpuNoise = {
	.count = 100,
};

BelaCpuData gCpuFilter = {
	.count = 100,
};
static void loop(void*)
{
	while(!Bela_stopRequested())
	{
		BelaCpuData* data = Bela_cpuMonitoringGet();
		printf("total: %.2f%%, noise: %.2f%%, filter: %.2f%%\n", data->percentage, gCpuNoise.percentage, gCpuFilter.percentage);
		usleep(100000);
	}
}

bool setup(BelaContext *context, void *userData)
{
	// enable CPU monitoring for the whole audio thread
	Bela_cpuMonitoringInit(100);
	Bela_runAuxiliaryTask(loop);
	gFilter.setup({
		.fs = context->audioSampleRate,
		.type = BiquadCoeff::lowpass,
		.cutoff = 200,
		.q = 1.2,
		.peakGainDb = 0,
	});
	return true;
}

void render(BelaContext *context, void *userData)
{
	float noise[context->audioFrames];
	// monitor CPU usage of a specific block of code:
	Bela_cpuTic(&gCpuNoise); // from here...
	for(unsigned int n = 0; n < context->audioFrames; n++)
		noise[n] = rand() / float(RAND_MAX) * 2.f - 1.f;
	Bela_cpuToc(&gCpuNoise); // ... to here

	Bela_cpuTic(&gCpuFilter); // from here...
	float out[context->audioFrames];
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		out[n] = gFilter.process(noise[n]);
	}
	Bela_cpuToc(&gCpuFilter); // ... to here

	for(unsigned int n = 0; n < context->audioFrames; n++) {
		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++)
			audioWrite(context, n, channel, out[n]);
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
