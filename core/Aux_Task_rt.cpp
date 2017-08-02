/***** Aux_Task_rt.cpp *****/
#include <Aux_Task_rt.h>
#include <Bela.h>

void Aux_Task_rt::create(const char* _name, void (*_callback)(), int _priority){
	name = _name;
	priority = _priority;
	empty_callback = _callback;
	mode = 0;
	__create();
}
void Aux_Task_rt::create(const char* _name, void (*_callback)(const char* str), int _priority){
	name = _name;
	priority = _priority;
	str_callback = _callback;
	mode = 1;
	__create();
}
void Aux_Task_rt::create(const char* _name, void (*_callback)(void* buf, int size), int _priority){
	name = _name;
	priority = _priority;
	buf_callback = _callback;
	mode = 2;
	__create();
}
void Aux_Task_rt::create(const char* _name, void (*_callback)(void* ptr), void* _pointer, int _priority){
	name = _name;
	priority = _priority;
	pointer = _pointer;
	ptr_callback = _callback;
	mode = 3;
	__create();
}

void Aux_Task_rt::__create(){
	
	// create the xenomai task
	if (int ret = rt_task_create(&task, name, 0, priority, T_JOINABLE)){
		fprintf(stderr, "Unable to create Aux_Task_rt %s: %i\n", name, ret);
		return;
	}
	
	// create a queue, with prefixed name
	char q_name [30];
	sprintf (q_name, "q_%s", name);
	if (int ret = rt_queue_create(&queue, q_name, AUX_RT_POOL_SIZE, Q_UNLIMITED, Q_PRIO)){
		fprintf(stderr, "Unable to create Aux_Task_rt %s queue: %i\n", name, ret);
		return;
	}
	
	// start the xenomai task
	if (int ret = rt_task_start(&task, Aux_Task_rt::loop, this)){
		fprintf(stderr, "Unable to start Aux_Task_rt %s: %i\n", name, ret);
		return;
	}
	
}

void Aux_Task_rt::schedule(void* buf, size_t size){
	void* q_buf = rt_queue_alloc(&queue, size);
	memcpy(q_buf, buf, size);
	rt_queue_send(&queue, q_buf, size, Q_NORMAL);
}
void Aux_Task_rt::schedule(const char* str){
	schedule((void*)str, strlen(str));
}
void Aux_Task_rt::schedule(){
	char t = 0;
	schedule(&t, 1);
}

void Aux_Task_rt::cleanup(){
	rt_task_delete(&task);
	rt_queue_delete(&queue);
}

void Aux_Task_rt::empty_loop(){
	while(!gShouldStop){
		void* buf;
		rt_queue_receive(&queue, &buf, TM_INFINITE);
		empty_callback();
		rt_queue_free(&queue, buf);
	}
}
void Aux_Task_rt::str_loop(){
	while(!gShouldStop){
		void* buf;
		rt_queue_receive(&queue, &buf, TM_INFINITE);
		str_callback((const char*)buf);
		rt_queue_free(&queue, buf);
	}
}
void Aux_Task_rt::buf_loop(){
	while(!gShouldStop){
		void* buf;
		ssize_t size = rt_queue_receive(&queue, &buf, TM_INFINITE);
		buf_callback((void*)buf, size);
		rt_queue_free(&queue, buf);
	}
}
void Aux_Task_rt::ptr_loop(){
	while(!gShouldStop){
		void* buf;
		rt_queue_receive(&queue, &buf, TM_INFINITE);
		ptr_callback(pointer);
		rt_queue_free(&queue, buf);
	}
}

void Aux_Task_rt::loop(void* ptr){
	Aux_Task_rt *instance = (Aux_Task_rt*)ptr;
	rt_print_auto_init(1);
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