#pragma once
#include <string>
#include <functional>
#include <pthread.h>

class RtThread
{
public:
	int create(const std::string& name, int priority, std::function<void(void*)> callback, void* arg = nullptr, cpu_set_t* cpuset = nullptr, int stackSize = 0);
	int join();
	pthread_t native_handle();
private:
	static void* internalCallback(void*);
	void callCallback();
	pthread_t thread;
	std::string name;
	void* arg;
	std::function<void(void*)> callback;
};
