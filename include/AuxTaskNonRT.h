#pragma once
#include "SchedulableThread.h"

class AuxTaskNonRT : public SchedulableThread
{
public:
	~AuxTaskNonRT();
private:
	int commsInit();
	int commsSend(const void* buf, size_t size);
	ssize_t commsReceive(char* buf, size_t size);
	int openPipe();
	int pipeSocket = -1;
	int pipe_fd = -1;
};

