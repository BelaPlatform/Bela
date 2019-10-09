/***** AuxTaskNonRT.cpp *****/
#include "../include/Bela.h"
#include <AuxTaskNonRT.h>
#include "../include/xenomai_wraps.h"
#include <fcntl.h>
#include <stdlib.h>
#include <errno.h>

extern int volatile gRTAudioVerbose;

bool AuxTaskNonRT::shouldStop(){
	return (gShouldStop || lShouldStop);
}

void AuxTaskNonRT::create(std::string _name, std::function<void()> callback){
	name = _name;
	empty_callback = callback;
	mode = 0;
	__create();
}
void AuxTaskNonRT::create(std::string _name, std::function<void(std::string str)> callback){
	name = _name;
	str_callback = callback;
	mode = 1;
	__create();
}
void AuxTaskNonRT::create(std::string _name, std::function<void(void* buf, int size)> callback){
	name = _name;
	buf_callback = callback;
	mode = 2;
	__create();
}

void AuxTaskNonRT::__create(){
	
	// create the xenomai task
	int priority = 0;
	int stackSize = 65536 * 4;
#ifdef XENOMAI_SKIN_native //posix skin does evertything in one go below
	if (int ret = rt_task_create(&task, name.c_str(), stackSize, priority, T_JOINABLE))
	{
		fprintf(stderr, "Unable to create AuxTaskNonRT %s: %i\n", name.c_str(), ret);
		return;
	}
#endif

	// create an rt_pipe
	std::string p_name = "p_" + name;
#ifdef XENOMAI_SKIN_native
	rt_pipe_delete(&pipe);
	int ret = rt_pipe_create(&pipe, p_name.c_str(), P_MINOR_AUTO, 0);
	if(ret < 0)
#endif
#ifdef XENOMAI_SKIN_posix
	int pipeSize = 65536 * 10;
	int ret = createXenomaiPipe(p_name.c_str(), pipeSize);
	pipeSocket = ret;
	if(ret <= 0)
#endif
	{
		fprintf(stderr, "Unable to create AuxTaskNonRT %s pipe %s: (%i) %s\n", name.c_str(), p_name.c_str(), ret, strerror(ret));
		return;
	}
	
	// start the xenomai task
#ifdef XENOMAI_SKIN_native
	if (int ret = rt_task_start(&task, AuxTaskNonRT::thread_func, this))
#endif
#ifdef XENOMAI_SKIN_posix
	if(int ret = create_and_start_thread(&thread, name.c_str(), priority, stackSize, (pthread_callback_t*)AuxTaskNonRT::thread_func, this))
#endif
	{
		fprintf(stderr, "Unable to start AuxTaskNonRT %s: %i, %s\n", name.c_str(), ret, strerror(ret));
		return;
	}
}

int AuxTaskNonRT::schedule(void* ptr, size_t size){
#ifdef XENOMAI_SKIN_native
	int ret = rt_pipe_write(&pipe, ptr, size, P_NORMAL);
#endif
#ifdef XENOMAI_SKIN_posix
	int ret = __wrap_sendto(pipeSocket, ptr, size, 0, NULL, 0);
#endif
	if(ret < 0)
	{
		rt_fprintf(stderr, "Error while sending to pipe from %s: (%d) %s (size: %d)\n", name.c_str(), errno, strerror(errno), size);
		return errno;
	}
	return 0;
}
int AuxTaskNonRT::schedule(const char* str){
	return schedule((void*)str, strlen(str));
}
int AuxTaskNonRT::schedule(){
	char t = 0;
	return schedule((void*)&t, 1);
}

void AuxTaskNonRT::cleanup(){
	lShouldStop = true;
#ifdef XENOMAI_SKIN_native
	rt_task_delete(&task);
	rt_pipe_delete(&pipe);
#endif
#ifdef XENOMAI_SKIN_posix
	// unblock and join thread
	schedule();
	int ret = __wrap_pthread_join(thread, NULL);
	if (ret < 0){
		fprintf(stderr, "AuxTaskNonRT %s: unable to join thread: (%i) %s\n", name.c_str(), ret, strerror(ret));
	}
	ret = __wrap_close(pipeSocket);
	if(ret)
	{
		fprintf(stderr, "Error closing pipeSocket: %d %s\n", errno, strerror(errno));
	}
	ret = close(pipe_fd);
	if(ret)
	{
		fprintf(stderr, "Error closing pipe_fd: %d %s\n", errno, strerror(errno));
	}
#endif
}

int AuxTaskNonRT::openPipe(){
#if XENOMAI_SKIN_posix || XENOMAI_MAJOR == 3
	std::string outPipeNameTemplateString = "/proc/xenomai/registry/rtipc/xddp/p_";
#else
	std::string outPipeNameTemplateString = "/proc/xenomai/registry/native/pipes/p_";
#endif
	std::string rtp_name = outPipeNameTemplateString + name;
	pipe_fd = open(rtp_name.c_str(), O_RDWR);
	if (pipe_fd < 0){
		fprintf(stderr, "AuxTaskNonRT %s: could not open pipe %s: (%i) %s\n", name.c_str(), rtp_name.c_str(),  errno, strerror(errno));
		return -1;
	}
	return 0;
}

void AuxTaskNonRT::empty_loop(){
	void* buf = malloc(1);
	while(!shouldStop()){
		read(pipe_fd, buf, 1);
		if (shouldStop())
			break;
		empty_callback();
	}
	free(buf);
}
void AuxTaskNonRT::str_loop(){
	void* buf = malloc(AUX_MAX_BUFFER_SIZE);
	memset(buf, 0, AUX_MAX_BUFFER_SIZE);
	while(!shouldStop()){
		ssize_t size = read(pipe_fd, buf, AUX_MAX_BUFFER_SIZE);
		if (shouldStop())
			break;
		str_callback(std::string((const char*)buf));
		memset(buf, 0, size);
	}
	free(buf);
}
void AuxTaskNonRT::buf_loop(){
	void* buf = malloc(AUX_MAX_BUFFER_SIZE);
	memset(buf, 0, AUX_MAX_BUFFER_SIZE);
	while(!shouldStop()){
		ssize_t size = read(pipe_fd, buf, AUX_MAX_BUFFER_SIZE);
		if (shouldStop())
			break;
		buf_callback(buf, size);
		memset(buf, 0, size);
	}
	free(buf);
}

void AuxTaskNonRT::thread_func(void* ptr){
	AuxTaskNonRT *instance = (AuxTaskNonRT*)ptr;
	if (instance->openPipe() < 0){
		fprintf(stderr, "Aborting AuxTaskNonRT %s\n", instance->name.c_str());
		return;
	}
	if (gRTAudioVerbose)
		printf("AuxTaskNonRT %s starting\n", instance->name.c_str());
	if (instance->mode == 0){
		instance->empty_loop();
	} else if (instance->mode == 1){
		instance->str_loop();
	} else if (instance->mode == 2){
		instance->buf_loop();
	}
	if (gRTAudioVerbose)
		printf("AuxTaskNonRT %s exiting\n", instance->name.c_str());
}
