/***** AuxTaskRT.cpp *****/
#include <AuxTaskRT.h>
#include "../include/xenomai_wraps.h"
#include <Bela.h>
#include <stdlib.h>

void AuxTaskRT::create(std::string _name, void (*_callback)(), int _priority){
	name = _name;
	priority = _priority;
	empty_callback = _callback;
	mode = 0;
	__create();
}
void AuxTaskRT::create(std::string _name, void (*_callback)(const char* str), int _priority){
	name = _name;
	priority = _priority;
	str_callback = _callback;
	mode = 1;
	__create();
}
void AuxTaskRT::create(std::string _name, void (*_callback)(void* buf, int size), int _priority){
	name = _name;
	priority = _priority;
	buf_callback = _callback;
	mode = 2;
	__create();
}
void AuxTaskRT::create(std::string _name, void (*_callback)(void* ptr), void* _pointer, int _priority){
	name = _name;
	priority = _priority;
	pointer = _pointer;
	ptr_callback = _callback;
	mode = 3;
	__create();
}
void AuxTaskRT::create(std::string _name, void (*_callback)(void* ptr, void* buf, int size), void* _pointer, int _priority){
	name = _name;
	priority = _priority;
	pointer = _pointer;
	ptr_buf_callback = _callback;
	mode = 4;
	__create();
}

void AuxTaskRT::__create(){
	
	// create the xenomai task
	int stackSize = 0;
#ifdef XENOMAI_SKIN_native //posix skin does evertything in one go below
	if (int ret = rt_task_create(&task, name.c_str(), stackSize, priority, T_JOINABLE)){
		fprintf(stderr, "Unable to create AuxTaskRT %s: %i\n", name.c_str(), ret);
		return;
	}
#endif
	
	// create a queue, with prefixed name
	queueName = std::string("/q_") + name;
#ifdef XENOMAI_SKIN_native
	if (int ret = rt_queue_create(&queue, queueName.c_str(), AUX_RT_POOL_SIZE, Q_UNLIMITED, Q_PRIO))
	{
		fprintf(stderr, "Unable to create AuxTaskRT %s queue: %i\n", name.c_str(), ret);
		return;
	}
#endif 
#ifdef XENOMAI_SKIN_posix
	struct mq_attr attr;
	attr.mq_maxmsg = 100; 
	attr.mq_msgsize = 100000;
	queueDesc = __wrap_mq_open(queueName.c_str(), O_CREAT | O_RDWR, 0644, &attr);
	if(queueDesc < 0)
	{
		fprintf(stderr, "Unable to open message queue %s: (%d) %s\n", queueName.c_str(), errno, strerror(errno));
		return;
	}
#endif
	
	// start the xenomai task
#ifdef XENOMAI_SKIN_native
	if (int ret = rt_task_start(&task, AuxTaskRT::loop, this))
#endif
#ifdef XENOMAI_SKIN_posix
	if(int ret = create_and_start_thread(&thread, name.c_str(), priority, stackSize, (pthread_callback_t*)AuxTaskRT::loop, this))
#endif
	{
		fprintf(stderr, "Unable to start AuxTaskRT %s: %i\n", name.c_str(), ret);
		return;
	}
	
}

