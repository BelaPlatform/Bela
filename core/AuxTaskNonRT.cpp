/***** AuxTaskNonRT.cpp *****/
#include "../include/Bela.h"
#include <AuxTaskNonRT.h>
#include "../include/xenomai_wraps.h"
#include <fcntl.h>
#include <stdlib.h>
#include <errno.h>

void AuxTaskNonRT::create(const char* _name, void(*_callback)()){
	name = _name;
	empty_callback = _callback;
	mode = 0;
	__create();
}
void AuxTaskNonRT::create(const char* _name, void(*_callback)(const char* str)){
	name = _name;
	str_callback = _callback;
	mode = 1;
	__create();
}
void AuxTaskNonRT::create(const char* _name, void(*_callback)(void* buf, int size)){
	name = _name;
	buf_callback = _callback;
	mode = 2;
	__create();
}
void AuxTaskNonRT::create(const char* _name, void(*_callback)(void* ptr), void* _pointer){
	name = _name;
	ptr_callback = _callback;
	pointer = _pointer;
	mode = 3;
	__create();
}

void AuxTaskNonRT::__create(){
	// create the xenomai task
	int priority = 0;
	int stackSize = 65536 * 4;
#ifdef XENOMAI_SKIN_native //posix skin does evertything in one go below
	if (int ret = rt_task_create(&task, name, stackSize, priority, T_JOINABLE))

	{
		fprintf(stderr, "Unable to create AuxTaskNonRT %s: %i\n", name, ret);
		return;
	}
#endif
	// create an rt_pipe
	char p_name [30];
	sprintf (p_name, "p_%s", name);
#ifdef XENOMAI_SKIN_native
	rt_pipe_delete(&pipe);
	int ret = rt_pipe_create(&pipe, p_name, P_MINOR_AUTO, 0);
	if(ret < 0)
#endif
#ifdef XENOMAI_SKIN_posix
	int pipeSize = 65536 * 10;
	int ret = createXenomaiPipe(p_name, pipeSize);
	pipeSocket = ret;
	if(ret <= 0)
#endif
	{
		fprintf(stderr, "Unable to create AuxTaskNonRT %s pipe %s: (%i) %s\n", name, p_name, ret, strerror(ret));
		return;
	}
	// start the xenomai task
#ifdef XENOMAI_SKIN_native
	if (int ret = rt_task_start(&task, AuxTaskNonRT::loop, this))
#endif
#ifdef XENOMAI_SKIN_posix
	if(int ret = create_and_start_thread(&thread, name, priority, stackSize, (pthread_callback_t*)AuxTaskNonRT::loop, this))
#endif
	{
		fprintf(stderr, "Unable to start AuxTaskNonRT %s: %i, %s\n", name, ret, strerror(ret));
		return;
	}
}

void AuxTaskNonRT::schedule(void* ptr, size_t size){
#ifdef XENOMAI_SKIN_native
	int ret = rt_pipe_write(&pipe, ptr, size, P_NORMAL);
#endif
#ifdef XENOMAI_SKIN_posix
	int ret = __wrap_sendto(pipeSocket, ptr, size, 0, NULL, 0);
#endif
	if(ret < 0)
	{
		rt_fprintf(stderr, "Error while sending to pipe from %s: (%d) %s (size: %d)\n", name, errno, strerror(errno), size);
	}
}
void AuxTaskNonRT::schedule(const char* str){
	schedule((void*)str, strlen(str));
}
void AuxTaskNonRT::schedule(){
	char t = 0;
	schedule((void*)&t, 1);
}

void AuxTaskNonRT::cleanup(){
	close(pipe_fd);
#ifdef XENOMAI_SKIN_native
	rt_task_delete(&task);
	rt_pipe_delete(&pipe);
#endif
#ifdef XENOMAI_SKIN_posix
	// TODO: someone needs to be done to terminate the tasks appropriately
	// Currently they are probably just hanging on the pipes
	// However the three lines below cause a segfault after the first time they are run
	// char ptr[1];
	// int ret = __wrap_sendto(pipeSocket, ptr, 1, 0, NULL, 0); // unblock the pipe
	// pthread_cancel(thread);
	// also we should join them!
#endif
}

void AuxTaskNonRT::openPipe(){
	char rtp_name [50];
#if XENOMAI_SKIN_posix || XENOMAI_MAJOR == 3
	char outPipeNameTemplateString[] = "/proc/xenomai/registry/rtipc/xddp/p_%s";
#else
	char outPipeNameTemplateString[] = "/proc/xenomai/registry/native/pipes/p_%s";
#endif
	sprintf (rtp_name, outPipeNameTemplateString, name);
	pipe_fd = open(rtp_name, O_RDWR);
	if (pipe_fd < 0){
		fprintf(stderr, "AuxTaskNonRT %s: could not open pipe %s: (%i) %s\n", name, rtp_name,  errno, strerror(errno));
		return;
	}
}

void AuxTaskNonRT::empty_loop(){
	void* buf = malloc(1);
	while(!gShouldStop){
		read(pipe_fd, buf, 1);
		empty_callback();
	}
	free(buf);
}
void AuxTaskNonRT::str_loop(){
	void* buf = malloc(AUX_MAX_BUFFER_SIZE);
	while(!gShouldStop){
		read(pipe_fd, buf, AUX_MAX_BUFFER_SIZE);
		str_callback((const char*)buf);
	}
	free(buf);
}
void AuxTaskNonRT::buf_loop(){
	void* buf = malloc(AUX_MAX_BUFFER_SIZE);
	while(!gShouldStop){
		ssize_t size = read(pipe_fd, buf, AUX_MAX_BUFFER_SIZE);
		buf_callback(buf, size);
	}
	free(buf);
}
void AuxTaskNonRT::ptr_loop(){
	void* buf = malloc(1);
	while(!gShouldStop){
		read(pipe_fd, buf, 1);
		ptr_callback(pointer);
	}
	free(buf);
}

void AuxTaskNonRT::loop(void* ptr){
	AuxTaskNonRT *instance = (AuxTaskNonRT*)ptr;
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
