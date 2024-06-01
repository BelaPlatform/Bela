#include "Scope.h"
#include <libraries/ne10/NE10.h>
#include <math.h>
#include <libraries/WSServer/WSServer.h>
#include <JSON.h>
#include <AuxTaskRT.h>
#include <stdexcept>
#include <stdarg.h>
#include <MiscUtilities.h>
#include <unistd.h>
#include <Bela.h>

#define FRAMES_STORED 4

#define TRIGGER_LOG_COUNT 16

Scope::Scope()
{}

Scope::Scope(unsigned int numChannels, float sampleRate){
	setup(numChannels, sampleRate);
}

void Scope::cleanup(){
	// ensure that all connections are closed before
	// destroying the object, so we avoid calling the disconnect callback
	// after the Scope object has been destroyed
	ws_server.reset();
}
Scope::~Scope(){
	cleanup();
}

Scope::ClientInstance::ClientInstance(Scope& scope) :
		s(scope),
		isUsingOutBuffer(false),
		isUsingBuffer(false),
		isResizing(true),
		upSampling(1),
		triggerPrimed(false),
		started(false)
{}
Scope::ClientInstance::~ClientInstance()
{
}

void Scope::ClientInstance::triggerTask(){
	if (TIME_DOMAIN == plotMode){
		triggerTimeDomain();
	} else if (FREQ_DOMAIN == plotMode){
		triggerFFT();
	}
}

int Scope::setup(unsigned int _numChannels, float _sampleRate)
{
	if(_numChannels > 50)
		throw std::runtime_error(std::string("Scope::setup(): too many channels (")+std::to_string(_numChannels)+std::string(")."));

	c.setSetting(L"numChannels", _numChannels);
	c.setSetting(L"sampleRate", _sampleRate);

	// set up the websocket server
	ws_server = std::unique_ptr<WSServer>(new WSServer());
	int ret;
	if((ret = ws_server->setup(5432)))
	{
		fprintf(stderr, "Scope: failed to create server: %d\n", ret);
		return 1;
	}
	ws_server->addAddress("scope_data", nullptr, nullptr, nullptr, true);
	ws_server->addAddress("scope_control",
			[this](const std::string& address, const WSServerDetails* id, const unsigned char* buf, size_t size){
				c.scope_control_data((const char*) buf);
			},
			[this](const std::string& address, const WSServerDetails* id){
				c.scope_control_connected();
			},
			[this](const std::string& address, const WSServerDetails* id){
				c.stop();
			});

	// setup the auxiliary tasks
	scopeTriggerTask = std::unique_ptr<AuxTaskRT>(new AuxTaskRT());
	if((ret = scopeTriggerTask->create("scope-trigger-task", [this](){ c.triggerTask(); })))
	{
		fprintf(stderr, "Scope: failed to create trigger task: %d\n", ret);
		return 1;
	}
	return 0;
}

void Scope::ClientInstance::start(){

	// reset the pointers
	s.writePointer = 0;
	readPointer = 0;

	s.logCount = 0;
	started = true;

}

void Scope::ClientInstance::stop(){
	started = false;
}

void Scope::ClientInstance::setPlotMode(){
	// printf("setPlotMode\n");
	isResizing = true;
	while(!Bela_stopRequested() && (isUsingBuffer || isUsingOutBuffer)){
		// printf("waiting for threads\n");
		usleep(100000);
	}
	FFTLength = newFFTLength;
	FFTScale = 2.0f / (float)FFTLength;
	FFTLogOffset = 20.0f * log10f(FFTScale);

	// setup the input buffer
	frameWidth = pixelWidth/upSampling;
	if(0 == frameWidth)
		frameWidth = 1; // avoid divides by zero
	if(TIME_DOMAIN == plotMode) {
		s.channelWidth = frameWidth * FRAMES_STORED;
	} else {
		s.channelWidth = FFTLength;
	}
	s.buffer.resize(s.numChannels * s.channelWidth);

	// setup the output buffer
	outBuffer.resize(s.numChannels * frameWidth + kTimestampSlots);

	// reset the trigger
	triggerPointer = 0;
	triggerPrimed = true;
	triggerCollecting = false;
	triggerWaiting = false;
	triggerCount = 0;
	s.downSampleCount = 1;
	autoTriggerCount = 0;
	customTriggered = false;

	if (FREQ_DOMAIN == plotMode){
		fft.setup(FFTLength);
		windowFFT.resize(FFTLength);

		pointerFFT = 0;
		collectingFFT = true;

		// Calculate a Hann window
		// The coherentGain compensates for the loss of energy due to the windowing.
		// and yields a ~unitary peak for a sinewave centered in the bin.
		float coherentGain = 0.5f;
		for(int n = 0; n < FFTLength; n++) {
			windowFFT[n] = 0.5f * (1.0f - cosf(2.0 * M_PI * n / (float)(FFTLength - 1))) / coherentGain;
		}

	}
	isResizing = false;
	// printf("end setPlotMode\n");
}

