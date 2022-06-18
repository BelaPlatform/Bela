/***** AuxTaskRT.cpp *****/
#include <AuxTaskRT.h>
#include "../include/xenomai_wraps.h"
#include <Bela.h>
#include <stdlib.h>

extern int volatile gRTAudioVerbose;

bool AuxTaskRT::shouldStop(){
	return (Bela_stopRequested() || lShouldStop);
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
	
	// create a queue, with prefixed name
	queueName = std::string("/q_") + name;
	struct mq_attr attr;
	attr.mq_maxmsg = 100; 
	attr.mq_msgsize = 100000;
	queueDesc = __wrap_mq_open(queueName.c_str(), O_CREAT | O_RDWR, 0644, &attr);
	if(queueDesc < 0)
	{
		fprintf(stderr, "Unable to open message queue %s: (%d) %s\n", queueName.c_str(), errno, strerror(errno));
		return;
	}
	
	// start the xenomai task
	if(int ret = create_and_start_thread(&thread, name.c_str(), priority, stackSize, (pthread_callback_t*)AuxTaskRT::thread_func, this))
	{
		fprintf(stderr, "Unable to start AuxTaskRT %s: %i\n", name.c_str(), ret);
		return;
	}
	
}

void AuxTaskRT::schedule(void* buf, size_t size){
	if(__wrap_mq_send(queueDesc, (char*)buf, size, 0))
	{
		if(!shouldStop()) fprintf(stderr, "Unable to send message to queue for task %s: (%d) %s\n", name.c_str(), errno, strerror(errno));
		return;
	}
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
}

void AuxTaskRT::empty_loop(){
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
}
void AuxTaskRT::str_loop(){
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
}
void AuxTaskRT::buf_loop(){
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
}

void AuxTaskRT::thread_func(void* ptr){
	AuxTaskRT *instance = (AuxTaskRT*)ptr;
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
