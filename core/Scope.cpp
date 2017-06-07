/***** Scope.cpp *****/
#include <Scope.h>
#include <scope_ws.h>

Scope::Scope(): isUsingOutBuffer(false), 
                isUsingBuffer(false), 
                isResizing(true), 
                connected(0), 
                upSampling(1), 
                downSampling(1), 
                triggerPrimed(false), 
                started(false), 
                settingUp(true),
				windowFFT(NULL),
				inFFT(NULL),
				outFFT(NULL),
				cfg(NULL)
				{}

Scope::~Scope(){
	dealloc();
}

void Scope::dealloc(){
	delete[] windowFFT;
	NE10_FREE(inFFT);
	NE10_FREE(outFFT);
	NE10_FREE(cfg);
}

// static aux task functions
void Scope::triggerTask(void *ptr){
    Scope *instance = (Scope*)ptr;
    if (instance->plotMode == 0){
        instance->triggerTimeDomain();
    } else if (instance->plotMode == 1){
        instance->triggerFFT();
    }
}
void Scope::plotModeTask(void *ptr){
    Scope *instance = (Scope*)ptr;
    instance->setPlotMode();
}

void Scope::setup(unsigned int _numChannels, float _sampleRate, int _numSliders){
   
    numChannels = _numChannels;
    sampleRate = _sampleRate;
    numSliders = _numSliders;
    
    // setup the OSC server && client
    // used for sending / receiving settings
    // oscClient has it's send task turned off, as we only need to send one handshake message
    oscServer.setup(OSC_RECEIVE_PORT);
    oscClient.setup(OSC_SEND_PORT, "127.0.0.1", false);

	// setup the auxiliary tasks
	scopeTriggerTask = Bela_createAuxiliaryTask(Scope::triggerTask, BELA_AUDIO_PRIORITY-2, "scopeTriggerTask", this);
	sendBufferTask.create("scope-send-buffer", scope_ws_send);
	scopePlotModeTask = Bela_createAuxiliaryTask(Scope::plotModeTask, BELA_AUDIO_PRIORITY-3, "scopePlotModeTask", this);
	
	// set up the websocket server
	scope_ws_setup();
	
	// setup the sliders
	sliders.reserve(numSliders);

    // send an OSC message to address /scope-setup
    // then wait 1 second for a reply on /scope-setup-reply 
    bool handshakeReceived = false;
    oscClient.sendMessageNow(oscClient.newMessage.to("/scope-setup").add((int)numChannels).add(sampleRate).add(numSliders).end());
    oscServer.receiveMessageNow(1000);
    while (oscServer.messageWaiting()){
        if (handshakeReceived){
            parseMessage(oscServer.popMessage());
        } else if (oscServer.popMessage().match("/scope-setup-reply")){
            handshakeReceived = true;
        }
    }
    
    settingUp = false;
    
    if (handshakeReceived && connected)
        start(true);
    
}

void Scope::start(bool setup /* = false */ ){
    
    if (started || settingUp) return;
    
    if (setup){
// printf("calling set plot mode\n");
        setPlotMode();
// printf("returning from set plot mode\n");
	}
    else {
// printf("scheduling scopePlotModeTask\n");
        Bela_scheduleAuxiliaryTask(scopePlotModeTask);
	}
    // reset the pointers
    writePointer = 0;
    readPointer = 0;

    started = true;
    
    sendBufferFlag = false;

    logCount = 0;

}

void Scope::stop(){
    started = false;
}

void Scope::setPlotMode(){
// printf("running setPlotMode\n");
    if (settingUp) return;
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
		// let's keep 4 buffers for a greater x-offset range
		channelWidth = frameWidth * 4;
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
// printf("exited setPlotMode\n");
}

