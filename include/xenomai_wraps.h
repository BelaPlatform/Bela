#if !defined(XENOMAI_SKIN_native) && !defined(XENOMAI_SKIN_posix)
#error Xenomai skin unsupported or not defined
#endif

#if defined(BELA_USE_XENOMAI_INTERRUPTS) && !defined(XENOMAI_SKIN_native)
#error Interrupts are only supported with the Xenomai native skin
#endif

#include <time.h>
#ifdef __cplusplus
extern "C" {
#endif
#ifdef XENOMAI_SKIN_posix
int __wrap_nanosleep(const struct timespec *req, struct timespec *rem);
int __pthread_join(pthread_t thread, void **retval);
int __wrap_pthread_create(pthread_t *thread, const pthread_attr_t *attr, void *(*start_routine) (void *), void *arg);
#endif

#ifdef XENOMAI_SKIN_native
#include <native/task.h>
typedef RTIME time_ns_t;
#endif
#ifdef XENOMAI_SKIN_posix
typedef long long int time_ns_t;
typedef void *(pthread_callback_t)(void *);
#endif


static inline int task_sleep_ns(long long int timens)
{
#ifdef XENOMAI_SKIN_native
	return rt_task_sleep((RTIME) timens);
#endif
#ifdef XENOMAI_SKIN_posix
	struct timespec req;
	req.tv_sec = timens/1000000000;
	req.tv_nsec = timens - req.tv_sec;
	return __wrap_nanosleep(&req, NULL);
#endif
}

#ifdef XENOMAI_SKIN_posix
#include <cobalt/pthread.h>
#include <error.h>
//void error(int exitCode, int errno, char* message)
//{
	//fprintf(stderr, "Error during `%s`: %d %s\n", message, errno, strerror(errno));
	//exit(exitCode);
//}

// got this from xenomai-3/testsuite/latency/latency.c
static void setup_sched_parameters(pthread_attr_t *attr, int prio)
{
	struct sched_param p;
	int ret;
	
	ret = pthread_attr_init(attr);
	if (ret)
		error(1, ret, "pthread_attr_init()");

	ret = pthread_attr_setinheritsched(attr, PTHREAD_EXPLICIT_SCHED);
	if (ret)
		error(1, ret, "pthread_attr_setinheritsched()");

	ret = pthread_attr_setschedpolicy(attr, prio ? SCHED_FIFO : SCHED_OTHER);
	if (ret)
		error(1, ret, "pthread_attr_setschedpolicy()");

	p.sched_priority = prio;
	ret = pthread_attr_setschedparam(attr, &p);
	if (ret)
		error(1, ret, "pthread_attr_setschedparam()");
}

static int setup_thread_attributes(pthread_attr_t *attr, int stackSize, int prio)
{
	if(pthread_attr_init(attr))
	{
		fprintf(stderr, "Error: unable to init thread attributes\n");
		return -1;
	}
	if(pthread_attr_setdetachstate(attr, PTHREAD_CREATE_JOINABLE))
	{
		fprintf(stderr, "Error: unable to set detachstate\n");
		return -1;
	}
	if(pthread_attr_setstacksize(attr, stackSize))
	{
		fprintf(stderr, "Error: unable to set stack size to %d\n", stackSize);
		return -1;
	}
	setup_sched_parameters(attr, prio);
	return 0;
}
static int create_and_start_thread(pthread_t* task, const char* taskName, int priority, int stackSize, pthread_callback_t* callback, void* arg)
{
	pthread_attr_t attr;
	if(int ret = setup_thread_attributes(&attr, stackSize, priority))
	{
		return ret;
	}
	if(int ret = __wrap_pthread_create(task, &attr, callback, arg))
	{
		return ret;
	}
	pthread_setname_np(*task, taskName);
	pthread_attr_destroy(&attr);
	return 0;
}
#endif

#ifdef __cplusplus
}
#endif
