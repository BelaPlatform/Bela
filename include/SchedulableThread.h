#pragma once

#include <string>
#include <functional>
#include <pthread.h>

class SchedulableThread {
public:
	SchedulableThread(){};
	template<typename T>
	SchedulableThread(const std::string& _name, T callback, int priority = 0){ create(_name, callback, priority); }

	int create(const std::string& _name, std::function<void()> callback, int priority = 0);
	int create(const std::string& _name, std::function<void(const char*)> callback, int priority = 0);
	int create(const std::string& _name, std::function<void(const void* buf, int size)> callback, int priority = 0);
	int schedule(const void* buf, size_t size);
	int schedule(const char* str);
	int schedule();

protected:
	virtual int commsInit() = 0;
	virtual int commsSend(const void* buf, size_t size) = 0;
	virtual ssize_t commsReceive(char* buf, size_t size) = 0;
	bool shouldStop();
	/**
	 * This joins the thread and so it must be called from the inheriting
	 * class's destructor after, in order:
	 * - setting `lShouldStop = true`
	 * - sending to the thread so that it is scheduled
	 */
	void join();
	int create(const std::string& _name, int _priority);
	void loop();
	static void thread_func(void* ptr);

	std::function<void()> empty_callback;
	std::function<void(const char* str)> str_callback;
	std::function<void(const void* buf, int size)> buf_callback;

	std::string name;
	int mode;
	pthread_t thread;
	bool lShouldStop = false;
};
