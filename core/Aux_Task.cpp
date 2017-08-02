/***** Aux_Task.cpp *****/
#include <Aux_Task.h>
#include <Bela.h>
#include <fcntl.h>
#include <stdlib.h>
#include <errno.h>

void Aux_Task::create(const char* _name, void(*_callback)()){
	name = _name;
	empty_callback = _callback;
	mode = 0;
	__create();
}
void Aux_Task::create(const char* _name, void(*_callback)(const char* str)){
	name = _name;
	str_callback = _callback;
	mode = 1;
	__create();
}
void Aux_Task::create(const char* _name, void(*_callback)(void* buf, int size)){
	name = _name;
	buf_callback = _callback;
	mode = 2;
	__create();
}
void Aux_Task::create(const char* _name, void(*_callback)(void* ptr), void* _pointer){
	name = _name;
	ptr_callback = _callback;
	pointer = _pointer;
	mode = 3;
	__create();
}

void Aux_Task::__create(){
	// create the xenomai task
	if (int ret = rt_task_create(&task, name, 0, 0, T_JOINABLE)){
		fprintf(stderr, "Unable to create Aux_Task %s: %i\n", name, ret);
		return;
	}
	// create an rt_pipe
	char p_name [30];
	sprintf (p_name, "p_%s", name);
	if (int ret = rt_pipe_create(&pipe, p_name, P_MINOR_AUTO, 0)){
		fprintf(stderr, "Unable to create Aux_Task %s pipe: %i\n", name, ret);
		return;
	}
	// start the xenomai task
	if (int ret = rt_task_start(&task, Aux_Task::loop, this)){
		fprintf(stderr, "Unable to start Aux_Task %s: %i\n", name, ret);
		return;
	}
}

void Aux_Task::schedule(void* ptr, size_t size){
	rt_pipe_write(&pipe, ptr, size, P_NORMAL);
}
void Aux_Task::schedule(const char* str){
	schedule((void*)str, strlen(str));
}
void Aux_Task::schedule(){
	char t = 0;
	schedule((void*)&t, 1);
}

void Aux_Task::cleanup(){
	close(pipe_fd);
	rt_task_delete(&task);
	rt_pipe_delete(&pipe);
}

void Aux_Task::openPipe(){
	char rtp_name [50];
	sprintf (rtp_name, "/proc/xenomai/registry/rtipc/xddp/p_%s", name);
	pipe_fd = open(rtp_name, O_RDWR);
	if (pipe_fd < 0){
		fprintf(stderr, "Aux_Task %s: could not open pipe: %i\n", name, errno);
		return;
	}
}

void Aux_Task::empty_loop(){
	void* buf = malloc(1);;
	while(!gShouldStop){
		read(pipe_fd, buf, 1);
		empty_callback();
	}
	free(buf);
}
void Aux_Task::str_loop(){
	void* buf = malloc(AUX_MAX_BUFFER_SIZE);
	while(!gShouldStop){
		read(pipe_fd, buf, AUX_MAX_BUFFER_SIZE);
		str_callback((const char*)buf);
	}
	free(buf);
}
void Aux_Task::buf_loop(){
	void* buf = malloc(AUX_MAX_BUFFER_SIZE);
	while(!gShouldStop){
		ssize_t size = read(pipe_fd, buf, AUX_MAX_BUFFER_SIZE);
		buf_callback(buf, size);
	}
	free(buf);
}
void Aux_Task::ptr_loop(){
	void* buf = malloc(1);
	while(!gShouldStop){
		read(pipe_fd, buf, 1);
		ptr_callback(pointer);
	}
	free(buf);
}

void Aux_Task::loop(void* ptr){
	Aux_Task *instance = (Aux_Task*)ptr;
	instance->openPipe();
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