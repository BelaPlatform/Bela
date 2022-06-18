/***** AuxTaskNonRT.cpp *****/
#include "../include/Bela.h"
#include <AuxTaskNonRT.h>
#include "../include/xenomai_wraps.h"
#include <fcntl.h>
#include <stdlib.h>
#include <errno.h>
#include <vector>

extern int volatile gRTAudioVerbose;

bool AuxTaskNonRT::shouldStop(){
	return (Bela_stopRequested() || lShouldStop);
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

	// sanitise: this could be used in paths to create pipes
	for(auto& c : name)
		if('/' == c || '\\' == c  || ':' == c || ' ' == c || '\t' == c || '\n' ==c || '\r' == c || '\0' == c)
			c = '_';
	
	// create the xenomai task
	int priority = 0;
	int stackSize = 65536 * 4;

	// create an rt_pipe
	std::string p_name = "p_" + name;
	int pipeSize = 65536 * 10;
	int ret = createXenomaiPipe(p_name.c_str(), pipeSize);
	pipeSocket = ret;
	if(ret <= 0)
	{
		fprintf(stderr, "Unable to create AuxTaskNonRT %s pipe %s: (%i) %s\n", name.c_str(), p_name.c_str(), ret, strerror(ret));
		return;
	}
	
	// start the xenomai task
	if(int ret = create_and_start_thread(&thread, name.c_str(), priority, stackSize, (pthread_callback_t*)AuxTaskNonRT::thread_func, this))
	{
		fprintf(stderr, "Unable to start AuxTaskNonRT %s: %i, %s\n", name.c_str(), ret, strerror(ret));
		return;
	}
}

int AuxTaskNonRT::schedule(const void* ptr, size_t size){
	int ret = __wrap_sendto(pipeSocket, ptr, size, 0, NULL, 0);
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
}

int AuxTaskNonRT::openPipe(){
	std::string outPipeNameTemplateString = "/proc/xenomai/registry/rtipc/xddp/p_";
	std::string rtp_name = outPipeNameTemplateString + name;
	pipe_fd = open(rtp_name.c_str(), O_RDWR);
	if (pipe_fd < 0){
		fprintf(stderr, "AuxTaskNonRT %s: could not open pipe %s: (%i) %s\n", name.c_str(), rtp_name.c_str(),  errno, strerror(errno));
		return -1;
	}
	return 0;
}

void AuxTaskNonRT::empty_loop(){
	char c;
	while(!shouldStop()){
		read(pipe_fd, &c, sizeof(c));
		if (shouldStop())
			break;
		empty_callback();
	}
}
void AuxTaskNonRT::str_loop(){
	std::vector<char> buffer(AUX_MAX_BUFFER_SIZE);
	char* buf = buffer.data();
	while(!shouldStop()){
		ssize_t size = read(pipe_fd, buf, AUX_MAX_BUFFER_SIZE);
		if (shouldStop())
			break;
		str_callback(std::string(buf));
		memset(buf, 0, size);
	}
}
void AuxTaskNonRT::buf_loop(){
	std::vector<char> buffer(AUX_MAX_BUFFER_SIZE);
	char* buf = buffer.data();
	while(!shouldStop()){
		ssize_t size = read(pipe_fd, buf, AUX_MAX_BUFFER_SIZE);
		if (shouldStop())
			break;
		buf_callback(buf, size);
		memset(buf, 0, size);
	}
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
