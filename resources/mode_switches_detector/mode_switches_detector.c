#include <stdio.h>
#include <rtdk.h>
#include <native/types.h>
#include <native/task.h>

int main(){
	const char* task_name = "bela-audio";
	RT_TASK audio;
	int ret = rt_task_bind(&audio, task_name, 0);
	if(ret > 0){
		fprintf(stderr, "An error occurred: %d. Task '%s' not running?", task_name);
		return ret;
	}
	printf("returned value: %d\n", ret);
	RT_TASK_INFO info;
	rt_task_inquire(&audio, &info);
	printf("bprio: %d\n", info.bprio);
	printf("cprio: %d\n", info.cprio);
	printf("modeswitches: %d\n", info.modeswitches);
	return 0;
}
