#include <AuxTaskNonRT.h>
#include <unistd.h>
#include <RtWrappers.h>
#include <vector>
#include <errno.h>
#include <string.h>
#include <sys/types.h>
#include <sys/socket.h>
#include <Bela.h>

int AuxTaskNonRT::commsInit()
{
	// create an rt_pipe
	int pipeSize = 65536 * 10;
	bool ret = fifo.setup(name, pipeSize, false, true);
	return !ret;
}

int AuxTaskNonRT::commsSend(const void* ptr, size_t size)
{
	int ret = fifo.writeRt((const uint8_t*)ptr, size);
	if(ret < 0)
	{
		rt_fprintf(stderr, "Error while sending to pipe from %s: (%d) %s (size: %zu)\n", name.c_str(), errno, strerror(errno), size);
		return errno;
	}
	return 0;
}

AuxTaskNonRT::~AuxTaskNonRT()
{
	lShouldStop = true;
	char c = '\0';
	fifo.setBlockingRt(false);
	fifo.writeRt(c);
	join();
}

ssize_t AuxTaskNonRT::commsReceive(char* buf, size_t size)
{
	int ret = fifo.readNonRt(buf, size);
	return ret;
}
