/*
 * DigitalStream.h
 *
 *  Created on: 7 Jun 2016
 *      Author: giulio
 */

#ifndef DIGITALTOMESSAGE_H_
#define DIGITALTOMESSAGE_H_
#include <Bela.h>

//class ProcessedDigitalChannel{
//	ProcessedDigitalChannel(){
//		digitalToMessageActive = false;
//		messageToDigitalActive = false;
//		analogToDigitalActive = false;
//	};
//	void processInput(unsigned int bit, uint32_t* array, unsigned int length){
//		if(digitalToMessageActive){
//			digitalToMessage.process(bit, array, length);
//		}
//	};
//	void processOutput(unsigned int bit, uint32_t* digitalArray, float* analogArray, unsigned int length){
//
//	}
//	DigitalToMessage* getDigitalToMessage(){
//		return digitalToMessage;
//	}
//	DigitalToMessage digitalToMessage;
//	bool digitalToMessageActive;
//	bool messageToDigitalActive;
//	bool analogToDigitalActive;
//};

class DigitalToMessage {
public:
	DigitalToMessage();
	void setCallback(void (*newCallback)(bool, unsigned int, void*), void* arg){
		callbackArg = arg;
		stateChangedCallback = newCallback;
		if(newCallback != NULL){
			callbackEnabled = true;
		} else {
			callbackEnabled = false;
		}
	};
	void process(unsigned int bit, uint32_t* array, unsigned int length){
		if(callbackEnabled == false){
			return;
		}
		for(unsigned int n = 0 ; n < length; ++n){
			bool state = ((array[n]) >> (bit)) & 1;
			if(state != lastState){ //TODO: use debounceLength
				stateChangedCallback(state, n, callbackArg);
			}
			lastState = state;
		}
	};
	void setDebounceLength(unsigned int length);
	virtual ~DigitalToMessage();
private:
	unsigned int debounceLength;
	bool callbackEnabled;
	void* callbackArg;
	void (*stateChangedCallback)(bool, unsigned int, void*);
	bool lastState;
};

#endif /* DIGITALTOMESSAGE_H_ */
