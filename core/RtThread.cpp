#include "../include/RtThread.h"
#include "../include/RtWrappers.h"
#include <string.h>
#include <error.h>

void* RtThread::internalCallback(void* p)
{
	RtThread* that = (RtThread*)p;
	that->callCallback();
	return NULL;
}

int RtThread::create(const std::string& name, int priority, std::function<void(void*)> callback, void* arg, cpu_set_t* cpuset, int stackSize)
{
	this->arg = arg;
	this->callback = callback;
	this->name = name;
	if(int ret = create_and_start_thread(&thread, name.c_str(), priority, stackSize, cpuset, internalCallback, this))
	{
		fprintf(stderr, "RtThread: Unable to start thread %s: %i\n", name.c_str(), ret);
		return 1;
	}
	return 0;
}

int RtThread::join()
{
	// unblock and join thread
	int ret = BELA_RT_WRAP(pthread_join(thread, NULL));
	if (ret < 0)
		fprintf(stderr, "RtThread %s: unable to join thread: (%i) %s\n", name.c_str(), ret, strerror(ret));
	return ret;
}

pthread_t RtThread::native_handle()
{
	return thread;
}
void RtThread::callCallback()
{
	callback(arg);
}