void Scope::log(const float* values){
	if (!prelog()) return;
	if(isResizing)
		return;
	isUsingBuffer = true;

	int startingWritePointer = writePointer;

    // save the logged samples into the buffer
	for (int i=0; i<numChannels; i++) {
		buffer[i*channelWidth + writePointer] = values[i];
	}

	postlog(startingWritePointer);
	isUsingBuffer = false;

}
void Scope::log(float chn1, ...){
	if (!prelog()) return;
	if(isResizing)
		return;
	isUsingBuffer = true;
    
    va_list args;
    va_start (args, chn1);
    
    int startingWritePointer = writePointer;
  
    // save the logged samples into the buffer
    buffer[writePointer] = chn1;

    for (int i=1; i<numChannels; i++) {
        // iterate over the function arguments, store them in the relevant part of the buffer
        // channels are stored sequentially in the buffer i.e [[channel1], [channel2], etc...]
        buffer[i*channelWidth + writePointer] = (float)va_arg(args, double);
    }
    
    postlog(startingWritePointer);
    
    va_end (args);
	isUsingBuffer = false;
    
}

bool Scope::prelog(){
    
    // check for any received OSC messages
    while (oscServer.messageWaiting()){
        parseMessage(oscServer.popMessage());
    }
    
    if (!started) return false;
    
    if (plotMode == 0 && downSampling > 1){
        if (downSampleCount < downSampling){
            downSampleCount++;
            return false;
        }
        downSampleCount = 1;
    }
    
    return true;
}
void Scope::postlog(int startingWritePointer){
    
    writePointer = (writePointer+1)%channelWidth;
    
    logCount += 1;
    if (logCount > TRIGGER_LOG_COUNT){
        logCount = 0;
        Bela_scheduleAuxiliaryTask(scopeTriggerTask);
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
        return (!triggerDir && buffer[channelWidth*triggerChannel+((readPointer-1+channelWidth)%channelWidth)] < triggerLevel // positive trigger direction
                && buffer[channelWidth*triggerChannel+readPointer] >= triggerLevel) || 
                (triggerDir && buffer[channelWidth*triggerChannel+((readPointer-1+channelWidth)%channelWidth)] > triggerLevel // negative trigger direciton
                && buffer[channelWidth*triggerChannel+readPointer] <= triggerLevel);
    } else if (triggerMode == 2){   // custom trigger
        return (customTriggered && readPointer == customTriggerPointer);
    }
    return false;
}

