/***** Aux_Task.h *****/
#ifndef __Aux_Task_H_INCLUDED__
#define __Aux_Task_H_INCLUDED__ 

#include <native/task.h>
#include <native/pipe.h>

#define AUX_MAX_BUFFER_SIZE 500000

class Aux_Task{
	public:
		Aux_Task(){}
		
		void create(const char* _name, void(*_callback)());
		void create(const char* _name, void(*_callback)(const char* str));
		void create(const char* _name, void(*_callback)(void* buf, int size));
		void create(const char* _name, void(*_callback)(void* ptr), void* _pointer);
		
		void schedule(void* ptr, size_t size);
		void schedule(const char* str);
		void schedule();
		
		void cleanup();
		
	private:
		RT_TASK task;
		RT_PIPE pipe;
		
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
		
		void empty_loop();
		void str_loop();
		void buf_loop();
		void ptr_loop();
		
		static void loop(void* ptr);
};

#endif
