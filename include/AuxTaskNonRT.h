#pragma once
#include "SchedulableThread.h"

class AuxTaskNonRT : public SchedulableThread
{
public:
	AuxTaskNonRT(){};
	template<typename T>
	AuxTaskNonRT(const std::string& _name, T callback, int priority = 0)
	{
		create(_name, callback, priority);
	}
	~AuxTaskNonRT();
private:
	int commsInit();
	int commsSend(const void* buf, size_t size);
	ssize_t commsReceive(char* buf, size_t size);
	int pipeSocket = -1;
	int pipe_fd = -1;
};