void AuxTaskRT::schedule(void* buf, size_t size){
#ifdef XENOMAI_SKIN_native
	void* q_buf = rt_queue_alloc(&queue, size);
	memcpy(q_buf, buf, size);
	rt_queue_send(&queue, q_buf, size, Q_NORMAL);
#endif
#ifdef XENOMAI_SKIN_posix
	if(__wrap_mq_send(queueDesc, (char*)buf, size, 0))
	{
		if(!gShouldStop) fprintf(stderr, "Unable to send message to queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
		return;
	}
#endif
}
void AuxTaskRT::schedule(const char* str){
	schedule((void*)str, strlen(str));
}
void AuxTaskRT::schedule(){
	char t = 0;
	schedule(&t, 1);
}

void AuxTaskRT::cleanup(){
#ifdef XENOMAI_SKIN_native
	rt_task_delete(&task);
	rt_queue_delete(&queue);
#endif
#ifdef XENOMAI_SKIN_posix
	//pthread_cancel(thread);
	__wrap_mq_close(queueDesc);
	__wrap_mq_unlink(queueName.c_str());
#endif
}

void AuxTaskRT::empty_loop(){
#ifdef XENOMAI_SKIN_native
	while(!gShouldStop){
		void* buf;
		rt_queue_receive(&queue, &buf, TM_INFINITE);
		empty_callback();
		rt_queue_free(&queue, buf);
	}
#endif
#ifdef XENOMAI_SKIN_posix
	char* buffer = (char*)malloc(AUX_RT_POOL_SIZE);
	while(!gShouldStop)
	{
		unsigned int prio;
		ssize_t ret = __wrap_mq_receive(queueDesc, buffer, AUX_RT_POOL_SIZE, &prio);
		if(ret < 0)
		{
			if(!gShouldStop) fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
			return;
		}
		empty_callback();
	}
	free(buffer);
#endif
}
void AuxTaskRT::str_loop(){
#ifdef XENOMAI_SKIN_native
	while(!gShouldStop){
		void* buf;
		rt_queue_receive(&queue, &buf, TM_INFINITE);
		str_callback((const char*)buf);
		rt_queue_free(&queue, buf);
	}
#endif
#ifdef XENOMAI_SKIN_posix
	char* buffer = (char*)malloc(AUX_RT_POOL_SIZE);
	while(!gShouldStop)
	{
		unsigned int prio;
		ssize_t ret = __wrap_mq_receive(queueDesc, buffer, AUX_RT_POOL_SIZE, &prio);
		if(ret < 0)
		{
			if(!gShouldStop) fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
			return;
		}
		str_callback((const char*)buffer);
	}
	free(buffer);
#endif
}
void AuxTaskRT::buf_loop(){
#ifdef XENOMAI_SKIN_native
	while(!gShouldStop){
		void* buf;
		ssize_t size = rt_queue_receive(&queue, &buf, TM_INFINITE);
		buf_callback((void*)buf, size);
		rt_queue_free(&queue, buf);
	}
#endif
#ifdef XENOMAI_SKIN_posix
	char* buffer = (char*)malloc(AUX_RT_POOL_SIZE);
	while(!gShouldStop)
	{
		unsigned int prio;
		ssize_t ret = __wrap_mq_receive(queueDesc, buffer, AUX_RT_POOL_SIZE, &prio);
		if(ret < 0)
		{
			if(!gShouldStop) fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
			return;
		}
		buf_callback((void*)buffer, ret);
	}
	free(buffer);
#endif
}
void AuxTaskRT::ptr_loop(){
#ifdef XENOMAI_SKIN_native
	while(!gShouldStop){
		void* buf;
		rt_queue_receive(&queue, &buf, TM_INFINITE);
		ptr_callback(pointer);
		rt_queue_free(&queue, buf);
	}
#endif
#ifdef XENOMAI_SKIN_posix
	char* buffer = (char*)malloc(AUX_RT_POOL_SIZE);
	while(!gShouldStop)
	{
		unsigned int prio;
		ssize_t ret = __wrap_mq_receive(queueDesc, buffer, AUX_RT_POOL_SIZE, &prio);
		if(ret < 0)
		{
			if(!gShouldStop) fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
			return;
		}
		ptr_callback(pointer);
	}
	free(buffer);
#endif
}
void AuxTaskRT::ptr_buf_loop(){
#ifdef XENOMAI_SKIN_native
	while(!gShouldStop){
		void* buf;
		ssize_t size = rt_queue_receive(&queue, &buf, TM_INFINITE);
		ptr_buf_callback(pointer, (void*)buf, size);
		rt_queue_free(&queue, buf);
	}
#endif
#ifdef XENOMAI_SKIN_posix
	char* buffer = (char*)malloc(AUX_RT_POOL_SIZE);
	while(!gShouldStop)
	{
		unsigned int prio;
		ssize_t ret = __wrap_mq_receive(queueDesc, buffer, AUX_RT_POOL_SIZE, &prio);
		if(ret < 0)
		{
			if(!gShouldStop) fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
			return;
		}
		ptr_buf_callback(pointer, (void*)buffer, ret);
	}
	free(buffer);
#endif
}

void AuxTaskRT::loop(void* ptr){
	AuxTaskRT *instance = (AuxTaskRT*)ptr;
#ifdef XENOMAI_SKIN_native
	rt_print_auto_init(1);
#endif
	if (instance->mode == 0){
		instance->empty_loop();
	} else if (instance->mode == 1){
		instance->str_loop();
	} else if (instance->mode == 2){
		instance->buf_loop();
	} else if (instance->mode == 3){
		instance->ptr_loop();
	} else if (instance->mode == 4){
		instance->ptr_buf_loop();
	}
}
