/***** AuxTaskRT.cpp *****/
#include <AuxTaskRT.h>
#include "../include/xenomai_wraps.h"
#include <Bela.h>
#include <stdlib.h>

extern int volatile gRTAudioVerbose;

bool AuxTaskRT::shouldStop(){
	return (gShouldStop || lShouldStop);
}

void AuxTaskRT::create(std::string _name, std::function<void()> callback, int _priority){
	name = _name;
	priority = _priority;
	empty_callback = callback;
	mode = 0;
	__create();
}
void AuxTaskRT::create(std::string _name, std::function<void(std::string str)> callback, int _priority){
	name = _name;
	priority = _priority;
	str_callback = callback;
	mode = 1;
	__create();
}
void AuxTaskRT::create(std::string _name, std::function<void(void* buf, int size)> callback, int _priority){
	name = _name;
	priority = _priority;
	buf_callback = callback;
	mode = 2;
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
	if (int ret = rt_task_start(&task, AuxTaskRT::thread_func, this))
#endif
#ifdef XENOMAI_SKIN_posix
	if(int ret = create_and_start_thread(&thread, name.c_str(), priority, stackSize, (pthread_callback_t*)AuxTaskRT::thread_func, this))
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
		if(!shouldStop()) fprintf(stderr, "Unable to send message to queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
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
	lShouldStop = true;
#ifdef XENOMAI_SKIN_native
	rt_task_delete(&task);
	rt_queue_delete(&queue);
#endif
#ifdef XENOMAI_SKIN_posix
	// unblock and join thread
	schedule();
	int ret = __wrap_pthread_join(thread, NULL);
	if (ret < 0){
		fprintf(stderr, "AuxTaskNonRT %s: unable to join thread: (%i) %s\n", name.c_str(), ret, strerror(ret));
	}
	
	ret = __wrap_mq_close(queueDesc);
	if(ret)
	{
		fprintf(stderr, "Error closing queueDesc: %d %s\n", errno, strerror(errno));
	}
	ret = __wrap_mq_unlink(queueName.c_str());
	if(ret)
	{
		fprintf(stderr, "Error unlinking queue: %d %s\n", errno, strerror(errno));
	}
#endif
}

void AuxTaskRT::empty_loop(){
#ifdef XENOMAI_SKIN_native
	while(!shouldStop()){
		void* buf;
		rt_queue_receive(&queue, &buf, TM_INFINITE);
		if (!shouldStop())
			empty_callback();
		rt_queue_free(&queue, buf);
	}
#endif
#ifdef XENOMAI_SKIN_posix
	char* buffer = (char*)malloc(AUX_RT_POOL_SIZE);
	while(!shouldStop())
	{
		unsigned int prio;
		ssize_t ret = __wrap_mq_receive(queueDesc, buffer, AUX_RT_POOL_SIZE, &prio);
		if(ret < 0)
		{
			if(!shouldStop()) fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
			return;
		}
		if(!shouldStop()){
			empty_callback();
		}
	}
	free(buffer);
#endif
}
void AuxTaskRT::str_loop(){
#ifdef XENOMAI_SKIN_native
	while(!shouldStop()){
		void* buf;
		rt_queue_receive(&queue, &buf, TM_INFINITE);
		if(!shouldStop())
			str_callback((std::string)buf);
		rt_queue_free(&queue, buf);
	}
#endif
#ifdef XENOMAI_SKIN_posix
	char* buffer = (char*)malloc(AUX_RT_POOL_SIZE);
	while(!shouldStop())
	{
		unsigned int prio;
		ssize_t ret = __wrap_mq_receive(queueDesc, buffer, AUX_RT_POOL_SIZE, &prio);
		if(ret < 0)
		{
			if(!shouldStop()) fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
			return;
		}
		if(!shouldStop())
			str_callback((std::string)buffer);
	}
	free(buffer);
#endif
}
void AuxTaskRT::buf_loop(){
#ifdef XENOMAI_SKIN_native
	while(!shouldStop()){
		void* buf;
		ssize_t size = rt_queue_receive(&queue, &buf, TM_INFINITE);
		if(!shouldStop())
			buf_callback((void*)buf, size);
		rt_queue_free(&queue, buf);
	}
#endif
#ifdef XENOMAI_SKIN_posix
	char* buffer = (char*)malloc(AUX_RT_POOL_SIZE);
	while(!shouldStop())
	{
		unsigned int prio;
		ssize_t ret = __wrap_mq_receive(queueDesc, buffer, AUX_RT_POOL_SIZE, &prio);
		if(ret < 0)
		{
			if(!shouldStop()) fprintf(stderr, "Unable to receive message from queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
			return;
		}
		if(!shouldStop())
			buf_callback((void*)buffer, ret);
	}
	free(buffer);
#endif
}

void AuxTaskRT::thread_func(void* ptr){
	AuxTaskRT *instance = (AuxTaskRT*)ptr;
#ifdef XENOMAI_SKIN_native
	rt_print_auto_init(1);
#endif
	if (gRTAudioVerbose)
		printf("AuxTaskRT %s starting\n", instance->name.c_str());
	if (instance->mode == 0){
		instance->empty_loop();
	} else if (instance->mode == 1){
		instance->str_loop();
	} else if (instance->mode == 2){
		instance->buf_loop();
	}
	if (gRTAudioVerbose)
		printf("AuxTaskRT %s exiting\n", instance->name.c_str());
}