void Scope::log(const float* values){
	if (!c.started || c.isResizing || c.isUsingBuffer)
		return;
	if (TIME_DOMAIN == c.plotMode && downSampling > 1){
		if (downSampleCount < downSampling){
			downSampleCount++;
			// skip
			return;
		}
		downSampleCount = 1;
	}
	c.isUsingBuffer = true;
	// save the logged samples into the buffer
	for (int i = 0; i < numChannels; i++) {
		// channels are stored sequentially in the buffer i.e [[channel1], [channel2], etc...]
		buffer[i * channelWidth + writePointer] = values[i];
	}
	c.isUsingBuffer = false;
	writePointer = (writePointer + 1) % channelWidth;

	if (logCount++ > TRIGGER_LOG_COUNT || downSampling > TRIGGER_LOG_COUNT){
		logCount = 0;
		scopeTriggerTask->schedule();
	}
}

void Scope::log(double chn0, ...){
	va_list args;
	va_start (args, chn0);
	float values[numChannels];
	unsigned int i = 0;
	values[i++] = chn0;
	// save the logged samples into the buffer
	for (; i < numChannels; i++) {
		// iterate over the function arguments
		values[i] = (float)va_arg(args, double);
	}
	va_end (args);
	log(values);
}

bool Scope::trigger(){
	if (CUSTOM == c.triggerMode && !c.customTriggered && c.triggerPrimed && c.started){
		c.customTriggerPointer = (writePointer - c.xOffset + channelWidth) % channelWidth;
		c.customTriggered = true;
		return true;
	}
	return false;
}

bool Scope::ClientInstance::triggered(){
	if (AUTO == triggerMode || NORMAL == triggerMode){
		float prev = s.buffer[s.channelWidth * triggerChannel + ((readPointer - 1 + s.channelWidth) % s.channelWidth)];
		float cur = s.buffer[s.channelWidth * triggerChannel + readPointer];
		bool negativeEdge = prev >= triggerLevel && cur < triggerLevel;
		bool positiveEdge = prev < triggerLevel && cur >= triggerLevel;
		switch (triggerDir) {
			case POSITIVE:
				return positiveEdge;
			case NEGATIVE:
				return negativeEdge;
			case BOTH:
			default:
				return positiveEdge || negativeEdge;
		}
	} else if (CUSTOM == triggerMode){
		return (customTriggered && readPointer == customTriggerPointer);
	}
	return false;
}

void Scope::ClientInstance::outBufferSetTimestamp(){
	memcpy(outBuffer.data(), &timestamp, sizeof(timestamp));
	outBufferSize = 0;
}

void Scope::ClientInstance::outBufferAppendData(size_t startptr, size_t endptr, size_t outChannelWidth){
	if(endptr > startptr) {
		for(size_t i = 0; i < s.numChannels; ++i){
			std::copy(&s.buffer[s.channelWidth * i + startptr], &s.buffer[s.channelWidth * i + endptr], outBuffer.begin() + (i * outChannelWidth) + kTimestampSlots + outBufferSize);
		}
		outBufferSize += endptr - startptr;
	} else {
		for(size_t i = 0; i < s.numChannels; ++i){
			std::copy(&s.buffer[s.channelWidth * i + startptr], &s.buffer[s.channelWidth * (i + 1)], outBuffer.begin() + (i * outChannelWidth) + kTimestampSlots + outBufferSize);
			std::copy(&s.buffer[s.channelWidth * i], &s.buffer[s.channelWidth * i + endptr], outBuffer.begin() + ((i + 1) * outChannelWidth - endptr) + kTimestampSlots + outBufferSize);
		}
		outBufferSize += endptr + s.channelWidth - startptr;
	}
}

