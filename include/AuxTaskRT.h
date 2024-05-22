#pragma once
#include "SchedulableThread.h"
#include <mqueue.h>
#include <string>

class AuxTaskRT : public SchedulableThread
{
public:
	~AuxTaskRT();
private:
	int commsInit();
	int commsSend(const void* buf, size_t size);
	ssize_t commsReceive(char* buf, size_t size);
	mqd_t queueDesc;
	std::string queueName;
};
