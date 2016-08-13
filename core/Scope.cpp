/***** Scope.cpp *****/
#include <Scope.h>

Scope::Scope():connected(0), upSampling(1), downSampling(1), triggerPrimed(false), started(false), settingUp(true){}

// static aux task functions
void Scope::triggerTask(void *ptr){
    Scope *instance = (Scope*)ptr;
    if (instance->plotMode == 0){
        instance->triggerTimeDomain();
    } else if (instance->plotMode == 1){
        instance->triggerFFT();
    }
}
void Scope::sendBufferTask(void *ptr){
    Scope *instance = (Scope*)ptr;
    while(instance->started && !gShouldStop) {
        if (instance->sendBufferFlag){
            instance->sendBuffer();
            instance->sendBufferFlag = false;
        }
        usleep(1000);
    }
}
void Scope::plotModeTask(void *ptr){
    Scope *instance = (Scope*)ptr;
    rt_printf("task\n");
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

    // setup the udp socket
    // used for sending raw frame data
    socket.setServer("127.0.0.1");
	socket.setPort(SCOPE_UDP_PORT);

	// setup the auxiliary tasks
	scopeTriggerTask = Bela_createAuxiliaryTask(Scope::triggerTask, BELA_AUDIO_PRIORITY-2, "scopeTriggerTask", this);
	scopeSendBufferTask = Bela_createAuxiliaryTask(Scope::sendBufferTask, BELA_AUDIO_PRIORITY-1, "scopeSendBufferTask", this);
	scopePlotModeTask = Bela_createAuxiliaryTask(Scope::plotModeTask, BELA_AUDIO_PRIORITY-3, "scopePlotModeTask", this);
	
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

void Scope::start(bool setup){
    
    if (started || settingUp) return;
    
    if (setup)
        setPlotMode();
    else
        Bela_scheduleAuxiliaryTask(scopePlotModeTask);

    // reset the pointers
    writePointer = 0;
    readPointer = 0;

    started = true;
    
    sendBufferFlag = false;
    Bela_scheduleAuxiliaryTask(scopeSendBufferTask);
    
    logCount = 0;

}

void Scope::stop(){
    started = false;
    if (plotMode == 1){
        delete inFFT;
        delete outFFT;
        delete windowFFT;
    }
}

void Scope::setPlotMode(){
    rt_printf("func\n");
    if (settingUp) return;
    
    // setup the input buffer
    frameWidth = pixelWidth/upSampling;
    channelWidth = frameWidth * FRAMES_STORED;
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
        //inFFT = (ne10_fft_cpx_float32_t*) NE10_MALLOC (FFTLength * sizeof (ne10_fft_cpx_float32_t));
        inFFT = new ne10_fft_cpx_float32_t[FFTLength];
    	outFFT = new ne10_fft_cpx_float32_t[FFTLength * sizeof (ne10_fft_cpx_float32_t)];
    	cfg = ne10_fft_alloc_c2c_float32_neon (FFTLength);
    	
    	pointerFFT = 0;
        collectingFFT = true;

        // Allocate the window buffer based on the FFT size
    	windowFFT = new float[FFTLength];
    
    	// Calculate a Hann window
    	for(int n = 0; n < FFTLength; n++) {
    		windowFFT[n] = 0.5f * (1.0f - cosf(2.0 * M_PI * n / (float)(FFTLength - 1)));
    	}
        
    }
    
}