void Scope::ClientInstance::outBufferSend(){
	size_t elems = kTimestampSlots + outBufferSize * s.numChannels;
	size_t bytes = sizeof(outBuffer[0]) * elems;
	s.ws_server->sendRt("scope_data", outBuffer.data(), bytes);
}

void Scope::ClientInstance::triggerTimeDomain(){
	// printf("do trigger %i, %i\n", readPointer, writePointer);
	// iterate over the samples between the read and write pointers and check for / deal with triggers
	// target approx 30 Hz
	size_t numRollSamples = s.sampleRate / 30 / s.downSampling;
	if(!numRollSamples)
		numRollSamples = 1;
	while (readPointer != s.writePointer){
		timestamp++;
		if(s.downSampling > 1 && X_NORMAL != xAxisBehaviour)
		{
			// send "rolling" blocks without waiting for a trigger
			rollPtr++;
			if(rollPtr >= numRollSamples)
			{
				rollPtr = 0;
				isUsingOutBuffer = true;
				isUsingBuffer = true;
				outBufferSetTimestamp();
				outBufferAppendData((readPointer - numRollSamples + s.channelWidth) % s.channelWidth , readPointer % s.channelWidth, numRollSamples);
				outBufferSend();
				isUsingBuffer = false;
				isUsingOutBuffer = false;
			}
		} else if (triggerPrimed){
			//if we are currently listening for a trigger

			// if we crossed the trigger threshold
			if (triggered()){

				// stop listening for a trigger
				triggerPrimed = false;
				triggerCollecting = true;

				// save the readpointer at the trigger point
				triggerPointer = (readPointer - xOffsetSamples + s.channelWidth) % s.channelWidth;

				triggerCount = frameWidth/2.0f - xOffsetSamples;
				autoTriggerCount = 0;

			} else {
				// auto triggering
				if (AUTO == triggerMode && (autoTriggerCount++ > (frameWidth+holdOffSamples))){
					// it's been a whole frameWidth since we've found a trigger, so auto-trigger anyway
					triggerPrimed = false;
					triggerCollecting = true;

					// save the readpointer at the trigger point
					triggerPointer = (readPointer - xOffsetSamples + s.channelWidth) % s.channelWidth;

					triggerCount = frameWidth/2.0f - xOffsetSamples;
					autoTriggerCount = 0;
				}
			}

		} else if (triggerCollecting){

			// a trigger has been detected, and we are collecting the second half of the triggered frame
			if (--triggerCount > 0){

			} else {
				triggerCollecting = false;
				triggerWaiting = true;
				triggerCount = frameWidth/2.0f + holdOffSamples;

				if (!isResizing){
					isUsingBuffer = true;
					isUsingOutBuffer = true;

					// copy the previous to next frameWidth/2.0f samples into the outBuffer
					int startptr = (triggerPointer - (int)(frameWidth / 2.0f) + s.channelWidth) % s.channelWidth;
					int endptr = (startptr + frameWidth) % s.channelWidth;

					outBufferSetTimestamp();
					outBufferAppendData(startptr, endptr, frameWidth);
					isUsingBuffer = false;

					// the whole frame has been saved in outBuffer, so send it
					outBufferSend();
					isUsingOutBuffer = false;
				}

			}

		} else if (triggerWaiting){

			// a trigger has completed, so wait half a framewidth before looking for another
			if (--triggerCount > 0){
				// make sure holdoff doesn't get reduced while waiting
				if (triggerCount > frameWidth/2.0f + holdOffSamples)
					triggerCount = frameWidth/2.0f + holdOffSamples;
			} else {
				triggerWaiting = false;
				triggerPrimed = true;
				customTriggered = false;
			}

		}

		// increment the read pointer
		readPointer = (readPointer + 1) % s.channelWidth;
	}

}

