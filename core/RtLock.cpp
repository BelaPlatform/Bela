#include "../include/RtLock.h"
#include "../include/RtWrappers.h"

#include <pthread.h>
#include <error.h>
#include <string.h>
#ifndef _GNU_SOURCE
#define _GNU_SOURCE
#endif
#include <unistd.h>
#include <sys/syscall.h>
#include <stdexcept>

//#define PRINT_XENO_LOCK

#ifdef PRINT_XENO_LOCK
#define xprintf printf
#define xfprintf fprintf
#else // PRINT_XENO_LOCK
#define xprintf(...)
#define xfprintf(...)
#endif // PRINT_XENO_LOCK

// Standard Linux `gettid(2)` not available on Bela
static inline pid_t getTid() {
	pid_t tid = syscall(SYS_gettid);
	return tid;
}

#ifdef __COBALT__
#include <xenomai/init.h>
// throughout, we use heuristics to check whether Xenomai needs to be
// initialised and whether the current thread is a Xenomai thread.
// See https://www.xenomai.org/pipermail/xenomai/2019-January/040203.html
static void initializeXenomai() {
	xprintf("initializeXenomai\n");
	enum { _argc = 2 };
	int argc = _argc;
	char blankOpt[] = "";
#ifdef PRINT_XENO_LOCK
	char traceOpt[] = "--trace";
#else // PRINT_XENO_LOCK
	char traceOpt[] = "";
#endif // PRINT_XENO_LOCK

	char* const argv[_argc] = { blankOpt, traceOpt };
	char* const* argvPtrs[_argc] = { &argv[0], &argv[1] };
	xenomai_init(&argc, argvPtrs);
}

static bool turnIntoCobaltThread(bool recurred = false) {
	struct sched_param param;
	memset(&param, 0, sizeof(param));
	int policy;
	// Guaranteed to succeed as pthread_self() cannot fail and pthread_getschedparam()'s only error condition is when
	// the given thread does not exist.
	pthread_getschedparam(pthread_self(), &policy, &param);
	pid_t tid = getTid();

	if (int ret = __wrap_sched_setscheduler(tid, policy, &param)) {
		fprintf(stderr, "Warning: unable to turn current thread into a Xenomai thread : (%d) %s\n", -ret,
				strerror(-ret));
		initializeXenomai();
		if (!recurred)
			return turnIntoCobaltThread(true);
		else
			return false;
	}
	xprintf("Turned thread %d into a Cobalt thread %s\n", tid, recurred ? "with recursion" : "");
	return true;
}
#endif // __COBALT__

static bool turnIntoRtThread()
{
#if defined __COBALT__
	return turnIntoCobaltThread();
#else // do nothing
	return true;
#endif
}

static void initializeRt()
{
#ifdef __COBALT__
	initializeXenomai();
#endif // __COBALT__
}

struct RtMutex::Private {
	pthread_mutex_t m_mutex;
};

RtMutex::RtMutex() {
	p = std::unique_ptr<Private>(new Private);
	xprintf("Construct mutex\n");
	if (int ret = BELA_RT_WRAP(pthread_mutex_init(&p->m_mutex, NULL))) {
		if (EPERM != ret) {
			xprintf("thread_mutex_init failed with %d %s\n", ret, strerror(ret));
			throw std::runtime_error("thread_mutex_init failed on first attempt");
		} else {
			xprintf("mutex init returned EPERM\n");
			initializeRt();
			if (int ret = BELA_RT_WRAP(pthread_mutex_init(&p->m_mutex, NULL))) {
				fprintf(stderr, "Error: unable to initialize mutex : (%d) %s\n", ret, strerror(-ret));
				throw std::runtime_error("thread_mutex_init failed on second attempt");
			}
		}
	}
	m_enabled = true;
}

RtMutex::~RtMutex() {
	xprintf("Destroy mutex %p\n", &p->m_mutex);
	if (m_enabled)
		BELA_RT_WRAP(pthread_mutex_destroy(&p->m_mutex));
}

