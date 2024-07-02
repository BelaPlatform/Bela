#include <AuxTaskRT.h>
#include <fcntl.h>
#include <stdlib.h>
#include <vector>
#include <string.h>

AuxTaskRT::~AuxTaskRT()
{
	lShouldStop = true;
	char c = 0;
	fifo.send(&c, sizeof(c), 0);
	join();
}

int AuxTaskRT::commsInit()
{
	return fifo.setup(name);
}

int AuxTaskRT::commsSend(const void* buf, size_t size)
{
	return fifo.send(buf, size);
}

ssize_t AuxTaskRT::commsReceive(char* buf, size_t size)
{
	return fifo.receive(buf, size);
}

