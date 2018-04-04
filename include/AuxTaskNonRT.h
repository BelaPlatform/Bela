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

#define AUX_MAX_BUFFER_SIZE 500000

class AuxTaskNonRT{
	public:
		AuxTaskNonRT(){}
		
		void create(const char* _name, void(*_callback)());
		void create(const char* _name, void(*_callback)(const char* str));
		void create(const char* _name, void(*_callback)(void* buf, int size));
		void create(const char* _name, void(*_callback)(void* ptr), void* _pointer);
		void create(const char* _name, void(*_callback)(void* ptr, void* buf, int size), void* _pointer);

		void schedule(void* ptr, size_t size);
		void schedule(const char* str);
		void schedule();
		
		void cleanup();
		
	private:
#ifdef XENOMAI_SKIN_native
		RT_TASK task;
		RT_PIPE pipe;
#endif
#ifdef XENOMAI_SKIN_posix
		pthread_t thread;
		int pipeSocket;
#endif
		
		const char* name;
		int pipe_fd;
		int mode;
		void* pointer;
		
		void __create();
		void openPipe();
		
		void (*empty_callback)();
		void (*str_callback)(const char* buffer);
		void (*buf_callback)(void* buf, int size);
		void (*ptr_callback)(void* ptr);
		void (*ptr_buf_callback)(void* ptr, void* buf, int size);
		
		void empty_loop();
		void str_loop();
		void buf_loop();
		void ptr_loop();
		void ptr_buf_loop();
		
		static void loop(void* ptr);
};

#endif
