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
	// sanitise: this could be used in paths to create pipes
	for(auto& c : name)
		if('/' == c || '\\' == c  || ':' == c || ' ' == c || '\t' == c || '\n' ==c || '\r' == c || '\0' == c)
			c = '_';
	// create an rt_pipe
	std::string p_name = "p_" + name;
	int pipeSize = 65536 * 10;
	int ret = createBelaRtPipe(p_name.c_str(), pipeSize, &pipeSocket, &pipe_fd);
	if(ret)
	{
		fprintf(stderr, "Unable to create AuxTaskNonRT %s pipe %s: (%i) %s\n", name.c_str(), p_name.c_str(), ret, strerror(ret));
		return 1;
	}
	return 0;
}

int AuxTaskNonRT::commsSend(const void* ptr, size_t size)
{
	int ret = BELA_RT_WRAP(send(pipeSocket, ptr, size, 0));
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
	// DONTWAIT if the pipe is full
	char c = '\0';
	int ret = BELA_RT_WRAP(send(pipeSocket, &c, sizeof(c), MSG_DONTWAIT));
	if(ret < 0)
	{
		fprintf(stderr, "Error sending to pipeSocket on destruction: %d %s\n", errno, strerror(errno));
	}
	join();
	ret = BELA_RT_WRAP(close(pipeSocket));
	if(ret)
	{
		fprintf(stderr, "Error closing pipeSocket: %d %s\n", errno, strerror(errno));
	}
	ret = close(pipe_fd);
	if(ret)
	{
		fprintf(stderr, "Error closing pipe_fd: %d %s\n", errno, strerror(errno));
	}
}

ssize_t AuxTaskNonRT::commsReceive(char* buf, size_t size)
{
	return read(pipe_fd, buf, size);
}