void Scope::ClientInstance::triggerFFT(){
	while (readPointer != s.writePointer){

		pointerFFT += 1;

		if (collectingFFT){

			if (pointerFFT > FFTLength){
				collectingFFT = false;
				doFFT();
			}

		} else {

			if (pointerFFT > (FFTLength+holdOffSamples)){
				pointerFFT = 0;
				collectingFFT = true;
			}

		}

		// increment the read pointer
		readPointer = (readPointer + 1) % s.channelWidth;

	}
}

void Scope::ClientInstance::doFFT(){

	if(isResizing)
		return;

	isUsingOutBuffer = true;

	// constants
	int ptr = readPointer - FFTLength + s.channelWidth;
	float ratio = (float)(FFTLength / 2) / (frameWidth * s.downSampling);
	float logConst = -logf(1.0f/(float)frameWidth)/(float)frameWidth;

	isUsingBuffer = true;
	for (int c = 0; c < s.numChannels; c++){

		// prepare the FFT input & do windowing
		for (int i = 0; i < FFTLength; i++){
			fft.td(i) = s.buffer[(ptr + i) % s.channelWidth+ c * s.channelWidth] * windowFFT[i];
		}

		// do the FFT
		fft.fft();

		if (ratio < 1.0f){

			// take the magnitude of the complex FFT output, scale it and interpolate
			for (int i = 0; i < frameWidth; i++){

				float findex = 0.0f;
				if (FFTXAxis == 0){ // linear
					findex = (float)i*ratio;
				} else if (FFTXAxis == 1){ // logarithmic
					findex = expf((float)i*logConst)*ratio;
				}

				int index = (int)(findex);
				float rem = findex - index;

				float yAxis[2];
				for(unsigned int n = 0; n < 2; ++n){
					unsigned int i = index + n;
					float magSquared = fft.fdr(i) * fft.fdr(i) + fft.fdi(i) * fft.fdi(i);
					if (FFTYAxis == 0){ // normalised linear magnitude
						yAxis[n] = FFTScale * sqrtf(magSquared);
					} else { // Otherwise it is going to be (FFTYAxis == 1): decibels
						yAxis[n] = 10.0f * log10f(magSquared) + FFTLogOffset;
					}
				}

				// linear interpolation
				outBuffer[c*frameWidth+i] = yAxis[0] + rem * (yAxis[1] - yAxis[0]);
			}

		} else {

			/*float mags[FFTLength / 2];
			for (int i = 0; i < FFTLength / 2; i++){
				mags[i] = (float)(outFFT[i].r * outFFT[i].r + outFFT[i].i * outFFT[i].i);
			}*/

			for (int i = 0; i < frameWidth; i++){

				float findex = (float)i*ratio;
				int mindex = 0;
				int maxdex = 0;
				if (FFTXAxis == 0){ // linear
					mindex = (int)(findex - ratio/2.0f) + 1;
					maxdex = (int)(findex + ratio/2.0f);
				} else if (FFTXAxis == 1){ // logarithmic
					mindex = expf(((float)i - 0.5f)*logConst)*ratio;
					maxdex = expf(((float)i + 0.5f)*logConst)*ratio;
				}

				if (mindex < 0) mindex = 0;
				if (maxdex >= FFTLength/2) maxdex = FFTLength/2;

				// do all magnitudes first, then search? - turns out this doesnt help
				float maxVal = 0.0f;
				for (int j=mindex; j<=maxdex; j++){
					float mag = fft.fdr(j) * fft.fdr(j) + fft.fdi(j) * fft.fdi(j);
					if (mag > maxVal){
						maxVal = mag;
					}
				}

				if (FFTYAxis == 0){ // normalised linear magnitude
					outBuffer[c*frameWidth+i] = FFTScale * sqrtf(maxVal);
				} else if (FFTYAxis == 1){ // decibels
					outBuffer[c*frameWidth+i] = 10.0f * log10f(maxVal) + FFTLogOffset;
				}
			}
		}

	}

	isUsingBuffer = false;

	// sendBufferTask.schedule((void*)&outBuffer[0], outBuffer.size()*sizeof(float));
	// rt_printf("scheduling sendBufferTask size: %i\n", outBuffer.size());
	s.ws_server->sendRt("scope_data", outBuffer.data(), outBuffer.size() * sizeof(float));

	isUsingOutBuffer = false;
}

