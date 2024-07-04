#include "../include/RtThread.h"
#include "../include/RtWrappers.h"
#include <string.h>
#include <error.h>

RtThread::~RtThread()
{
	if(joinable)
		join();
}

void* RtThread::internalCallback(void* p)
{
	RtThread* that = (RtThread*)p;
	that->callCallback();
	return NULL;
}

int RtThread::create(const std::string& name, int priority, std::function<void(void*)> callback, void* arg, cpu_set_t* cpuset, int stackSize)
{
	if(joinable)
	{
		fprintf(stderr, "RtThread: thread %s is alraedy running when creating it with name %s\n", this->name.c_str(), name.c_str());
		return 1;
	}
	this->arg = arg;
	this->callback = callback;
	this->name = name;
	if(int ret = create_and_start_thread(&thread, name.c_str(), priority, stackSize, cpuset, internalCallback, this))
	{
		fprintf(stderr, "RtThread: Unable to start thread %s: %i\n", name.c_str(), ret);
		return 1;
	}
	joinable = true;
	return 0;
}

int RtThread::join()
{
	// unblock and join thread
	int ret = BELA_RT_WRAP(pthread_join(thread, NULL));
	if (ret < 0)
		fprintf(stderr, "RtThread %s: unable to join thread: (%i) %s\n", name.c_str(), ret, strerror(ret));
	joinable = false;
	return ret;
}

pthread_t RtThread::native_handle()
{
	return thread;
}

static int setPriority(pthread_t thread, int priority)
{
	int sched = priority > 0 ? SCHED_FIFO : SCHED_OTHER;
	struct sched_param p = {
		.sched_priority = priority,
	};
	return BELA_RT_WRAP(pthread_setschedparam(thread, sched, &p));
}

int RtThread::setThisThreadPriority(int priority)
{
	return ::setPriority(pthread_self(), priority);
}

int RtThread::setPriority(int priority)
{
	return ::setPriority(thread, priority);
}

static int getPriority(pthread_t thread)
{
	struct sched_param param;
	int policy;
	int ret = BELA_RT_WRAP(pthread_getschedparam(thread, &policy, &param));
	if(ret)
		return -1;
	return param.sched_priority;
}

int RtThread::getThisThreadPriority()
{
	return ::getPriority(pthread_self());
}

int RtThread::getPriority()
{
	return ::getPriority(thread);
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
		int originalPriority = thread.getPriority();
		if(originalPriority >= 0)
		{
			// set the priority to maximum
			thread.setPriority(sched_get_priority_max(SCHED_FIFO));
			// just in case we have the same priority, let the
			// other go first
			BELA_RT_WRAP(sched_yield());
			if(!started)
				fprintf(stderr, "Force starting scheduled thread didn't work\n");
			// by the time we are here, the other thread has run, set the
			// started flag, and is now waiting for the cond
			// So, restore its schedparams
			thread.setPriority(originalPriority);
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
