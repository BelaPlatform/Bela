/***** Aux_Task.h *****/
#ifndef __Aux_Task_H_INCLUDED__
#define __Aux_Task_H_INCLUDED__ 

#include <Aux_common.h>
#include <fcntl.h>
#include <stdlib.h>

template<class T = const char>
class Aux_Task{
	public:
		Aux_Task(){}
		
		void create(const char* _name, void(*_callback)(T* buffer, int size)){
			name = _name;
			callback = _callback;
			rt_task_create(&(this->task), name, 0, 0, T_JOINABLE);
			rt_task_start(&(this->task), Aux_Task::loop, this);
			
			char p_name [30];
			sprintf (p_name, "p_%s", name);
			rt_pipe_create(&(this->pipe), p_name, P_MINOR_AUTO, AUX_POOL_SIZE);
		}
		
		void schedule(T* buf, size_t size){
			rt_pipe_write(&pipe, (void*)buf, size*sizeof(T), P_NORMAL);
		}
		void schedule(const char* str){
			schedule((T*)str, strlen(str));
		}
		void schedule(){
			T tmp = (T)0;
			schedule(&tmp, 1);
		}
		
		void cleanup(){
			close(pipe_fd);
		}
		
	private:
		RT_TASK task;
		RT_PIPE pipe;
		
		const char* name;
		int pipe_fd;
		
		void (*callback)(T* buffer, int size);
		
		static void loop(void* ptr){
			Aux_Task *instance = (Aux_Task*)ptr;
			rt_print_auto_init(1);
			
			char rtp_name [50];
			sprintf (rtp_name, "/proc/xenomai/registry/rtipc/xddp/p_%s", instance->name);
			
			instance->pipe_fd = open(rtp_name, O_RDWR);
			if (instance->pipe_fd < 0){
				printf("could not open pipe %i\n", instance->pipe_fd);
				return;
			}
			
			// printf("starting loop\n");

			void* buf = malloc(AUX_MAX_BUFFER_SIZE/sizeof(T));
			while(!gShouldStop){
				ssize_t size = read(instance->pipe_fd, (void*)buf, AUX_MAX_BUFFER_SIZE/sizeof(T));
				instance->callback((T*)buf, size/sizeof(float));
			}
			free(buf);

			instance->cleanup();
		}
};

#endif
