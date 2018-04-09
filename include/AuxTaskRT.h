/***** AuxTaskRT.h *****/
#ifndef __Aux_Task_RT_H_INCLUDED__
#define __Aux_Task_RT_H_INCLUDED__ 

#include <Bela.h>
#include <string>

#ifdef XENOMAI_SKIN_native
#include <rtdk.h>
#include <native/task.h>
#include <native/queue.h>
#endif

#ifdef XENOMAI_SKIN_posix
#include <fcntl.h>           /* For O_* constants */
#include <sys/stat.h>        /* For mode constants */
#include <pthread.h>
#include <mqueue.h>
#endif

#define AUX_RT_POOL_SIZE 500000

class AuxTaskRT{
	public:
		AuxTaskRT();
		~AuxTaskRT();
		
		void create(std::string _name, void(*_callback)(), int _priority = BELA_AUDIO_PRIORITY-5);
		void create(std::string _name, void(*_callback)(const char* str), int _priority = BELA_AUDIO_PRIORITY-5);
		void create(std::string _name, void(*_callback)(void* buf, int size), int _priority = BELA_AUDIO_PRIORITY-5);
		void create(std::string _name, void(*_callback)(void* ptr), void* _pointer, int _priority = BELA_AUDIO_PRIORITY-5);
		void create(std::string _name, void(*_callback)(void* ptr, void* buf, int size), void* _pointer, int _priority = BELA_AUDIO_PRIORITY-5);
		
		void schedule(void* buf, size_t size);
		void schedule(const char* str);
		void schedule();
		
	private:
		bool lShouldStop = false;
		bool shouldStop();
		void cleanup();
		
#ifdef XENOMAI_SKIN_native
		RT_TASK task;
		RT_QUEUE queue;
#endif
#ifdef XENOMAI_SKIN_posix
		pthread_t thread;
		mqd_t queueDesc;
		std::string queueName;
#endif
		
		std::string name;
		int priority;
		int mode;
		void* pointer;
		
		void __create();

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
		
		static void thread_func(void* ptr);
};

#endif
