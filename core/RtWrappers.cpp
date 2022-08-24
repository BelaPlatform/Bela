#include "../include/RtWrappers.h"
#include <stdio.h>
#include <string.h>
#include <time.h>

int task_sleep_ns(long long int timens)
{
	struct timespec req;
	req.tv_sec = timens/1000000000;
	req.tv_nsec = timens - req.tv_sec * 1000000000;
	return BELA_RT_WRAP(nanosleep(&req, NULL));
}

#include <error.h>

// got this from xenomai-3/testsuite/latency/latency.c
void setup_sched_parameters(pthread_attr_t *attr, int prio)
{
	struct sched_param p;
	int ret;
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

int set_thread_stack_and_priority(pthread_attr_t *attr, int stackSize, int prio)
{
	if(pthread_attr_setdetachstate(attr, PTHREAD_CREATE_JOINABLE))
	{
		fprintf(stderr, "Error: unable to set detachstate\n");
		return -1;
	}
	if(stackSize <= 0)
	{
		stackSize = 65536;
	}
	if(pthread_attr_setstacksize(attr, stackSize))
	{
		fprintf(stderr, "Error: unable to set stack size to %d\n", stackSize);
		return -1;
	}
	setup_sched_parameters(attr, prio);
	return 0;
}

int create_and_start_thread(pthread_t* task, const char* taskName, int priority, int stackSize, cpu_set_t* req_cpuset, pthread_callback_t* callback, void* arg)
{
	pthread_attr_t attr;
	if(BELA_RT_WRAP(pthread_attr_init(&attr)))
	{
		fprintf(stderr, "Error: unable to init thread attributes\n");
		return -1;
	}
	if(int ret = set_thread_stack_and_priority(&attr, stackSize, priority))
	{
		return ret;
	}
	cpu_set_t* cpuset = req_cpuset;
	cpu_set_t our_cpuset;
	if(!cpuset || (cpuset && !CPU_COUNT(cpuset)))
	{
		// not sure what is supposed to happen if you have an empty cpu_set_t
		// so - and also as a default in case a NULL is passed in - we set all CPUs in the set
		cpuset = &our_cpuset;
		CPU_ZERO(cpuset);
		for(unsigned int n = 0; n < CPU_SETSIZE; ++n)
			CPU_SET(n, cpuset);
	}
	if(int ret = pthread_attr_setaffinity_np(&attr, sizeof(*cpuset), cpuset))
	{
		return ret;
	}
	if(int ret = BELA_RT_WRAP(pthread_create(task, &attr, callback, arg)))
	{
		return ret;
	}
	BELA_RT_WRAP(pthread_setname_np(*task, taskName));
	// check that effective parameters match the ones we requested
	//pthread_attr_t actualAttr;
	//pthread_getattr_np(*task, &actualAttr);
	//size_t stk;
	//pthread_attr_getstacksize(&actualAttr, &stk);
	//printf("measured stack: %d, requested stack: %d\n", stk, stackSize);

	pthread_attr_destroy(&attr);
	return 0;
}

#ifdef __COBALT__
#include <rtdm/ipc.h>
#endif // __COBALT__
int createBelaRtPipe(const char* portName, int poolsz)
#ifdef __COBALT__
// from xenomai-3/demo/posix/cobalt/xddp-echo.c
{
	Bela_initRtBackend();
	/*
	 * Get a datagram socket to bind to the RT endpoint. Each
	 * endpoint is represented by a port number within the XDDP
	 * protocol namespace.
	 */
	int s = BELA_RT_WRAP(socket(AF_RTIPC, SOCK_DGRAM, IPCPROTO_XDDP));
	if (s < 0) {
		fprintf(stderr, "Failed call to socket: %d %s\n", errno, strerror(errno));
		return -1;
	}

	/*
	 * Set a port label. This name will be registered when
	 * binding
	 */
	struct rtipc_port_label plabel;
	strcpy(plabel.label, portName);
	int ret = BELA_RT_WRAP(setsockopt(s, SOL_XDDP, XDDP_LABEL,
			 &plabel, sizeof(plabel)));
	if(ret)
	{
		fprintf(stderr, "Failed call to setsockopt SOL_XDDP XDDP_LABEL: %d %s\n", errno, strerror(errno));
		return -1;
	}

	/*
	 * Set a local pool for the RT endpoint. Memory needed to
	 * convey datagrams will be pulled from this pool, instead of
	 * Xenomai's system pool.
	 */
	if(poolsz == 0)
		poolsz = 16384; /* bytes */
	ret = BELA_RT_WRAP(setsockopt(s, SOL_XDDP, XDDP_POOLSZ,
			 &poolsz, sizeof(poolsz)));
	if(ret)
	{
		fprintf(stderr, "Failed call to setsockopt SOL_XDDP XDDP_POOLSZ: %d %s\n", errno, strerror(errno));
		return -1;
	}

	/*
	 * Bind the socket to the port, to setup a proxy to channel
	 * traffic to/from the Linux domain.
	 */
	struct sockaddr_ipc saddr;
	memset(&saddr, 0, sizeof(saddr));
	saddr.sipc_family = AF_RTIPC;
	saddr.sipc_port = -1; // automatically assign port number
	ret = BELA_RT_WRAP(bind(s, (struct sockaddr *)&saddr, sizeof(saddr)));
	if (ret)
	{
		fprintf(stderr, "Failed call to bind: %d %s\n", errno, strerror(errno));
		return -1;
	}
	return s;
}
#else // __COBALT__
{
#warning BelaRtPipe unsupported without COBALT
	return -1;
}
#endif //__COBALT__

#include <Bela.h>
#define var_num_to_va_list(stream, fmt, dest) \
{ \
	ssize_t ret; \
	va_list ap; \
	va_start(ap, fmt); \
	ret = dest(stream, fmt, ap); \
	va_end(ap); \
	return ret; \
}

#ifndef __COBALT__
int rt_printf(const char *format, ...)
{
	var_num_to_va_list(stdout, format, rt_vfprintf)
}

int rt_fprintf(FILE *stream, const char *format, ...)
{
	var_num_to_va_list(stream, format, rt_vfprintf)
}

int rt_vprintf(const char *format, va_list ap)
{
	return rt_vfprintf(stdout, format, ap);
}

int rt_vfprintf(FILE *stream, const char *format, va_list ap)
{
	// this is the only one that needs to be implemented
	return vfprintf(stream, format, ap);
}
#endif // __COBALT__

int Bela_printf(const char *format, ...)
{
	var_num_to_va_list(stdout, format, Bela_vfprintf)
}
int Bela_fprintf(FILE *stream, const char *format, ...)
{
	var_num_to_va_list(stream, format, Bela_vfprintf)
}
int Bela_vprintf(const char *format, va_list ap)
{
	return Bela_vfprintf(stdout, format, ap);
}
int Bela_vfprintf(FILE *stream, const char *format, va_list ap)
{
	return rt_vfprintf(stream, format, ap);
}
