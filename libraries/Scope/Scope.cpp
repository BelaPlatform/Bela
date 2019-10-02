#include "Scope.h"
#include <libraries/ne10/NE10.h>
#include <math.h>
#include <WSServer.h>
#include <JSON.h>
#include <AuxTaskRT.h>

Scope::Scope(): isUsingOutBuffer(false), 
                isUsingBuffer(false), 
                isResizing(true), 
                upSampling(1), 
                downSampling(1), 
                triggerPrimed(false), 
                started(false), 
		windowFFT(NULL),
		inFFT(NULL),
		outFFT(NULL),
		cfg(NULL)
		{}

Scope::Scope(unsigned int numChannels, float sampleRate){
	setup(numChannels, sampleRate);
}

void Scope::cleanup(){
	dealloc();
}
Scope::~Scope(){
	cleanup();
}

void Scope::dealloc(){
	delete[] windowFFT;
	NE10_FREE(inFFT);
	NE10_FREE(outFFT);
	NE10_FREE(cfg);
}

void Scope::triggerTask(){
    if (plotMode == 0){
        triggerTimeDomain();
    } else if (plotMode == 1){
        triggerFFT();
    }
}

void Scope::setup(unsigned int _numChannels, float _sampleRate){
   
    setSetting(L"numChannels", _numChannels);
    setSetting(L"sampleRate", _sampleRate);
	
	// set up the websocket server
	ws_server = std::unique_ptr<WSServer>(new WSServer());
	ws_server->setup(5432);
	ws_server->addAddress("scope_data", nullptr, nullptr, nullptr, true);
	ws_server->addAddress("scope_control", 
		[this](std::string address, void* buf, int size){
			scope_control_data((const char*) buf);
		},
		[this](std::string address){
			scope_control_connected();
		},
		[this](std::string address){
			stop();
		});

	// setup the auxiliary tasks
	scopeTriggerTask = std::unique_ptr<AuxTaskRT>(new AuxTaskRT());
	scopeTriggerTask->create("scope-trigger-task", [this](){ triggerTask(); });
}

void Scope::start(){

	// reset the pointers
writePointer = 0;
    readPointer = 0;

    logCount = 0;
    started = true;

}

void Scope::stop(){
    started = false;
}

