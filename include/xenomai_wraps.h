#ifndef XENOMAI_WRAPS_H
#define XENOMAI_WRAPS_H

#include "Bela.h"
#include <time.h>
#include <stdio.h>
#include <string.h>

#ifdef __cplusplus
extern "C" {
#endif
#include <pthread.h>
#include <mqueue.h>
#include <sys/socket.h>

// Forward declare __wrap_ versions of POSIX calls.
// At link time, Xenomai will provide implementations for these
int __wrap_nanosleep(const struct timespec *req, struct timespec *rem);
int __wrap_pthread_create(pthread_t *thread, const pthread_attr_t *attr, void *(*start_routine) (void *), void *arg);
int __wrap_pthread_setschedparam(pthread_t thread, int policy, const struct sched_param *param);
int __wrap_pthread_getschedparam(pthread_t thread, int *policy, struct sched_param *param);
int __wrap_pthread_yield(void);

int __wrap_pthread_mutex_init(pthread_mutex_t *mutex, const pthread_mutexattr_t *attr);
int __wrap_pthread_mutex_destroy(pthread_mutex_t *mutex);
int __wrap_pthread_mutex_lock(pthread_mutex_t *mutex);
int __wrap_pthread_mutex_trylock(pthread_mutex_t *mutex);
int __wrap_pthread_mutex_unlock(pthread_mutex_t *mutex);

int __wrap_pthread_cond_destroy(pthread_cond_t *cond);
int __wrap_pthread_cond_init(pthread_cond_t *cond, const pthread_condattr_t *attr);
int __wrap_pthread_cond_signal(pthread_cond_t *cond);
int __wrap_pthread_cond_wait(pthread_cond_t *cond, pthread_mutex_t *mutex);

int __wrap_socket(int protocol_family, int socket_type, int protocol);
int __wrap_setsockopt(int fd, int level, int optname, const void *optval, socklen_t optlen);
int __wrap_bind(int fd, const struct sockaddr *my_addr, socklen_t addrlen);
ssize_t __wrap_sendto(int fd, const void *buf, size_t len, int flags, const struct sockaddr *to, socklen_t tolen);

mqd_t __wrap_mq_open(const char *name, int oflags, ...);
int __wrap_mq_close(mqd_t mqdes);
ssize_t __wrap_mq_receive(mqd_t mqdes, char *msg_ptr, size_t msg_len, unsigned *msg_prio);
int __wrap_mq_send(mqd_t mqdes, const char *msg_ptr, size_t msg_len, unsigned msg_prio);
int __wrap_mq_unlink(const char *name);

int __wrap_pthread_join(pthread_t thread, void **retval);
int __wrap_pthread_attr_init(pthread_attr_t *attr);
int __wrap_sched_get_priority_max(int policy);

#include <rtdm/ipc.h>
typedef long long int time_ns_t;
typedef void *(pthread_callback_t)(void *);

inline int task_sleep_ns(long long int timens)
{
	struct timespec req;
	req.tv_sec = timens/1000000000;
	req.tv_nsec = timens - req.tv_sec * 1000000000;
	return __wrap_nanosleep(&req, NULL);
}

#include <error.h>
//void error(int exitCode, int errno, char* message)
//{
	//fprintf(stderr, "Error during `%s`: %d %s\n", message, errno, strerror(errno));
	//exit(exitCode);
//}

// got this from xenomai-3/testsuite/latency/latency.c
inline void setup_sched_parameters(pthread_attr_t *attr, int prio)
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

inline int set_thread_stack_and_priority(pthread_attr_t *attr, int stackSize, int prio)
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
inline int create_and_start_thread(pthread_t* task, const char* taskName, int priority, int stackSize, pthread_callback_t* callback, void* arg)
{
	pthread_attr_t attr;
	if(__wrap_pthread_attr_init(&attr))
	{
		fprintf(stderr, "Error: unable to init thread attributes\n");
		return -1;
	}
	if(int ret = set_thread_stack_and_priority(&attr, stackSize, priority))
	{
		return ret;
	}
	if(int ret = __wrap_pthread_create(task, &attr, callback, arg))
	{
		return ret;
	}
	__wrap_pthread_setname_np(*task, taskName);
	// check that effective parameters match the ones we requested
	//pthread_attr_t actualAttr;
	//pthread_getattr_np(*task, &actualAttr);
	//size_t stk;
	//pthread_attr_getstacksize(&actualAttr, &stk);
	//printf("measured stack: %d, requested stack: %d\n", stk, stackSize);

	pthread_attr_destroy(&attr);
	return 0;
}
// from xenomai-3/demo/posix/cobalt/xddp-echo.c
inline int createXenomaiPipe(const char* portName, int poolsz)
{
	/*
	 * Get a datagram socket to bind to the RT endpoint. Each
	 * endpoint is represented by a port number within the XDDP
	 * protocol namespace.
	 */
	int s = __wrap_socket(AF_RTIPC, SOCK_DGRAM, IPCPROTO_XDDP);
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
	int ret = __wrap_setsockopt(s, SOL_XDDP, XDDP_LABEL,
			 &plabel, sizeof(plabel));
	if(ret)
	{
		fprintf(stderr, "Failed call to __wrap_setsockopt SOL_XDDP XDDP_LABEL: %d %s\n", errno, strerror(errno));
		return -1;
	}

	/*
	 * Set a local pool for the RT endpoint. Memory needed to
	 * convey datagrams will be pulled from this pool, instead of
	 * Xenomai's system pool.
	 */
	if(poolsz == 0)
		poolsz = 16384; /* bytes */
	ret = __wrap_setsockopt(s, SOL_XDDP, XDDP_POOLSZ,
			 &poolsz, sizeof(poolsz));
	if(ret)
	{
		fprintf(stderr, "Failed call to __wrap_setsockopt SOL_XDDP XDDP_POOLSZ: %d %s\n", errno, strerror(errno));
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
	ret = __wrap_bind(s, (struct sockaddr *)&saddr, sizeof(saddr));
	if (ret)
	{
		fprintf(stderr, "Failed call to __wrap_bind: %d %s\n", errno, strerror(errno));
		return -1;
	}
	return s;
}

#ifdef __cplusplus
}
#endif

#endif /* XENOMAI_WRAPS_H */
