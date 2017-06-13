#include <stdio.h>
#include <rtdk.h>
#include <native/types.h>
#include <native/task.h>
#include <unistd.h>

#ifdef _XENOMAI_TRANK_RTDK_H
#define XENOMAI_MAJOR 3
#else
#define XENOMAI_MAJOR 2
#endif

int main(){
	const char* task_name = "bela-audio";
	RT_TASK audio;
	RT_TASK_INFO info;
	int count = 0;
	int ret = 1;
	while (ret != 0 && count < 30){
		usleep(1000000);
		ret = rt_task_bind(&audio, task_name, 0);
		count += 1;
	}
	
	usleep(500000);
	if (ret != 0)
		return 1;

	int oldMsw = 0;
	while(1){

		ret = rt_task_inquire(&audio, &info);
		if(ret != 0){
			fprintf(stderr, "%s\n", strerror(-ret));
			break;
		}
			
#if XENOMAI_MAJOR == 2
		int msw = info.modeswitches;
#elif XENOMAI_MAJOR == 3
		int msw = info.stat.msw;
#else 
#error Xenomai version not supported
#endif
		if (msw != oldMsw)
		{
			printf("%d\n", msw);
			oldMsw = msw;
		}
		usleep(1000000);
	}
	return 0;
}
