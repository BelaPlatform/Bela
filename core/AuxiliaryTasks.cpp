#include "../include/Bela.h"
#include <stdlib.h>
#include <vector>
#include <iostream>
#include <string.h>

#include <pthread.h>
extern int gXenomaiInited;

#include "../include/xenomai_wraps.h"

using namespace std;
//
// Data structure to keep track of auxiliary tasks we
// can schedule
typedef struct {
	pthread_t task;
	pthread_cond_t cond;
	pthread_mutex_t mutex;
	void (*argfunction)(void*);
	char *name;
	int priority;
	bool started;
	void* args;
} InternalAuxiliaryTask;

vector<InternalAuxiliaryTask*> &getAuxTasks(){
	static vector<InternalAuxiliaryTask*> auxTasks;
	return auxTasks;
}

void auxiliaryTaskLoop(void *taskStruct);

// Create a calculation loop which can run independently of the audio, at a different
// (equal or lower) priority. Audio priority is defined in BELA_AUDIO_PRIORITY;
// priority should be generally be less than this.
// Returns an (opaque) pointer to the created task on success; 0 on failure
extern unsigned int gAuxiliaryTaskStackSize;
AuxiliaryTask Bela_createAuxiliaryTask(void (*functionToCall)(void* args), int priority, const char *name, void* args)
{
	// if a program calls this before xenomai is inited, let's init it here with empty arguments.
	if(!gXenomaiInited)
	{
		fprintf(stderr, "Error: You should call Bela_initAudio() before calling Bela_createAuxiliaryTask()\n");
		return 0;
	}
	InternalAuxiliaryTask *newTask = (InternalAuxiliaryTask*)malloc(sizeof(InternalAuxiliaryTask));

	// Populate the rest of the data structure
	newTask->argfunction = functionToCall;
	newTask->name = strdup(name);
	newTask->priority = priority;
	newTask->started = false;
	newTask->args = args;
	// Attempt to create the task
	unsigned int stackSize = gAuxiliaryTaskStackSize;
	if(int ret = BELA_RT_WRAP(pthread_cond_init(&(newTask->cond), NULL)))
	{
		fprintf(stderr, "Error: unable to create condition variable for auxiliary task %s : (%d) %s\n", name, ret, strerror(ret));
		free(newTask);
		return 0;
	}
	if(int ret = BELA_RT_WRAP(pthread_mutex_init(&(newTask->mutex), NULL)))
	{
		fprintf(stderr, "Error: unable to initialize mutex for auxiliary task %s : (%d) %s\n", name, ret, strerror(-ret));
		free(newTask);
		return 0;
	}
	// Upon calling this function, the thread will start and immediately wait
	// on the condition variable.
	if(int ret = create_and_start_thread(&(newTask->task), name, priority, stackSize,(pthread_callback_t*)auxiliaryTaskLoop, newTask))
	{
		fprintf(stderr, "Error: unable to create auxiliary task %s : (%d) %s\n", name, ret, strerror(ret));
		free(newTask);
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
	if(taskToSchedule->started == false){ // Note: this is not the safest method to check if a task
		Bela_startAuxiliaryTask(task); // is started (or ready to be resumed), but it probably is the fastest.
                                           // A safer approach would use rt_task_inquire()
	}
	if(!taskToSchedule->started)
	{
		// the task has not yet had a chance to run.
		// let's enforce it now. This will block the current thread
		// until the other starts.
		struct sched_param param;
		int policy;
		int ret = __wrap_pthread_getschedparam(taskToSchedule->task,
				&policy, &param);
		if(!ret)
		{
			// set the priority to maximum
			int originalPriority = param.sched_priority;
			param.sched_priority = BELA_RT_WRAP(sched_get_priority_max(SCHED_FIFO));
			__wrap_pthread_setschedparam(taskToSchedule->task,
					SCHED_FIFO, &param);
			// just in case we have the same priority, let the
			// other go first
			BELA_RT_WRAP(pthread_yield());
			if(!taskToSchedule->started)
				fprintf(stderr, "Didn't work\n");
			// by the time we are here, the other thread has run, set the
			// started flag, and is now waiting for the cond
			// So, restore its schedparams
			param.sched_priority = originalPriority;
			__wrap_pthread_setschedparam(taskToSchedule->task,
					policy, &param);
		}
	}
	if(int ret = BELA_RT_WRAP(pthread_mutex_trylock(&taskToSchedule->mutex)))
	{
		// If we cannot get the lock, then the task is probably still running.
		return ret;
	} else {
		ret = BELA_RT_WRAP(pthread_cond_signal(&taskToSchedule->cond));
		BELA_RT_WRAP(pthread_mutex_unlock(&taskToSchedule->mutex));
		return 0;
	}
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

static void suspendCurrentTask(InternalAuxiliaryTask* task)
{
	BELA_RT_WRAP(pthread_mutex_lock(&task->mutex));
	task->started = true;
	BELA_RT_WRAP(pthread_cond_wait(&task->cond, &task->mutex));
	BELA_RT_WRAP(pthread_mutex_unlock(&task->mutex));
}
// Calculation loop that can be used for other tasks running at a lower
// priority than the audio thread. Simple wrapper for Xenomai calls.
// Treat the argument as containing the task structure
//
// The purpose of this loop is to keep the task alive between schedulings,
// so to avoid the overhead of creating and starting the task every time:
// this way we only require a "rt_task_resume" to start doing some work
void auxiliaryTaskLoop(void *taskStruct)
{
	InternalAuxiliaryTask *task = ((InternalAuxiliaryTask *)taskStruct);
    
	// Get function to call from the argument
	void (*auxiliary_argfunction)(void* args) = task->argfunction;
    
	// Wait for a notification
	suspendCurrentTask(task);

	while(!Bela_stopRequested()) {
		// Then run the calculations
		auxiliary_argfunction(task->args);

		// we only suspend if the program is still running
		// otherwise, if we are during cleanup, the task would hang indefinitely
		// if rt_task_suspend is called after rt_task_join (below) has
		// already been called
		if(!Bela_stopRequested()){
		// Wait for a notification from Bela_scheduleAuxiliaryTask
			suspendCurrentTask(task);
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
	// The task has already been started upon creation.
	// It is currently waiting on a condition variable.
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
		// each thread should be checking on Bela_stopRequested(), which
		// should return true at this point. Let's make sure it does:
		Bela_requestStop();
		// REALLY lock the lock: we really must call _cond_signal here
		BELA_RT_WRAP(pthread_mutex_lock(&taskStruct->mutex));
		BELA_RT_WRAP(pthread_cond_signal(&taskStruct->cond));
		BELA_RT_WRAP(pthread_mutex_unlock(&taskStruct->mutex));

		void* threadReturnValue;
		BELA_RT_WRAP(pthread_join(taskStruct->task, &threadReturnValue));
	}
}

void Bela_deleteAllAuxiliaryTasks()
{
	// Clean up the auxiliary tasks
	vector<InternalAuxiliaryTask*>::iterator it;
	for(it = getAuxTasks().begin(); it != getAuxTasks().end(); it++) {
		InternalAuxiliaryTask *taskStruct = *it;

		// Delete the task
		pthread_cancel(taskStruct->task);
		BELA_RT_WRAP(pthread_cond_destroy(&taskStruct->cond));
		BELA_RT_WRAP(pthread_mutex_destroy(&taskStruct->mutex));
		// Free the name string and the struct itself
		free(taskStruct->name);
		free(taskStruct);
	}
	getAuxTasks().clear();
}