void Scope::ClientInstance::setXParams(){
	if (TIME_DOMAIN == plotMode){
		holdOffSamples = (int)(s.sampleRate * 0.001 * holdOff / s.downSampling);
	} else if (FREQ_DOMAIN == plotMode){
		holdOffSamples = (int)(s.sampleRate * 0.001 * holdOff * upSampling);
	}
	xOffsetSamples = xOffset/upSampling;
}

void Scope::setTrigger(TriggerMode mode, unsigned int channel, TriggerSlope dir, float level){
	c.setSetting(L"triggerMode", mode);
	c.setSetting(L"triggerChannel", channel);
	c.setSetting(L"triggerDir", dir);
	c.setSetting(L"triggerLevel", level);
}

void Scope::ClientInstance::setSetting(std::wstring setting, float value){

	// std::string str = std::string(setting.begin(), setting.end());
	// printf("setting %s to %f\n", str.c_str(), value);

	if (setting.compare(L"frameWidth") == 0){
		stop();
		pixelWidth = (int)value;
		setPlotMode();
		start();
	} else if (setting.compare(L"plotMode") == 0){
		stop();
		plotMode = (PlotMode)value;
		setPlotMode();
		setXParams();
		start();
	} else if (setting.compare(L"triggerMode") == 0){
		triggerMode = (TriggerMode)value;
	} else if (setting.compare(L"triggerChannel") == 0){
		triggerChannel = (unsigned int)value;
	} else if (setting.compare(L"triggerDir") == 0){
		triggerDir = (TriggerSlope)value;
	} else if (setting.compare(L"triggerLevel") == 0){
		triggerLevel = value;
	} else if (setting.compare(L"xOffset") == 0){
		xOffset = (int)value;
		setXParams();
	} else if (setting.compare(L"xAxisBehaviour") == 0){
		xAxisBehaviour = (XAxisBehaviour)value;
	} else if (setting.compare(L"upSampling") == 0){
		stop();
		upSampling = (int)value;
		setPlotMode();
		setXParams();
		start();
	} else if (setting.compare(L"downSampling") == 0){
		s.downSampling = (int)value;
	} else if (setting.compare(L"holdOff") == 0){
		holdOff = value;
		setXParams();
	} else if (setting.compare(L"FFTLength") == 0){
		stop();
		newFFTLength = (int)value;
		setPlotMode();
		setXParams();
		start();
	} else if (setting.compare(L"FFTXAxis") == 0){
		FFTXAxis = (int)value;
	} else if (setting.compare(L"FFTYAxis") == 0){
		FFTYAxis = (int)value;
	} else if (setting.compare(L"numChannels") == 0){
		s.numChannels = value;
	} else if (setting.compare(L"sampleRate") == 0){
		s.sampleRate = value;
	}

	settings[setting] = value;
}

static JSONObject settingsToJson(const std::map<std::wstring, float>& settings)
{
	JSONObject root;
	for (auto setting : settings){
		root[setting.first] = new JSONValue(setting.second);
	}
	return root;
}

// assumes it is called from the server thread
void Scope::ClientInstance::sendSettings(const std::string& event)
{
	JSONObject root = settingsToJson(settings);
	root[L"event"] = new JSONValue(JSON::s2ws(event));
	JSONValue value(root);
	std::string str = JSON::ws2s(value.Stringify().c_str());
	// printf("sending JSON: \n%s\n", str.c_str());
	s.ws_server->sendNonRt("scope_control", str.c_str(), WSServer::kThreadCallback);
}

// called when scope_control websocket is connected
// communication is started here with cpp sending a
// "connection" JSON with settings known by cpp
// (i.e numChannels, sampleRate)
// JS replies with "connection-reply" which is parsed
// by scope_control_data()
void Scope::ClientInstance::scope_control_connected(){
	// send connection JSON
	sendSettings("connection");
}

