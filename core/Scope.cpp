/***** Scope.cpp *****/
#include <Scope.h>

Scope::Scope():connected(0), triggerPrimed(false), started(false){}

// static aux task functions
void Scope::triggerTask(void *ptr){
    Scope *instance = (Scope*)ptr;
    while(instance->started && !gShouldStop) {
        if (instance->triggerTaskFlag){
            instance->doTrigger();
            instance->triggerTaskFlag = false;
        }
        usleep(1000);
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

void Scope::setup(unsigned int _numChannels, float _sampleRate){
    
    numChannels = _numChannels;
    sampleRate = _sampleRate;
    
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

    // send an OSC message to address /scope-setup
    // then wait 1 second for a reply on /scope-setup-reply 
    bool handshakeReceived = false;
    oscClient.sendMessageNow(oscClient.newMessage.to("/scope-setup").add((int)numChannels).add(sampleRate).end());
    oscServer.receiveMessageNow(1000);
    while (oscServer.messageWaiting()){
        if (handshakeReceived){
            parseMessage(oscServer.popMessage());
        } else if (oscServer.popMessage().match("/scope-setup-reply")){
            handshakeReceived = true;
        }
    }
    
    if (handshakeReceived && connected)
        start();
    
}

void Scope::start(){

    // resize the buffers
    channelWidth = frameWidth * FRAMES_STORED;
    buffer.resize(numChannels*channelWidth);
    outBuffer.resize(numChannels*frameWidth);

    // reset the pointers
    writePointer = 0;
    readPointer = 0;
    triggerPointer = 0;

    // reset the trigger
    triggerPrimed = true;
    triggerCollecting = false;
    triggerWaiting = false;
    triggerCount = 0;
    downSampleCount = 1;
    autoTriggerCount = 0;
    customTriggered = false;

    started = true;
    
    sendBufferFlag = false;
    Bela_scheduleAuxiliaryTask(scopeSendBufferTask);
    
    logCount = 0;
    triggerTaskFlag = false;
    Bela_scheduleAuxiliaryTask(scopeTriggerTask);
    
}

void Scope::stop(){
    started = false;
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
    
    if (downSampling > 1){
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
    for (int j=1; j<upSampling; j++){
        
        buffer[writePointer] = buffer[startingWritePointer];
    
        for (int i=1; i<numChannels; i++) {
            buffer[i*channelWidth + writePointer] = buffer[i*channelWidth + startingWritePointer];
        }
    
        writePointer = (writePointer+1)%channelWidth;
        
    }
    
    logCount += upSampling;
    if (logCount > TRIGGER_LOG_COUNT){
        triggerTaskFlag = true;
        logCount = 0;
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

void Scope::doTrigger(){
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
                triggerPointer = (readPointer-xOffset+channelWidth)%channelWidth;
                
                triggerCount = frameWidth/2 - xOffset;
                autoTriggerCount = 0;
                
            } else {
                // auto triggering
                if (triggerMode == 0 && (autoTriggerCount++ > (frameWidth+holdOff))){
                    // it's been a whole frameWidth since we've found a trigger, so auto-trigger anyway
                    triggerPrimed = false;
                    triggerCollecting = true;
                    
                    // save the readpointer at the trigger point
                    triggerPointer = (readPointer-xOffset+channelWidth)%channelWidth;
                    
                    triggerCount = frameWidth/2 - xOffset;
                    autoTriggerCount = 0;
                }
            }
            
        } else if (triggerCollecting){
            
            // a trigger has been detected, and we are collecting the second half of the triggered frame
            if (--triggerCount > 0){
                
            } else {
                triggerCollecting = false;
                triggerWaiting = true;
                triggerCount = frameWidth/2 + holdOffSamples;
                
                // copy the previous to next frameWidth/2 samples into the outBuffer
                int startptr = (triggerPointer-frameWidth/2 + channelWidth)%channelWidth;
                int endptr = (triggerPointer+frameWidth/2 + channelWidth)%channelWidth;
                
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

void Scope::sendBuffer(){
    socket.send(&(outBuffer[0]), outBuffer.size()*sizeof(float));
}

void Scope::parseMessage(oscpkt::Message msg){
    if (msg.partialMatch("/scope-settings/")){
        int intArg;
        float floatArg;
        if (msg.match("/scope-settings/connected").popInt32(intArg).isOkNoMoreArgs()){
            if (connected == 0 && intArg == 1){
                start();
            } else if (connected == 1 && intArg == 0){
                stop();
            }
            connected = intArg;
        } else if (msg.match("/scope-settings/frameWidth").popInt32(intArg).isOkNoMoreArgs()){
            stop();
            frameWidth = intArg;
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
        } else if (msg.match("/scope-settings/upSampling").popInt32(intArg).isOkNoMoreArgs()){
            upSampling = intArg;
            holdOffSamples = (int)(sampleRate*0.001*holdOff*upSampling/downSampling);
        } else if (msg.match("/scope-settings/downSampling").popInt32(intArg).isOkNoMoreArgs()){
            downSampling = intArg;
            holdOffSamples = (int)(sampleRate*0.001*holdOff*upSampling/downSampling);
        } else if (msg.match("/scope-settings/holdOff").popFloat(floatArg).isOkNoMoreArgs()){
            holdOff = floatArg;
            holdOffSamples = (int)(sampleRate*0.001*holdOff*upSampling/downSampling);
        }
    }
}
