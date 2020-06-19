#include "ShiftRegister.h"

ShiftRegister::ShiftRegister(){};

ShiftRegister::ShiftRegister(const Pins& pins, unsigned int maxSize){
	setup(pins, maxSize);
}

void ShiftRegister::setup(const Pins& pins, unsigned int maxSize)
{
	this->pins = pins;
	data.resize(maxSize);
}

bool ShiftRegister::dataSent()
{
	return kIdle == state;
}

void ShiftRegister::process(BelaContext* context)
{
	for(unsigned int n = 0; n < context->digitalFrames; ++n)
		process(context, n);
}

void ShiftRegister::process(BelaContext* context, unsigned int n)
{
	if(!pinModeSet)
	{
		pinMode(context, 0, pins.data, OUTPUT);
		pinMode(context, 0, pins.clock, OUTPUT);
		pinMode(context, 0, pins.latch,OUTPUT);
		pinModeSet = true;
	}
	bool latchValue;
	bool dataValue;
	bool clockValue;
	switch(state)
	{
	case kStart:
		latchValue = 1;
		dataValue = 0;
		clockValue = 0;
		state = kTransmitting;
		currentDataFrame = 0;
		break;
	case kTransmitting:
		latchValue = 1;
		dataValue = data[currentDataFrame / 2];
		clockValue = currentDataFrame & 1;
		++currentDataFrame;
		if(2 * data.size() == currentDataFrame)
			state = kStop;
		break;
	case kStop:
	case kIdle:
		latchValue = 0;
		dataValue = 0;
		clockValue = 0;
		state = kIdle;
		break;
	}
	digitalWriteOnce(context, n, pins.data, dataValue);
	digitalWriteOnce(context, n, pins.clock, clockValue);
	digitalWriteOnce(context, n, pins.latch, latchValue);
}

void ShiftRegister::setData(const std::vector<bool>& dataBuf)
{
	// if dataBuf is larger than data, reallocation may occur
	data = dataBuf;
	state = kStart;
}

void ShiftRegister::setData(const bool* dataBuf, unsigned int length)
{
	// if length is larger than data.capacity(), reallocation will occur
	data.resize(length);
	for(unsigned int n = 0; n < data.size(); ++n)
		data[n] = dataBuf[n];
	state = kStart;
}
