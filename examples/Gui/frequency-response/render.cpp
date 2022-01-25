/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Gui/frequency-response/render.cpp

Adjustable filter parameters
===========================

This is an example of a more complex use of the GUI as a controller.
The GUI here is used to set a filter's parameters and display its
frequency response.

This example uses four libraries:
	- the Biquad library is used to create the low pass filter which is applied to the audio input
	- the Pipe library is used for sending information to the GUI
	- the GUI library is used for creating the GUI itself
	- the FFT library is used to calculate the frequency response of the filter

The best way to exerience this example is to play some audio into Bela's audio inputs.
A low pass filter is applied to the audio input. If you press the GUI button you
will find a control interface which allows you to control the Cutoff frequency (in Hertz)
and Q (or resonance) of the filter applied to the audio input. You will hear the
effect of the filter.

There are also various controls which allow you to adjust the visualisation of the
filter's frequency response. The audio filter is applied in `render()` and we listen
for changes to the settings of the GUI with the `guiCallback` function.
*/

#include <Bela.h>
#include <vector>
#include <libraries/Fft/Fft.h>
#include <libraries/Gui/Gui.h>
#include <libraries/Biquad/Biquad.h>
#include <libraries/Pipe/Pipe.h>
#include <stdexcept>

Pipe gPipe;
Gui gui;

std::vector<Biquad> gAudioBiquads;
unsigned int kFftLen = 2048;

static bool existsAndIsNumber(JSONObject& json, const std::wstring& str)
{
	return (json.find(str) != json.end() && json[str]->IsNumber());
}
static double retrieveAsNumber(JSONObject& json, const std::string& str)
{
	std::wstring ws = JSON::s2ws(str);
	if(existsAndIsNumber(json, ws))
	{
		double ret = json[ws]->AsNumber();
		printf("Received parameter \"%s\": %f\n", str.c_str(), ret);
		return ret;
	}
	else
		throw(std::runtime_error("Value " + str + "not found\n"));
}

// when the settings change from the GUI, this function is called
bool guiCallback(JSONObject& json, void*)
{
	static Biquad::Settings settings;
	settings.type = Biquad::lowpass;
	settings.fs = 44100; // this is only used for the visualisation and should match the one in sketch.js
	try {
		settings.cutoff = retrieveAsNumber(json, "cutoff");
	} catch (std::exception& e) {}
	try {
		settings.q = retrieveAsNumber(json, "q");
	} catch (std::exception& e) {}
	try {
		settings.peakGainDb = retrieveAsNumber(json, "peakGainDb");
	} catch (std::exception& e) {}

	// send the new settings to the audio thread
	gPipe.writeNonRt(settings);
	// now compute the frequency response and send it to the GUI
	static Fft fft(kFftLen);
	static std::vector<float> ir(kFftLen);
	static std::vector<float> buf(kFftLen / 2);
	fft.setup(kFftLen);
	Biquad analysisBiquad(settings);
	for(unsigned int n = 0; n < ir.size(); ++n)
	{
		// process an impulse through the filter to obtain the
		// impulse response
		ir[n] = analysisBiquad.process(0 == n ? 1 : 0);
	}
	fft.fft(ir);
	float mx = -100000;
	for(unsigned int n = 0; n < buf.size(); ++n)
	{
		buf[n] = fft.fda(n);
		mx = mx < buf[n] ? buf[n] : mx;
	}
	gui.sendBuffer(0, buf);
	return false;
}

bool setup(BelaContext *context, void *userData)
{
	gPipe.setup("guiToLoop");
	gAudioBiquads.resize(
		std::min(context->audioInChannels, context->audioOutChannels),
		Biquad({
			.fs = context->audioSampleRate,
			.type = Biquad::lowpass,
			.cutoff = 6000,
			.q = 0.707,
			.peakGainDb = 6,
		})
	);
	gui.setup(context->projectName);
	gui.setControlDataCallback(guiCallback, nullptr);
	return true;
}

void render(BelaContext *context, void *userData)
{
	// receive any command from the gui through the pipe
	Biquad::Settings settings;
	bool newSettingsReceived = false;
	while(1 == gPipe.readRt(settings))
	{
		newSettingsReceived = true;
		// in case more than one came through, we only care about the
		// most recent
		continue;
	}
	if(newSettingsReceived) {
		settings.fs = context->audioSampleRate;
		for(auto& b : gAudioBiquads)
		{
			b.setup(settings);
			b.clean(); // clean the internal filter state to avoid blowing up the filter
		}
	}

	for(unsigned int n = 0; n < context->audioFrames; ++n)
	{
		for(unsigned int c = 0; c < gAudioBiquads.size(); ++c)
		{
			float in = audioRead(context, n, c);
			// filter the audio input ...
			float out = gAudioBiquads[c].process(in);
			// ... and write it to the output
			audioWrite(context, n, c, out);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
