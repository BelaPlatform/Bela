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


int WaitingTask::create(const std::string& _name, int priority, std::function<void()> callback, cpu_set_t* cpuset, size_t stackSize)
{
	this->callback = callback;
	lShouldStop = false;
	started = false;
	int ret = thread.create(_name, priority, [this,_name](void*) {
			started = true;
			while(!lShouldStop)
			{
				sync.wait();
				if(!lShouldStop)
					this->callback();
			}
		}, NULL, cpuset, stackSize);
	return ret;
}

int WaitingTask::schedule(bool force)
{
	if(!started)
	{
		printf("scheduled thread was not started yet\n");
		// the task has not yet had a chance to run.
		// let's enforce it now. This will block the current thread
		// until the other starts.
		struct sched_param param;
		int policy;
		pthread_t task = thread.native_handle();
		int ret = BELA_RT_WRAP(pthread_getschedparam(task,
				&policy, &param));
		if(!ret)
		{
			// set the priority to maximum
			int originalPriority = param.sched_priority;
			param.sched_priority = BELA_RT_WRAP(sched_get_priority_max(SCHED_FIFO));
			BELA_RT_WRAP(pthread_setschedparam(task,
					SCHED_FIFO, &param));
			// just in case we have the same priority, let the
			// other go first
			BELA_RT_WRAP(sched_yield());
			if(!started)
				fprintf(stderr, "Force starting scheduled thread didn't work\n");
			// by the time we are here, the other thread has run, set the
			// started flag, and is now waiting for the cond
			// So, restore its schedparams
			param.sched_priority = originalPriority;
			BELA_RT_WRAP(pthread_setschedparam(task,
					policy, &param));
		}
	}
	return !sync.notify(force);
}

WaitingTask::~WaitingTask()
{
	lShouldStop = true;
	// let the thread run if it's blocked so it can see the flag
	schedule();
	thread.join();
}