void Scope::log(float* values){
    
	if (!prelog()) return;

    int startingWritePointer = writePointer;

    // save the logged samples into the buffer
    for (int i=0; i<numChannels; i++) {
        buffer[i*channelWidth + writePointer] = values[i];
    }

   postlog(startingWritePointer);

}
void Scope::log(float chn1, ...){
    
    if (!prelog()) return;
    
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
    
    // if upSampling > 1, save repeated samples into the buffer
    /*for (int j=1; j<upSampling; j++){
        
        buffer[writePointer] = buffer[startingWritePointer];
    
        for (int i=1; i<numChannels; i++) {
            buffer[i*channelWidth + writePointer] = buffer[i*channelWidth + startingWritePointer];
        }
    
        writePointer = (writePointer+1)%channelWidth;
        
    }*/
    
    logCount += 1;//upSampling;
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

void Scope::scheduleSendBufferTask(){
    sendBufferFlag = true;
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
                
                // float tFirst = fabs(buffer[channelWidth*triggerChannel+((readPointer-1+channelWidth)%channelWidth)]);
                // float tSecond = fabs(buffer[channelWidth*triggerChannel+((readPointer+channelWidth)%channelWidth)]);
                // rt_printf("%f\n", tFirst/(tFirst+tSecond)-0.5f);
                
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
                scheduleSendBufferTask();
                
            }
            
        } else if (triggerWaiting){
            
            // a trigger has completed, so wait half a framewidth before looking for another
            if (--triggerCount > 0){
                
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
        
        // take the magnitude of the complex FFT output, scale it and interpolate
        for (int i=0; i<frameWidth; i++){
            
            float findex, rem = 0.0f;
            int index;
            
            if (FFTXAxis == 0){  // linear
                findex = (float)i*ratio;
                index = (int)findex;
                rem = findex - index;
            } else if (FFTXAxis == 1){  // logarithmic
                findex = expf((float)i*logConst);
                index = (int)(findex*ratio);
                rem = findex*ratio - index;
            }
            
            float first = 0.0f, second = 0.0f;
            if (FFTYAxis == 0){ // normalised linear magnitude
                first = sqrtf((float)(outFFT[index].r * outFFT[index].r + outFFT[index].i * outFFT[index].i));
                second = sqrtf((float)(outFFT[index+1].r * outFFT[index+1].r + outFFT[index+1].i * outFFT[index+1].i));
            } else if (FFTYAxis == 1){ // decibels
                first = 10.0f*log10f((float)(outFFT[index].r * outFFT[index].r + outFFT[index].i * outFFT[index].i));
                second = 10.0f*log10f((float)(outFFT[index+1].r * outFFT[index+1].r + outFFT[index+1].i * outFFT[index+1].i));
            }
            
            outBuffer[c*frameWidth+i] = FFTScale * (first + rem * (second - first));
        }
        
    }
    
    scheduleSendBufferTask();
}

void Scope::sendBuffer(){
    socket.send(&(outBuffer[0]), outBuffer.size()*sizeof(float));
}

float Scope::getSliderValue(int slider){
    return sliders[slider];
}

void Scope::setSlider(int slider, float min, float max, float step, float value){
    sliders[slider] = value;
    oscClient.sendMessageNow(
        oscClient.newMessage.to("/scope-slider")
            .add(slider)
            .add(min)
            .add(max)
            .add(step)
            .add(value)
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
        int intArg;
        float floatArg;
        if (msg.match("/scope-settings/connected").popInt32(intArg).isOkNoMoreArgs()){
            if (connected == 0 && intArg == 1){
                // rt_printf("connected start\n");
                start();
            } else if (connected == 1 && intArg == 0){
                stop();
            }
            connected = intArg;
        } else if (msg.match("/scope-settings/frameWidth").popInt32(intArg).isOkNoMoreArgs()){
            // rt_printf("recieved frameWidth: %i\n", intArg);
            stop();
            pixelWidth = intArg;
            start();
        } else if (msg.match("/scope-settings/plotMode").popInt32(intArg).isOkNoMoreArgs()){
            // rt_printf("recieved plotMode: %i\n", intArg);
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
            // rt_printf("recieved upSampling: %i\n", intArg);
            stop();
            upSampling = intArg;
            setXParams();
            start();
        } else if (msg.match("/scope-settings/downSampling").popInt32(intArg).isOkNoMoreArgs()){
            downSampling = intArg;
            setXParams();
        } else if (msg.match("/scope-settings/holdOff").popFloat(floatArg).isOkNoMoreArgs()){
            holdOff = floatArg;
            setXParams();
        } else if (msg.match("/scope-settings/FFTLength").popInt32(intArg).isOkNoMoreArgs()){
            // rt_printf("recieved FFTLength: %i\n", intArg);
            stop();
            FFTLength = intArg;
            FFTScale = 1.0/((float)intArg);
            start();
        } else if (msg.match("/scope-settings/FFTXAxis").popInt32(intArg).isOkNoMoreArgs()){
            FFTXAxis = intArg;
        } else if (msg.match("/scope-settings/FFTYAxis").popInt32(intArg).isOkNoMoreArgs()){
            FFTYAxis = intArg;
        }
    } else if (msg.partialMatch("/scope-sliders/")){
        int intArg;
        float floatArg;
        if (msg.match("/scope-sliders/value").popInt32(intArg).popFloat(floatArg).isOkNoMoreArgs()){
            sliders[intArg] = floatArg;
        }
    }
}