void Scope::triggerTimeDomain(){
// rt_printf("do trigger\n");
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
                
                // copy the previous to next frameWidth/2.0f samples into the outBuffer
                int startptr = (triggerPointer-(int)(frameWidth/2.0f) + channelWidth)%channelWidth;
                //int endptr = (triggerPointer+(int)(frameWidth/2.0f) + channelWidth)%channelWidth;
                int endptr = (startptr + frameWidth)%channelWidth;
                
                //rt_printf("%f, %i, %i\n", frameWidth/2.0f, triggerPointer-(int)(frameWidth/2.0f), triggerPointer+(int)(frameWidth/2.0f));
                
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
                
                // the whole frame has been saved in outBuffer, so send it
                if (!isResizing){
                	isUsingOutBuffer = true;
	                sendBufferTask.schedule(&outBuffer[0], outBuffer.size());
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
                //pointerFFT = 0;
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
	
	isUsingBuffer = true;
	isUsingOutBuffer = true;
	
    // constants
    int ptr = readPointer-FFTLength+channelWidth;
    float ratio = (float)(FFTLength/2)/(frameWidth*downSampling);
    float logConst = -logf(1.0f/(float)frameWidth)/(float)frameWidth;
    
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
    
	isUsingOutBuffer = false;
	isUsingBuffer = false;
    sendBufferTask.schedule(&(outBuffer[0]), outBuffer.size());
}

float Scope::getSliderValue(int slider){
    return sliders[slider];
}

void Scope::setSlider(int slider, float min, float max, float step, float value, std::string name){
    sliders[slider] = value;
    oscClient.sendMessageNow(
        oscClient.newMessage.to("/scope-slider")
            .add(slider)
            .add(min)
            .add(max)
            .add(step)
            .add(value)
            .add(name)
            .end()
    );
}

void Scope::setXParams(){
    if (plotMode == 0){
        holdOffSamples = (int)(sampleRate*0.001*holdOff/downSampling);
    } else if (plotMode == 1){
        holdOffSamples = (int)(sampleRate*0.001*holdOff*upSampling);
    }
    xOffsetSamples = xOffset/upSampling;
}

void Scope::parseMessage(oscpkt::Message msg){
    if (msg.partialMatch("/scope-settings/")){
// printf("received scope-settings %s\n", msg.addressPattern().c_str());
        int intArg;
        float floatArg;
        if (msg.match("/scope-settings/connected").popInt32(intArg).isOkNoMoreArgs()){
// printf("received connected %d\n", intArg);
            if (connected == 0 && intArg == 1){
// printf("connected start\n");
                start();
// printf("connected started\n");
            } else if (connected == 1 && intArg == 0){
                stop();
            }
            connected = intArg;
        } else if (msg.match("/scope-settings/frameWidth").popInt32(intArg).isOkNoMoreArgs()){
// printf("received frameWidth: %i\n", intArg);
            stop();
            pixelWidth = intArg;
            start();
        } else if (msg.match("/scope-settings/plotMode").popInt32(intArg).isOkNoMoreArgs()){
// printf("received plotMode: %i\n", intArg);
            stop();
            plotMode = intArg;
            setXParams();
            start();
        } else if (msg.match("/scope-settings/triggerMode").popInt32(intArg).isOkNoMoreArgs()){
            triggerMode = intArg;
        } else if (msg.match("/scope-settings/triggerChannel").popInt32(intArg).isOkNoMoreArgs()){
            triggerChannel = intArg;
        } else if (msg.match("/scope-settings/triggerDir").popInt32(intArg).isOkNoMoreArgs()){
            triggerDir = intArg;
        } else if (msg.match("/scope-settings/triggerLevel").popFloat(floatArg).isOkNoMoreArgs()){
            triggerLevel = floatArg;
        } else if (msg.match("/scope-settings/xOffset").popInt32(intArg).isOkNoMoreArgs()){
            xOffset = intArg;
            setXParams();
        } else if (msg.match("/scope-settings/upSampling").popInt32(intArg).isOkNoMoreArgs()){
// printf("received upSampling: %i\n", intArg);
            stop();
            upSampling = intArg;
            setXParams();
            start();
        } else if (msg.match("/scope-settings/downSampling").popInt32(intArg).isOkNoMoreArgs()){
// printf("received downsampling: %d\n", intArg);
            downSampling = intArg;
            setXParams();
        } else if (msg.match("/scope-settings/holdOff").popFloat(floatArg).isOkNoMoreArgs()){
// printf("received holdoff: %f\n----\n", floatArg);
            holdOff = floatArg;
            setXParams();
        } else if (msg.match("/scope-settings/FFTLength").popInt32(intArg).isOkNoMoreArgs()){
// printf("received FFTLength: %d\n", intArg);
// printf("stopping\n");
            stop();
            newFFTLength = intArg;
// printf("fftlength starting\n");
            start();
// printf("fftlength started\n");
        } else if (msg.match("/scope-settings/FFTXAxis").popInt32(intArg).isOkNoMoreArgs()){
// printf("received FFTXaxis\n");
            FFTXAxis = intArg;
        } else if (msg.match("/scope-settings/FFTYAxis").popInt32(intArg).isOkNoMoreArgs()){
// printf("received FFTYaxis\n");
            FFTYAxis = intArg;
        }
    } else if (msg.partialMatch("/scope-sliders/")){
// printf("received scope-sliders\n");
        int intArg;
        float floatArg;
        if (msg.match("/scope-sliders/value").popInt32(intArg).popFloat(floatArg).isOkNoMoreArgs()){
            sliders[intArg] = floatArg;
        }
    }
}
