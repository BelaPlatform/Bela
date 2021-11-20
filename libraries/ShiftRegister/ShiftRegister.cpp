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

bool ShiftRegister::dataReady()
{
	bool ret = kIdle == state && !notified;
	notified = true;
	return ret;
}

void ShiftRegisterOut::setClockPeriod(unsigned int period)
{
	if(period < 2)
		period = 2;
	this->period = period;
}

void ShiftRegisterOut::process(BelaContext* context)
{
	for(unsigned int n = 0; n < context->digitalFrames; ++n)
		process(context, n);
}

void ShiftRegisterOut::process(BelaContext* context, unsigned int n)
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
		dataValue = data[currentDataFrame / period];
		clockValue = (currentDataFrame % period) >= (period / 2);
		++currentDataFrame;
		if(period * data.size() == currentDataFrame)
		{
			currentStopFrame = 0;
			state = kStop;
		}
		break;
	case kStop:
		latchValue = 0;
		dataValue = 0;
		clockValue = 0;
		++currentStopFrame;
		if(currentStopFrame >= (unsigned int)(period / 2.f + 0.5f)) // round up to ensure at least half period of latch for odd periods
		{
			notified = false;
			state = kIdle;
		}
		break;
	case kIdle:
		latchValue = 0;
		dataValue = 0;
		clockValue = 0;
		break;
	}
	digitalWriteOnce(context, n, pins.data, dataValue);
	digitalWriteOnce(context, n, pins.clock, clockValue);
	digitalWriteOnce(context, n, pins.latch, latchValue);
}

void ShiftRegisterOut::setData(const std::vector<bool>& dataBuf)
{
	// if dataBuf is larger than data, reallocation may occur
	data = dataBuf;
	state = kStart;
}

void ShiftRegisterOut::setData(const bool* dataBuf, unsigned int length)
{
	// if length is larger than data.capacity(), reallocation will occur
	data.resize(length);
	for(unsigned int n = 0; n < data.size(); ++n)
		data[n] = dataBuf[n];
	state = kStart;
}

const std::vector<bool>& ShiftRegisterIn::getData()
{
	return data;
}

void ShiftRegisterIn::process(BelaContext* context, unsigned int n)
{
	if(!pinModeSet)
	{
		// TODO: should set this from frame n to be rigorous, but this
		// requires fixing https://github.com/BelaPlatform/Bela/issues/412 first
		pinMode(context, 0, pins.data, INPUT);
		pinMode(context, 0, pins.clock, INPUT);
		pinMode(context, 0, pins.latch, INPUT);
		pinModeSet = true;
	}
	bool latchValue = digitalRead(context, n, pins.latch);
	bool dataValue = digitalRead(context, n, pins.data);
	bool clockValue = digitalRead(context, n, pins.clock);
	if(latchValue && !pastLatch)
		state = kStart;
	if(!latchValue && pastLatch)
	{
		state = kStop;
		notified = false;
	}
	switch(state)
	{
	case kStart:
		data.resize(0);
		state = kTransmitting;
		break;
	case kTransmitting:
		if(clockValue && !pastClock)
			data.push_back(dataValue);
		break;
	case kStop:
	case kIdle:
		state = kIdle;
		break;
	}
	pastLatch = latchValue;
	pastClock = clockValue;
}
