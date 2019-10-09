/***** AuxTaskNonRT.h *****/
#ifndef __AuxTaskNonRT_H_INCLUDED__
#define __AuxTaskNonRT_H_INCLUDED__ 

#ifdef XENOMAI_SKIN_native
#include <rtdk.h>
#include <native/task.h>
#include <native/pipe.h>
#endif

#ifdef XENOMAI_SKIN_posix
#include <pthread.h>
#endif

#include <string>
#include <functional>

#define AUX_MAX_BUFFER_SIZE 500000

class AuxTaskNonRT{
	public:
		AuxTaskNonRT(){}
		AuxTaskNonRT(std::string _name, std::function<void()> callback){ create(_name, callback); }
		AuxTaskNonRT(std::string _name, std::function<void(std::string str)> callback){ create(_name, callback); }
		AuxTaskNonRT(std::string _name, std::function<void(void* buf, int size)> callback){ create(_name, callback); }
		~AuxTaskNonRT(){ cleanup(); }
		
		void create(std::string _name, std::function<void()> callback);
		void create(std::string _name, std::function<void(std::string str)> callback);
		void create(std::string _name, std::function<void(void* buf, int size)> callback);
		
		int schedule(void* ptr, size_t size);
		int schedule(const char* str);
		int schedule();
		
	private:
		bool lShouldStop = false;
		bool shouldStop();
		void cleanup();
		
#ifdef XENOMAI_SKIN_native
		RT_TASK task;
		RT_PIPE pipe;
#endif
#ifdef XENOMAI_SKIN_posix
		pthread_t thread;
		int pipeSocket;
#endif
		
		std::string name;
		int pipe_fd;
		int mode;
		
		void __create();
		int openPipe();
		
		std::function<void()> empty_callback;
		std::function<void(std::string str)> str_callback;
		std::function<void(void* buf, int size)> buf_callback;
		
		void empty_loop();
		void str_loop();
		void buf_loop();
		
		static void thread_func(void* ptr);
};

#endif
