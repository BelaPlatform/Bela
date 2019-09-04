#include "PulseIn.h"

void PulseIn::setup(BelaContext* context, unsigned int digitalInput, int direction){
	_digitalInput = digitalInput;
	_pulseIsOn = false;
	_pulseOnState = direction == 1 ? 1 : 0;
	_array.resize(context->digitalFrames);
	_lastContext = (uint64_t)-1;
	pinMode(context, 0, digitalInput, INPUT); //context is used to allocate the number of elements in the array
}

void PulseIn::check(BelaContext* context){
	if(_digitalInput == -1){ //must be setup'ed before calling check();
		throw(1);
	}
	for(unsigned int n = 0; n < context->digitalFrames; n++){
		_array[n] = 0; //maybe a few of these will be overwritten below
	}
	for(unsigned int n = 0; n < context->digitalFrames; n++){
		if(_pulseIsOn == false){ // look for start edge
			if(digitalRead(context, n, _digitalInput) == _pulseOnState){
				_pulseStart = context->audioFramesElapsed + n; // store location of start edge
				_pulseIsOn = true;
			}
		} else { // _pulseIsOn == true;
			if(digitalRead(context, n, _digitalInput) == !_pulseOnState){ // look for stop edge
				_array[n] = context->audioFramesElapsed + n - _pulseStart; // compute and store pulse duration
				_pulseIsOn = false;
			}
		}
	}
	_lastContext = context->audioFramesElapsed;
};

PulseIn::~PulseIn() {
	cleanup();
}
void PulseIn::cleanup(){};

