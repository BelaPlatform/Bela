#include <stdio.h>
#include <rtdk.h>
#include <native/types.h>
#include <native/task.h>

#ifdef _XENOMAI_TRANK_RTDK_H
#define XENOMAI_MAJOR 3
#else
#define XENOMAI_MAJOR 2
#endif

int main(){
	const char* task_name = "bela-audio";
	RT_TASK audio;
	int ret = rt_task_bind(&audio, task_name, 0);
	if(ret > 0){
		fprintf(stderr, "An error occurred: %d. Task '%s' not running?", task_name);
		return ret;
	}
	RT_TASK_INFO info;
	rt_task_inquire(&audio, &info);
	int prio;
	int msw;
#if XENOMAI_MAJOR == 2
	prio = info.bprio;
	msw = info.modeswitches;
#elif XENOMAI_MAJOR == 3
	prio = info.prio;
	msw = info.stat.msw;
#else 
#error Xenomai version not supported
#endif
	printf("prio: %d\n", prio);
	printf("modeswitches: %d\n", msw);
	return 0;
}
