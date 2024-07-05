#pragma once
#include <string>
#include <functional>
#include <pthread.h>
#include "RtLock.h"

class RtThread
{
public:
	~RtThread();
	int create(const std::string& name, int priority, std::function<void(void*)> callback, void* arg = nullptr, cpu_set_t* cpuset = nullptr, int stackSize = 0);
	int join();
	pthread_t native_handle();
	int setPriority(int priority);
	int getPriority();
	static int setThisThreadPriority(int priority);
	static int getThisThreadPriority();
private:
	static void* internalCallback(void*);
	void callCallback();
	pthread_t thread;
	std::string name;
	void* arg;
	std::function<void(void*)> callback;
	bool joinable = false;
};

/**
 * The callback is called in the dedicated thread after another thread calls schedule().
 *
 * The number of times that the callback is called may be lower than the
 * number of calls to schedule(): if the callback is already running a call to
 * schedule(false) has no effect, while a call to schedule(true) may black the
 * calling thread while the waiting thread finishes the current execution.
 */
class WaitingTask
{
public:
	WaitingTask() {}
	/// See create()
	WaitingTask(const std::string& _name, int priority, std::function<void()> callback, cpu_set_t* cpuset = nullptr, size_t stackSize = 0)
	{
		create(_name, priority, callback, cpuset, stackSize);
	}
	~WaitingTask();
	/**
	 * Create a thread with the provided parameters. These are forwarded to RtThread::create()
	 *
	 * @return 0 on succes or an error code.
	 */
	int create(const std::string& _name, int priority, std::function<void()> callback, cpu_set_t* cpuset = nullptr, size_t stackSize = 0);
	/**
	 * Release the waiting thread so that it can execute the callback once.
	 *
	 * @param force If false and the callback is currently being executed,
	 * the call returns without triggering an execution of the calback. If
	 * true the call may block until any current execution of the callback
	 * is completed and a new one is scheduled.
	 *
	 * @return 0 if the callback was successfully scheduled, 1 otherwise
	 */
	int schedule(bool force = false);
private:
	volatile bool lShouldStop = false;
	volatile bool started = false;
	std::function<void()> callback;
	RtSync sync;
	RtThread thread;
};
