#ifdef __linux__
#include_next <mqueue.h>
#else
#include <sys/types.h>
#include <fcntl.h>
typedef int mqd_t;
struct mq_attr {
size_t mq_maxmsg;
size_t mq_msgsize;
unsigned int mq_flags;
};
#define my_dummy_func_mqd(name) static inline int name(mqd_t, ...) { return 0; }
#define my_dummy_func_char(name) static inline int name(const char*, ...) { return 0; }
my_dummy_func_mqd(mq_receive)
my_dummy_func_char(mq_unlink)
my_dummy_func_mqd(mq_send)
my_dummy_func_char(mq_open)
my_dummy_func_mqd(mq_close)
my_dummy_func_mqd(mq_getattr)
my_dummy_func_mqd(mq_timedreceive)
#undef my_dummy_func
#endif
