#pragma once
#include "SchedulableTask.h"
#include "RtMsgFifo.h"
#include <mqueue.h>
#include <string>

class AuxTaskRT : public SchedulableTask
{
public:
	AuxTaskRT(){};
	template<typename T>
	AuxTaskRT(const std::string& _name, T callback, int priority = 0)
	{
		create(_name, callback, priority);
	}
	~AuxTaskRT();
private:
	int commsInit();
	int commsSend(const void* buf, size_t size);
	ssize_t commsReceive(char* buf, size_t size);
	RtMsgFifo fifo;
};