// on_data callback for scope_control websocket
// runs on the (linux priority) seasocks thread
void Scope::ClientInstance::scope_control_data(const char* data){

	// printf("recieved: %s\n", data);

	// parse the data into a JSONValue
	std::shared_ptr<JSONValue> value = std::shared_ptr<JSONValue>(JSON::Parse(data));
	if (!value || !value->IsObject()){
		printf("could not parse JSON:\n%s\n", data);
		return;
	}

	// look for the "event" key
	JSONObject root = value->AsObject();
	if (root.count(L"event") && root[L"event"]->IsString()){
		std::wstring event = root[L"event"]->AsString();
		// std::wcout << "event: " << event << "\n";
		if (event.compare(L"connection-reply") == 0){
			// parse all settings and start scope
			parse_settings(value);
			start();
		}
		return;
	}
	if (root.count(L"cmd") && root[L"cmd"]->IsString()){
		parse_cmd(value);
		return;
	}
	parse_settings(value);
}

static std::shared_ptr<JSONValue> loadPresetFromDisk(const std::string& path)
{
	std::string str = IoUtils::readTextFile(path);
	return std::shared_ptr<JSONValue>(JSON::Parse(str.c_str()));
}

static int storePresetToDisk(const std::string& path, std::shared_ptr<JSONValue> value)
{
	std::string content = JSON::ws2s(value->Stringify(true));
	return IoUtils::writeTextFile(path, content);
}

static const std::string& getPresetPath(const std::string& type)
{
	static std::string strs[2] = {
		"/root/Bela/libraries/Scope/presets",
		"./scope-presets",
	};
	return "global" == type ? strs[0] : strs[1];
}

void Scope::ClientInstance::parse_cmd(std::shared_ptr<JSONValue> value)
{
	JSONObject root = value->AsObject();
	std::string cmd = JSON::ws2s(root[L"cmd"]->AsString());
	std::string path;
	if(root.count(L"path") && root[L"path"]->IsString())
		path = JSON::ws2s(root[L"path"]->AsString());
	std::string pathType;
	if(root.count(L"pathType") && root[L"pathType"]->IsString())
		pathType = JSON::ws2s(root[L"pathType"]->AsString());
	std::string fullPath = getPresetPath(pathType) + "/" + path;
	if("presetList" == cmd)
	{
		JSONObject lists;
		for(const auto& str : { std::string("global"), std::string("local") })
		{
			std::string basePath = getPresetPath(str);
			std::vector<std::string> files = IoUtils::glob(basePath + "/*.json");
			JSONArray arr;
			arr.reserve(files.size());
			for(const auto& f : files)
				arr.push_back(new JSONValue(JSON::s2ws(f)));
			lists[JSON::s2ws(str)] = new JSONValue(arr);
		}
		JSONObject root;
		root[L"presetList"] = new JSONValue(lists);
		JSONValue value(root);
	} else if("presetLoad" == cmd)
	{
		auto value = loadPresetFromDisk(fullPath);
		if (!value || !value->IsObject())
		{
			fprintf(stderr, "Scope: could not parse JSON from preset '%s':\n", fullPath.c_str());
			return;
		}
		JSONObject root = value->AsObject();
		parse_settings(value);
		sendSettings("connection"); // TODO: should be something else
		return;
	} else if("presetStore" == cmd)
	{
		JSONObject root = settingsToJson(settings);
		std::shared_ptr<JSONValue> json = std::shared_ptr<JSONValue>(new JSONValue(root));
		int ret = storePresetToDisk(fullPath, json);
		if(ret)
		{
			fprintf(stderr, "Scope: error writing preset to '%s'\n", fullPath.c_str());
		} else {
			printf("Scope: saved preset to '%s'\n", fullPath.c_str());
		}
		return;
	}
}

void Scope::ClientInstance::parse_settings(std::shared_ptr<JSONValue> value){
	// printf("parsing settings\n");
	std::vector<std::wstring> keys = value->ObjectKeys();
	for (auto& key : keys){
		JSONValue *key_value = value->Child(key.c_str());
		if (key_value && key_value->IsNumber())
			setSetting(key, (float)key_value->AsNumber());
	}
}

