#pragma once

#ifdef __cplusplus
extern "C" {
#endif
#include <pthread.h>
#include <mqueue.h>
#include <sys/socket.h>

// Forward declare wrapped versions of POSIX calls.
// if BELA_RT_WRAP is __WRAP, then at link time, Xenomai's libcobalt will provide implementations for these
int BELA_RT_WRAP(nanosleep(const struct timespec *req, struct timespec *rem));
int BELA_RT_WRAP(pthread_create(pthread_t *thread, const pthread_attr_t *attr, void *(*start_routine) (void *), void *arg));
int BELA_RT_WRAP(pthread_setschedparam(pthread_t thread, int policy, const struct sched_param *param));
int BELA_RT_WRAP(pthread_getschedparam(pthread_t thread, int *policy, struct sched_param *param));
int BELA_RT_WRAP(pthread_yield(void));

int BELA_RT_WRAP(pthread_mutex_init(pthread_mutex_t *mutex, const pthread_mutexattr_t *attr));
int BELA_RT_WRAP(pthread_mutex_destroy(pthread_mutex_t *mutex));
int BELA_RT_WRAP(pthread_mutex_lock(pthread_mutex_t *mutex));
int BELA_RT_WRAP(pthread_mutex_trylock(pthread_mutex_t *mutex));
int BELA_RT_WRAP(pthread_mutex_unlock(pthread_mutex_t *mutex));

int BELA_RT_WRAP(pthread_cond_destroy(pthread_cond_t *cond));
int BELA_RT_WRAP(pthread_cond_init(pthread_cond_t *cond, const pthread_condattr_t *attr));
int BELA_RT_WRAP(pthread_cond_signal(pthread_cond_t *cond));
int BELA_RT_WRAP(pthread_cond_wait(pthread_cond_t *cond, pthread_mutex_t *mutex));

int BELA_RT_WRAP(socket(int protocol_family, int socket_type, int protocol));
int BELA_RT_WRAP(setsockopt(int fd, int level, int optname, const void *optval, socklen_t optlen));
int BELA_RT_WRAP(bind(int fd, const struct sockaddr *my_addr, socklen_t addrlen));
ssize_t BELA_RT_WRAP(sendto(int fd, const void *buf, size_t len, int flags, const struct sockaddr *to, socklen_t tolen));

mqd_t BELA_RT_WRAP(mq_open(const char *name, int oflags, ...));
int BELA_RT_WRAP(mq_close(mqd_t mqdes));
ssize_t BELA_RT_WRAP(mq_receive(mqd_t mqdes, char *msg_ptr, size_t msg_len, unsigned *msg_prio));
int BELA_RT_WRAP(mq_send(mqd_t mqdes, const char *msg_ptr, size_t msg_len, unsigned msg_prio));
int BELA_RT_WRAP(mq_timedsend(mqd_t mqdes, const char *msg_ptr, size_t msg_len, unsigned int msg_prio, const struct timespec *abs_timeout));
int BELA_RT_WRAP(mq_unlink(const char *name));

int BELA_RT_WRAP(pthread_join(pthread_t thread, void **retval));
int BELA_RT_WRAP(pthread_attr_init(pthread_attr_t *attr));
int BELA_RT_WRAP(sched_get_priority_max(int policy));
int BELA_RT_WRAP(open(const char *pathname, int flags, ...));
#ifdef __arm__
int BELA_RT_WRAP(ioctl(int fd, unsigned int request, ...));
#else
int BELA_RT_WRAP(ioctl(int fd, unsigned long int request, ...)) __THROW;
#endif

typedef long long int time_ns_t;
typedef void *(pthread_callback_t)(void *);

int task_sleep_ns(long long int timens);

void setup_sched_parameters(pthread_attr_t *attr, int prio);

int set_thread_stack_and_priority(pthread_attr_t *attr, int stackSize, int prio);

int create_and_start_thread(pthread_t* task, const char* taskName, int priority, int stackSize, cpu_set_t* cpuset, pthread_callback_t* callback, void* arg);

int createBelaRtPipe(const char* portName, size_t poolsz);

void Bela_initRtBackend();

bool turnIntoRtThread();

void initializeRt();

#ifdef __cplusplus
}
#endif
