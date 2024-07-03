#include <SchedulableTask.h>
#include <Bela.h>
#include <fcntl.h>
#include <RtWrappers.h>
#include <stdlib.h>
#include <vector>
#include <string.h>

extern int volatile gRTAudioVerbose;

bool SchedulableTask::shouldStop()
{
	return (Bela_stopRequested() || lShouldStop);
}

int SchedulableTask::create(const std::string& name, std::function<void()> callback, int priority)
{
	empty_callback = callback;
	mode = 0;
	return create(name, priority);
}
int SchedulableTask::create(const std::string& name, std::function<void(const char*)> callback, int priority)
{
	str_callback = callback;
	mode = 1;
	return create(name, priority);
}
int SchedulableTask::create(const std::string& name, std::function<void(const void* buf, int size)> callback, int priority)
{
	buf_callback = callback;
	mode = 2;
	return create(name, priority);
}

int SchedulableTask::create(const std::string& _name, int priority)
{
	name = _name;
	int ret = commsInit();
	if(ret)
	{
		fprintf(stderr, "SchedulableTask: unable to initialize communication %s: %i\n", name.c_str(), ret);
		return 1;
	}
	
	// start the xenomai task
	if(thread.create(name, priority, this->thread_func, this))
	{
		fprintf(stderr, "SchedulableTask: Unable to start thread %s: %i\n", name.c_str(), ret);
		return 1;
	}
	return 0;
}

int SchedulableTask::schedule(const void* buf, size_t size)
{
	return commsSend(buf, size);
}

int SchedulableTask::schedule(const char* str)
{
	return schedule((void*)str, strlen(str));
}

int SchedulableTask::schedule()
{
	static char t = 0;
	return schedule(&t, 1);
}

void SchedulableTask::join()
{
	thread.join();
}

void SchedulableTask::thread_func(void* ptr)
{
	SchedulableTask *instance = (SchedulableTask*)ptr;
	if(!instance)
	{
		fprintf(stderr, "SchedulableTask thread_func without object\n");
		return;
	}
	if (gRTAudioVerbose)
		printf("SchedulableTask %s starting\n", instance->name.c_str());
	instance->loop();
	if (gRTAudioVerbose)
		printf("SchedulableTask %s exiting\n", instance->name.c_str());
}

void SchedulableTask::loop()
{
	size_t constexpr MAX_RECEIVE = 500000;
	std::vector<char> buf(MAX_RECEIVE);
	char* buffer = buf.data();
	size_t maxReceive = MAX_RECEIVE;
	if(1 == mode)
	{
		// leave space for null termination
		maxReceive--;
	}
	while(!shouldStop())
	{
		ssize_t ret = commsReceive(buffer, maxReceive);
		if(ret < 0)
		{
			if(!shouldStop()) fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
			return;
		}
		if(shouldStop())
			return;
		if(0 == mode)
		{
			empty_callback();
		} else if (1 == mode) {
			buffer[ret] = '\0'; // null termination
			str_callback(buffer);
		} else if (2 == mode) {
			buf_callback(buffer, ret);
		}
	}
}