void Scope::setPlotMode(){
// printf("setPlotMode\n");
	isResizing = true;
	while(!gShouldStop && (isUsingBuffer || isUsingOutBuffer)){
		// printf("waiting for threads\n");
		usleep(100000);
	}
	FFTLength = newFFTLength;
	FFTScale = 2.0f / (float)FFTLength;
	FFTLogOffset = 20.0f * log10f(FFTScale);
    
    // setup the input buffer
    frameWidth = pixelWidth/upSampling;
	if(plotMode == 0 ) { // time domain 
		channelWidth = frameWidth * FRAMES_STORED;
	} else {
		channelWidth = FFTLength;
	}
    buffer.resize(numChannels*channelWidth);
    
    // setup the output buffer
    outBuffer.resize(numChannels*frameWidth);
    
    // reset the trigger
    triggerPointer = 0;
    triggerPrimed = true;
    triggerCollecting = false;
    triggerWaiting = false;
    triggerCount = 0;
    downSampleCount = 1;
    autoTriggerCount = 0;
    customTriggered = false;
        
    if (plotMode == 1){ // frequency domain
		dealloc();
		inFFT  = (ne10_fft_cpx_float32_t*) NE10_MALLOC (FFTLength * sizeof (ne10_fft_cpx_float32_t));
		outFFT = (ne10_fft_cpx_float32_t*) NE10_MALLOC (FFTLength * sizeof (ne10_fft_cpx_float32_t));
		cfg = ne10_fft_alloc_c2c_float32_neon (FFTLength);
    	windowFFT = new float[FFTLength];
    	
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
	
	if (!prelog()) return;

    // save the logged samples into the buffer
	for (int i=0; i<numChannels; i++) {
		buffer[i*channelWidth + writePointer] = values[i];
	}

	postlog();

}

void Scope::log(double chn1, ...){
	
	if (!prelog()) return;
    
    va_list args;
    va_start (args, chn1);
    
    // save the logged samples into the buffer
    buffer[writePointer] = chn1;

    for (int i=1; i<numChannels; i++) {
        // iterate over the function arguments, store them in the relevant part of the buffer
        // channels are stored sequentially in the buffer i.e [[channel1], [channel2], etc...]
        buffer[i*channelWidth + writePointer] = (float)va_arg(args, double);
    }
    
    postlog();
    va_end (args);
}

bool Scope::prelog(){
	
    if (!started || isResizing || isUsingBuffer) return false;
    
    if (plotMode == 0 && downSampling > 1){
        if (downSampleCount < downSampling){
            downSampleCount++;
            return false;
        }
        downSampleCount = 1;
    }
    
	isUsingBuffer = true;
    return true;
}

void Scope::postlog(){
	
	isUsingBuffer = false;
    writePointer = (writePointer+1)%channelWidth;
	
    if (logCount++ > TRIGGER_LOG_COUNT){
        logCount = 0;
        scopeTriggerTask->schedule();
    }
}

bool Scope::trigger(){
    if (triggerMode == 2 && !customTriggered && triggerPrimed && started){
        customTriggerPointer = (writePointer-xOffset+channelWidth)%channelWidth;
        customTriggered = true;
        return true;
    }
    return false;
}

bool Scope::triggered(){
    if (triggerMode == 0 || triggerMode == 1){  // normal or auto trigger
        return ((triggerDir==0) && buffer[channelWidth*triggerChannel+((readPointer-1+channelWidth)%channelWidth)] < triggerLevel // positive trigger direction
                && buffer[channelWidth*triggerChannel+readPointer] >= triggerLevel) || 
                ((triggerDir==1) && buffer[channelWidth*triggerChannel+((readPointer-1+channelWidth)%channelWidth)] > triggerLevel // negative trigger direciton
                && buffer[channelWidth*triggerChannel+readPointer] <= triggerLevel) ||
                ((triggerDir==2) && 																								// bi-directional trigger
                	((buffer[channelWidth*triggerChannel+((readPointer-1+channelWidth)%channelWidth)] < triggerLevel
                	&& buffer[channelWidth*triggerChannel+readPointer] >= triggerLevel) || 
                	(buffer[channelWidth*triggerChannel+((readPointer-1+channelWidth)%channelWidth)] > triggerLevel
	                && buffer[channelWidth*triggerChannel+readPointer] <= triggerLevel)));
    } else if (triggerMode == 2){   // custom trigger
        return (customTriggered && readPointer == customTriggerPointer);
    }
    return false;
}

void Scope::triggerTimeDomain(){
// printf("do trigger %i, %i\n", readPointer, writePointer);
    // iterate over the samples between the read and write pointers and check for / deal with triggers
    while (readPointer != writePointer){
        
        // if we are currently listening for a trigger
        if (triggerPrimed){
            
            // if we crossed the trigger threshold
            if (triggered()){
				
                // stop listening for a trigger
                triggerPrimed = false;
                triggerCollecting = true;
                
                // save the readpointer at the trigger point
                triggerPointer = (readPointer-xOffsetSamples+channelWidth)%channelWidth;
                
                triggerCount = frameWidth/2.0f - xOffsetSamples;
                autoTriggerCount = 0;
                
            } else {
                // auto triggering
                if (triggerMode == 0 && (autoTriggerCount++ > (frameWidth+holdOffSamples))){
                    // it's been a whole frameWidth since we've found a trigger, so auto-trigger anyway
                    triggerPrimed = false;
                    triggerCollecting = true;
                    
                    // save the readpointer at the trigger point
                    triggerPointer = (readPointer-xOffsetSamples+channelWidth)%channelWidth;
                    
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
					int startptr = (triggerPointer-(int)(frameWidth/2.0f) + channelWidth)%channelWidth;
					int endptr = (startptr + frameWidth)%channelWidth;
					
					if (endptr > startptr){
						for (int i=0; i<numChannels; i++){
							std::copy(&buffer[channelWidth*i+startptr], &buffer[channelWidth*i+endptr], outBuffer.begin()+(i*frameWidth));
						}
					} else {
						for (int i=0; i<numChannels; i++){
							std::copy(&buffer[channelWidth*i+startptr], &buffer[channelWidth*(i+1)], outBuffer.begin()+(i*frameWidth));
							std::copy(&buffer[channelWidth*i], &buffer[channelWidth*i+endptr], outBuffer.begin()+((i+1)*frameWidth-endptr));
						}
					}
					isUsingBuffer = false;
					
					// the whole frame has been saved in outBuffer, so send it
					// sendBufferTask.schedule((void*)&outBuffer[0], outBuffer.size()*sizeof(float));
					// rt_printf("scheduling sendBufferTask size: %i\n", outBuffer.size());
					ws_server->send("scope_data", outBuffer.data(), outBuffer.size()*sizeof(float));
					
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
        readPointer = (readPointer+1)%channelWidth;
    }

}

void Scope::triggerFFT(){
    while (readPointer != writePointer){
        
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
        readPointer = (readPointer+1)%channelWidth;
    
    }
}

void Scope::doFFT(){

	if(isResizing)
		return;
	
	isUsingOutBuffer = true;
	
    // constants
    int ptr = readPointer-FFTLength+channelWidth;
    float ratio = (float)(FFTLength/2)/(frameWidth*downSampling);
    float logConst = -logf(1.0f/(float)frameWidth)/(float)frameWidth;
    
    isUsingBuffer = true;
    for (int c=0; c<numChannels; c++){
    	
        // prepare the FFT input & do windowing
        for (int i=0; i<FFTLength; i++){
            inFFT[i].r = (ne10_float32_t)(buffer[(ptr+i)%channelWidth+c*channelWidth] * windowFFT[i]);
            inFFT[i].i = 0;
        }
        
        // do the FFT
        ne10_fft_c2c_1d_float32_neon (outFFT, inFFT, cfg, 0);
        
        if (ratio < 1.0f){
        
            // take the magnitude of the complex FFT output, scale it and interpolate
            for (int i=0; i<frameWidth; i++){
                
                float findex = 0.0f;
                if (FFTXAxis == 0){  // linear
                    findex = (float)i*ratio;
                } else if (FFTXAxis == 1){  // logarithmic
                    findex = expf((float)i*logConst)*ratio;
                }
                
                int index = (int)(findex);
                float rem = findex - index;
                
				float yAxis[2];
				for(unsigned int n = 0; n < 2; ++n){
					float magSquared = outFFT[index + n].r * outFFT[index + n].r + outFFT[index + n].i * outFFT[index + n].i;
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
            
            /*float mags[FFTLength/2];
            for (int i=0; i<FFTLength/2; i++){
                mags[i] = (float)(outFFT[i].r * outFFT[i].r + outFFT[i].i * outFFT[i].i);
            }*/
            
            for (int i=0; i<frameWidth; i++){
                
                float findex = (float)i*ratio;
                int mindex = 0;
                int maxdex = 0;
                if (FFTXAxis == 0){  // linear
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
                    float mag = (float)(outFFT[j].r * outFFT[j].r + outFFT[j].i * outFFT[j].i);
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
    ws_server->send("scope_data", outBuffer.data(), outBuffer.size()*sizeof(float));

    isUsingOutBuffer = false;
}

void Scope::setXParams(){
    if (plotMode == 0){
        holdOffSamples = (int)(sampleRate*0.001*holdOff/downSampling);
    } else if (plotMode == 1){
        holdOffSamples = (int)(sampleRate*0.001*holdOff*upSampling);
    }
    xOffsetSamples = xOffset/upSampling;
}

void Scope::setTrigger(int mode, int channel, int dir, float level){
	setSetting(L"triggerMode", mode);
	setSetting(L"triggerChannel", channel);
	setSetting(L"triggerDir", dir);
	setSetting(L"triggerLevel", level);
}

void Scope::setSetting(std::wstring setting, float value){
	
	// std::string str = std::string(setting.begin(), setting.end());
	// printf("setting %s to %f\n", str.c_str(), value);
	
	if (setting.compare(L"frameWidth") == 0){
		stop();
        pixelWidth = (int)value;
        setPlotMode();
        start();
	} else if (setting.compare(L"plotMode") == 0){
		stop();
        plotMode = (int)value;
        setPlotMode();
        setXParams();
        start();
	} else if (setting.compare(L"triggerMode") == 0){
		triggerMode = (int)value;
	} else if (setting.compare(L"triggerChannel") == 0){
		triggerChannel = (int)value;
	} else if (setting.compare(L"triggerDir") == 0){
		triggerDir = (int)value;
	} else if (setting.compare(L"triggerLevel") == 0){
		triggerLevel = value;
	} else if (setting.compare(L"xOffset") == 0){
        xOffset = (int)value;
        setXParams();
	} else if (setting.compare(L"upSampling") == 0){
		stop();
        upSampling = (int)value;
        setPlotMode();
        setXParams();
        start();
	} else if (setting.compare(L"downSampling") == 0){
        downSampling = (int)value;
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
		numChannels = (int)value;
	} else if (setting.compare(L"sampleRate") == 0){
		sampleRate = value;
	}
	
	settings[setting] = value;
}

// called when scope_control websocket is connected
// communication is started here with cpp sending a 
// "connection" JSON with settings known by cpp
// (i.e numChannels, sampleRate)
// JS replies with "connection-reply" which is parsed
// by scope_control_data()
void Scope::scope_control_connected(){
	
	// printf("connection!\n");
	
	// send connection JSON
	JSONObject root;
	root[L"event"] = new JSONValue(L"connection");
	for (auto setting : settings){
		root[setting.first] = new JSONValue(setting.second);
	}
	JSONValue *value = new JSONValue(root);
	std::wstring wide = value->Stringify().c_str();
	std::string str( wide.begin(), wide.end() );
	// printf("sending JSON: \n%s\n", str.c_str());
	ws_server->send("scope_control", str.c_str());
}

// on_data callback for scope_control websocket
// runs on the (linux priority) seasocks thread
void Scope::scope_control_data(const char* data){
	
	// printf("recieved: %s\n", data);
	
	// parse the data into a JSONValue
	JSONValue *value = JSON::Parse(data);
	if (value == NULL || !value->IsObject()){
		printf("could not parse JSON:\n%s\n", data);
		return;
	}
	
	// look for the "event" key
	JSONObject root = value->AsObject();
	if (root.find(L"event") != root.end() && root[L"event"]->IsString()){
		std::wstring event = root[L"event"]->AsString();
		// std::wcout << "event: " << event << "\n";
		if (event.compare(L"connection-reply") == 0){
			// parse all settings and start scope
			parse_settings(value);
			start();
		}
		return;
	}
	parse_settings(value);
}

void Scope::parse_settings(JSONValue* value){
	// printf("parsing settings\n");
	std::vector<std::wstring> keys = value->ObjectKeys();
	for (auto key : keys){
		JSONValue *key_value = value->Child(key.c_str());
		if (key_value->IsNumber())
			setSetting(key, (float)key_value->AsNumber());
	}
}

