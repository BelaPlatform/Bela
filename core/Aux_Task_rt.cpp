/***** Aux_Task_rt.cpp *****/
#include <Aux_Task_rt.h>
#include "../include/xenomai_wraps.h"
#include <Bela.h>
#include <stdlib.h>

void Aux_Task_rt::create(const char* _name, void (*_callback)(), int _priority){
	name = _name;
	priority = _priority;
	empty_callback = _callback;
	mode = 0;
	__create();
}
void Aux_Task_rt::create(const char* _name, void (*_callback)(const char* str), int _priority){
	name = _name;
	priority = _priority;
	str_callback = _callback;
	mode = 1;
	__create();
}
void Aux_Task_rt::create(const char* _name, void (*_callback)(void* buf, int size), int _priority){
	name = _name;
	priority = _priority;
	buf_callback = _callback;
	mode = 2;
	__create();
}
void Aux_Task_rt::create(const char* _name, void (*_callback)(void* ptr), void* _pointer, int _priority){
	name = _name;
	priority = _priority;
	pointer = _pointer;
	ptr_callback = _callback;
	mode = 3;
	__create();
}

void Aux_Task_rt::__create(){
	
	// create the xenomai task
	int stackSize = 0;
#ifdef XENOMAI_SKIN_native //posix skin does evertything in one go below
	if (int ret = rt_task_create(&task, name, stackSize, priority, T_JOINABLE)){
		fprintf(stderr, "Unable to create Aux_Task_rt %s: %i\n", name, ret);
		return;
	}
#endif
	
	// create a queue, with prefixed name
	char q_name [30];
#ifdef XENOMAI_SKIN_native
	sprintf (q_name, "q_%s", name);
	if (int ret = rt_queue_create(&queue, q_name, AUX_RT_POOL_SIZE, Q_UNLIMITED, Q_PRIO))
	{
		fprintf(stderr, "Unable to create Aux_Task_rt %s queue: %i\n", name, ret);
		return;
	}
#endif 
#ifdef XENOMAI_SKIN_posix
	sprintf (q_name, "/q_%s", name);
	struct mq_attr attr;
	attr.mq_maxmsg = 100; 
	attr.mq_msgsize = 100000;
    	queueDesc = __wrap_mq_open(q_name, O_CREAT | O_RDWR, 0644, &attr);
	if(queueDesc < 0)
	{
		fprintf(stderr, "Unable to open message queue %s: (%d) %s\n", q_name, errno, strerror(errno));
		return;
	}
#endif
	
	// start the xenomai task
#ifdef XENOMAI_SKIN_native
	if (int ret = rt_task_start(&task, Aux_Task_rt::loop, this))
#endif
#ifdef XENOMAI_SKIN_posix
	if(int ret = create_and_start_thread(&thread, name, priority, stackSize, (pthread_callback_t*)Aux_Task_rt::loop, this))
#endif
	{
		fprintf(stderr, "Unable to start Aux_Task_rt %s: %i\n", name, ret);
		return;
	}
	
}

void Aux_Task_rt::schedule(void* buf, size_t size){
#ifdef XENOMAI_SKIN_native
	void* q_buf = rt_queue_alloc(&queue, size);
	memcpy(q_buf, buf, size);
	rt_queue_send(&queue, q_buf, size, Q_NORMAL);
#endif
#ifdef XENOMAI_SKIN_posix
	if(int ret = __wrap_mq_send(queueDesc, (char*)buf, size, 0))
	{
		fprintf(stderr, "Unable to send message to queue for task %s: (%d) %s\n", name, errno, strerror(errno));
		return;
	}
#endif
}
void Aux_Task_rt::schedule(const char* str){
	schedule((void*)str, strlen(str));
}
void Aux_Task_rt::schedule(){
	char t = 0;
	schedule(&t, 1);
}

void Aux_Task_rt::cleanup(){
#ifdef XENOMAI_SKIN_native
	rt_task_delete(&task);
	rt_queue_delete(&queue);
#endif
#ifdef XENOMAI_SKIN_posix
	//pthread_cancel(thread);
	__wrap_mq_close(queueDesc);
#warning should call mq_unlink(queueName);
#endif
}

void Aux_Task_rt::empty_loop(){
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
			fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name, errno, strerror(errno));
			return;
		}
		empty_callback();
	}
	free(buffer);
#endif
}
void Aux_Task_rt::str_loop(){
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
			fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name, errno, strerror(errno));
			return;
		}
		str_callback((const char*)buffer);
	}
	free(buffer);
#endif
}
void Aux_Task_rt::buf_loop(){
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
			fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name, errno, strerror(errno));
			return;
		}
		buf_callback((void*)buffer, ret);
	}
	free(buffer);
#endif
}
void Aux_Task_rt::ptr_loop(){
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
			fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name, errno, strerror(errno));
			return;
		}
		ptr_callback(pointer);
	}
	free(buffer);
#endif
}

void Aux_Task_rt::loop(void* ptr){
	Aux_Task_rt *instance = (Aux_Task_rt*)ptr;
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
	}
}