// a helper function to try
// - call func()
// - if it fails, try to turn the current thread into a cobalt thread and call func() again
// - if it fails again, just fail
// - return true if it succeeds, or false if it fails
// id and name are just for debugging purposes, while m_enabled is there because it saves duplicating some lines
template <typename F, typename T> static bool tryOrRetryImpl(F&& func, bool m_enabled, T* id, const char* name) {
	xprintf("tid: %d ", getTid());
	if (!m_enabled) {
		xfprintf(stderr, "%s disabled %p\n", name, id);
		return false;
	}

	xprintf("%s %p\n", name, id);

	int ret = func();
	// 0 is "success" (or at least meaningful failure)
	if (0 == ret) {
		return true;
	} else if (EPERM != ret) {
		return false;
	} else {
		// if we got EPERM, we are not a Xenomai thread
		if (!turnIntoRtThread()) {
			xfprintf(stderr, "%s %p could not turn into cobalt\n", name, id);
			return false;
		}
	}

	// retry after becoming a cobalt thread
	ret = func();
	if (0 == ret) {
		return true;
	} else {
		xfprintf(stderr, "%s %p failed after having turned into cobalt: %d\n", name, id, ret);
		return false;
	}
}

// Helper macro to insert this-ptr and function name
#define tryOrRetry(_func_, _enabled_) tryOrRetryImpl(_func_, _enabled_, this, __func__)

// condition resource_deadlock_would_occur instead of deadlocking. https://en.cppreference.com/w/cpp/thread/mutex/lock
bool RtMutex::try_lock() {
	return tryOrRetry([this]() { return BELA_RT_WRAP(pthread_mutex_trylock(&this->p->m_mutex)); }, m_enabled);
	// TODO: An implementation that can detect the invalid usage is encouraged to throw a std::system_error with error
	// condition resource_deadlock_would_occur instead of deadlocking.
}

void RtMutex::lock() {
	tryOrRetry([this]() { return BELA_RT_WRAP(pthread_mutex_lock(&this->p->m_mutex)); }, m_enabled);
}

void RtMutex::unlock() {
	tryOrRetry([this]() { return BELA_RT_WRAP(pthread_mutex_unlock(&this->p->m_mutex)); }, m_enabled);
}

struct RtConditionVariable::Private {
	pthread_cond_t m_cond;
};

RtConditionVariable::RtConditionVariable() {
	p = std::unique_ptr<Private>(new Private);
	xprintf("Construct CondictionVariable\n");
	if (int ret = BELA_RT_WRAP(pthread_cond_init(&p->m_cond, NULL))) {
		if (EPERM != ret) {
			xprintf("thread_cond_init failed with %d %s\n", ret, strerror(ret));
			throw std::runtime_error("thread_cond_init failed at first attempt");
		} else {
			xprintf("mutex init returned EPERM\n");
			initializeRt();
			if (int ret = BELA_RT_WRAP(pthread_cond_init(&p->m_cond, NULL))) {
				throw std::runtime_error("thread_cond_init failed at second attempt");
			}
		}
	}
	m_enabled = true;
}

RtConditionVariable::~RtConditionVariable() {
	if (m_enabled) {
		notify_all();
		BELA_RT_WRAP(pthread_cond_destroy(&p->m_cond));
	}
}

void RtConditionVariable::wait(RtMutex& lck) {
	tryOrRetry(([this, &lck]() { return BELA_RT_WRAP(pthread_cond_wait(&this->p->m_cond, &lck.p->m_mutex)); }), m_enabled);
}

void RtConditionVariable::wait(std::unique_lock<RtMutex>& lck) {
	// If any parameter has a value that is not valid for this function (such as if lck's mutex object is not locked by
	// the calling thread), it causes undefined behavior.

	// Otherwise, if an exception is thrown, both the condition_variable_any object and the arguments are in a valid
	// state (basic guarantee). Additionally, on exception, the state of lck is attempted to be restored before exiting
	// the function scope (by calling lck.lock()).

	// It may throw system_error in case of failure (transmitting any error condition from the respective call to lock
	// or unlock). The predicate version (2) may also throw exceptions thrown by pred.
	tryOrRetry(([this, &lck]() { return BELA_RT_WRAP(pthread_cond_wait(&this->p->m_cond, &lck.mutex()->p->m_mutex)); }), m_enabled);
}

void RtConditionVariable::notify_one() noexcept {
	tryOrRetry([this]() { return BELA_RT_WRAP(pthread_cond_signal(&this->p->m_cond)); }, m_enabled);
}

void RtConditionVariable::notify_all() noexcept {
	tryOrRetry([this]() { return BELA_RT_WRAP(pthread_cond_broadcast(&this->p->m_cond)); }, m_enabled);
}
