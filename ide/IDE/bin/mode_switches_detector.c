#include <stdio.h>
#include <rtdk.h>
#include <native/types.h>
#include <native/task.h>
#include <error.h>

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
	
	if (ret != 0)
		return 1;

	int msw = 0;
	while(1){

		ret = rt_task_inquire(&audio, &info);
		if(ret != 0){
			fprintf(stderr, "%s\n", strerror(-ret));
			break;
		}
		if (info.modeswitches > msw)
			printf("%d\n", info.modeswitches);
			
		msw = info.modeswitches;
		
		usleep(1000000);
	}
	
	return 0;
}
