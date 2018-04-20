/***** AuxTaskRT.h *****/
#ifndef __Aux_Task_RT_H_INCLUDED__
#define __Aux_Task_RT_H_INCLUDED__ 

#include <Bela.h>
#include <string>
#include <functional>

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
		AuxTaskRT(){}
		AuxTaskRT(std::string _name, std::function<void()> callback){ create(_name, callback); }
		AuxTaskRT(std::string _name, std::function<void(std::string str)> callback){ create(_name, callback); }
		AuxTaskRT(std::string _name, std::function<void(void* buf, int size)> callback){ create(_name, callback); }
		~AuxTaskRT(){ cleanup(); }
		
		void create(std::string _name, std::function<void()> callback, int _priority = BELA_AUDIO_PRIORITY-5);
		void create(std::string _name, std::function<void(std::string str)> callback, int _priority = BELA_AUDIO_PRIORITY-5);
		void create(std::string _name, std::function<void(void* buf, int size)> callback, int _priority = BELA_AUDIO_PRIORITY-5);
		
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

		void __create();

		std::function<void()> empty_callback;
		std::function<void(std::string str)> str_callback;
		std::function<void(void* buf, int size)> buf_callback;
		
		void empty_loop();
		void str_loop();
		void buf_loop();
		
		static void thread_func(void* ptr);
};

#endif
