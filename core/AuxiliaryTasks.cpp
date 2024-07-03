#include "../include/Bela.h"
#include <stdlib.h>
#include <vector>
#include <iostream>
#include <string.h>

#include <pthread.h>
#include "../include/RtThread.h"
#include "../include/RtWrappers.h"

using namespace std;
//
// Data structure to keep track of auxiliary tasks we
// can schedule
typedef struct {
	WaitingTask task;
} InternalAuxiliaryTask;

vector<InternalAuxiliaryTask*> &getAuxTasks(){
	static vector<InternalAuxiliaryTask*> auxTasks;
	return auxTasks;
}

// Create a calculation loop which can run independently of the audio, at a different
// (equal or lower) priority. Audio priority is defined in BELA_AUDIO_PRIORITY;
// priority should be generally be less than this.
// Returns an (opaque) pointer to the created task on success; 0 on failure
extern unsigned int gAuxiliaryTaskStackSize;
AuxiliaryTask Bela_createAuxiliaryTask(void (*functionToCall)(void* args), int priority, const char *name, void* args)
{
	Bela_initRtBackend();
	InternalAuxiliaryTask* newTask = new InternalAuxiliaryTask;

	// Populate the rest of the data structure
	// Attempt to create the task
	unsigned int stackSize = gAuxiliaryTaskStackSize;
	int ret;
	try {
		ret = 0;
	} catch (std::exception& e)
	{
		ret = 1;
	}
	// Upon calling this function, the thread will start and immediately wait
	// on the condition variable.
	if(!ret)
		ret = newTask->task.create(name, priority, [functionToCall, args](){
				functionToCall(args);
			}, NULL, stackSize);
	if(ret)
	{
		fprintf(stderr, "Error: unable to create auxiliary task %s : (%d) %s\n", name, ret, strerror(ret));
		delete newTask;
		return 0;
	}

	// If all went well, we store the data structure in the vector
	getAuxTasks().push_back(newTask);
	return (AuxiliaryTask)newTask;
}

// Schedule a previously created (and started) auxiliary task. It will run when
// the priority rules next allow it to be scheduled. If the task is already
// running from a previous call, then this will do nothing (lost wakeup).
int Bela_scheduleAuxiliaryTask(AuxiliaryTask task)
{
	InternalAuxiliaryTask *taskToSchedule = (InternalAuxiliaryTask *)task;
	return taskToSchedule->task.schedule(false);
}

AuxiliaryTask Bela_runAuxiliaryTask(void (*callback)(void*), int priority, void* arg)
{
	char name[11];
	snprintf(name, 11, "%p", callback);
	AuxiliaryTask task = Bela_createAuxiliaryTask(callback, priority, name, arg);
	if(!task)
		return 0;
	int ret = Bela_scheduleAuxiliaryTask(task);
	if(ret) {
		// TODO: cleanup
		return 0;
	}
	return task;
}

void Bela_deleteAllAuxiliaryTasks()
{
	// Stop all the auxiliary in reverse order
	// each thread should be checking on Bela_stopRequested(), which
	// should return true at this point. Let's make sure it does:
	Bela_requestStop();
	for(size_t n = getAuxTasks().size() - 1; n != -1; --n) {
		InternalAuxiliaryTask *taskStruct = getAuxTasks()[n];
		delete taskStruct;
	}
	getAuxTasks().clear();
}
