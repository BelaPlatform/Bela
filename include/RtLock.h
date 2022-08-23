#pragma once
#include <mutex> //unique_lock
#include <memory> 
// Xenomai enforces the requirement to hold the lock so that optimizing
// the wake up process is possible - under the assumption that the caller
// owns the lock. There is no hack around this.
// See: https://www.xenomai.org/pipermail/xenomai/2017-October/037759.html

class RtMutex {
	friend class RtConditionVariable;
public:
	RtMutex();
	~RtMutex();

	bool try_lock();
	void lock();
	void unlock();

private:
	bool m_enabled = false;
	struct Private;
	std::unique_ptr<Private> p;
};

class RtConditionVariable {
public:
	RtConditionVariable();
	~RtConditionVariable();

	void wait(std::unique_lock<RtMutex>& lck);
	void wait(RtMutex& lck);
	void notify_one() noexcept;
	void notify_all() noexcept;

private:
	bool m_enabled = false;
	struct Private;
	std::unique_ptr<Private> p;
};
