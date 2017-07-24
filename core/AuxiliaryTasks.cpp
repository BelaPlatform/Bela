#include "../include/Bela.h"
#include <native/task.h>
#include <stdlib.h>
#include <vector>
#include <iostream>

using namespace std;
//
// Data structure to keep track of auxiliary tasks we
// can schedule
typedef struct {
	RT_TASK task;
	void (*argfunction)(void*);
	void (*function)(void);
	char *name;
	int priority;
	bool started;
	bool hasArgs;
	void* args;
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
	InternalAuxiliaryTask *newTask = (InternalAuxiliaryTask*)malloc(sizeof(InternalAuxiliaryTask));

	// Attempt to create the task
	unsigned int stackSize = gAuxiliaryTaskStackSize;
	if(int ret = rt_task_create(&(newTask->task), name, stackSize, priority, T_JOINABLE | T_FPU)) {
		cout << "Error: unable to create auxiliary task " << name << " : " << strerror(-ret) << endl;
		free(newTask);
		return 0;
	}

	// Populate the rest of the data structure and store it in the vector
	newTask->argfunction = functionToCall;
	newTask->name = strdup(name);
	newTask->priority = priority;
	newTask->started = false;
	newTask->args = args;
	newTask->hasArgs = true;
    
	getAuxTasks().push_back(newTask);

	return (AuxiliaryTask)newTask;
}

// Schedule a previously created (and started) auxiliary task. It will run when the priority rules next
// allow it to be scheduled.
void Bela_scheduleAuxiliaryTask(AuxiliaryTask task)
{
	InternalAuxiliaryTask *taskToSchedule = (InternalAuxiliaryTask *)task;
	if(taskToSchedule->started == false){ // Note: this is not the safest method to check if a task
		Bela_startAuxiliaryTask(task); // is started (or ready to be resumed), but it probably is the fastest.
                                           // A safer approach would use rt_task_inquire()
	}
	rt_task_resume(&taskToSchedule->task);
}

// Calculation loop that can be used for other tasks running at a lower
// priority than the audio thread. Simple wrapper for Xenomai calls.
// Treat the argument as containing the task structure
//
// The purpose of this loop is to keep the task alive between schedulings,
// so to avoid the overhead of creating and starting the task every time:
// this way we only requie a "rt_task_resume" to start doing some work
void auxiliaryTaskLoop(void *taskStruct)
{
    InternalAuxiliaryTask *task = ((InternalAuxiliaryTask *)taskStruct);
    
	// Get function to call from the argument
	void (*auxiliary_argfunction)(void* args) = task->argfunction;
    void (*auxiliary_function)(void) = task->function;
    
	// Wait for a notification
	rt_task_suspend(NULL);

	while(!gShouldStop) {
		// Then run the calculations
		if (task->hasArgs)
    	    auxiliary_argfunction(task->args);
        else
            auxiliary_function();

		// we only suspend if the program is still running
		// otherwise, if we are during cleanup, the task would hang indefinitely
		// if rt_task_suspend is called after rt_task_join (below) has
		// already been called
		if(!gShouldStop){
		// Wait for a notification from Bela_scheduleAuxiliaryTask
			rt_task_suspend(NULL);
		} else {
			break;
		}
	}
}


int Bela_startAuxiliaryTask(AuxiliaryTask task){
	InternalAuxiliaryTask *taskStruct;
	taskStruct = (InternalAuxiliaryTask *)task;
	if(taskStruct->started == true)
		return 0;
	if(int ret = rt_task_start(&(taskStruct->task), &auxiliaryTaskLoop, taskStruct)) {
		cerr << "Error: unable to start Xenomai task " << taskStruct->name << ": " <<  strerror(-ret) << endl;
		return -1;
	}
	taskStruct->started = true;
	return 0;
}

// startAudio() should be called only after initAudio() successfully completes.
// It launches the real-time Xenomai task which runs the audio loop. Returns 0
// on success.

int Bela_startAllAuxiliaryTasks()
{
	// The user may have created other tasks. Start those also.
	vector<InternalAuxiliaryTask*>::iterator it;
	for(it = getAuxTasks().begin(); it != getAuxTasks().end(); it++) {
		int ret = Bela_startAuxiliaryTask(*it);
		if(ret != 0)
			return -2;
	}
	return 0;
}

void Bela_stopAllAuxiliaryTasks()
{
	// Stop all the auxiliary threads too
	vector<InternalAuxiliaryTask*>::iterator it;
	for(it = getAuxTasks().begin(); it != getAuxTasks().end(); it++) {
		InternalAuxiliaryTask *taskStruct = *it;

		// Wake up each thread and join it
		rt_task_resume(&(taskStruct->task));
		rt_task_join(&(taskStruct->task));
	}
}

void Bela_deleteAllAuxiliaryTasks()
{
	// Clean up the auxiliary tasks
	vector<InternalAuxiliaryTask*>::iterator it;
	for(it = getAuxTasks().begin(); it != getAuxTasks().end(); it++) {
		InternalAuxiliaryTask *taskStruct = *it;

		// Delete the task
		rt_task_delete(&taskStruct->task);

		// Free the name string and the struct itself
		free(taskStruct->name);
		free(taskStruct);
	}
	getAuxTasks().clear();
}

