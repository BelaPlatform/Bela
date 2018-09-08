#include "../include/Bela.h"
#include <stdlib.h>
#include <vector>
#include <iostream>
#include <string.h>

#ifdef XENOMAI_SKIN_native
#include <native/task.h>
#endif

#ifdef XENOMAI_SKIN_posix
#include <pthread.h>
extern int gXenomaiInited;
#endif

#include "../include/xenomai_wraps.h"

using namespace std;
//
// Data structure to keep track of auxiliary tasks we
// can schedule
typedef struct {
#ifdef XENOMAI_SKIN_native
	RT_TASK task;
#endif
#ifdef XENOMAI_SKIN_posix
	pthread_t task;
	pthread_cond_t cond;
	pthread_mutex_t mutex;
#endif
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
#if XENOMAI_MAJOR == 3
	// if a program calls this before xenomai is inited, let's init it here with empty arguments.
	if(!gXenomaiInited)
	{
		fprintf(stderr, "Error: You should call Bela_initAudio() before calling Bela_createAuxiliaryTask()\n");
		return 0;
	}
#endif
	InternalAuxiliaryTask *newTask = (InternalAuxiliaryTask*)malloc(sizeof(InternalAuxiliaryTask));

	// Populate the rest of the data structure
	newTask->argfunction = functionToCall;
	newTask->name = strdup(name);
	newTask->priority = priority;
	newTask->started = false;
	newTask->args = args;
	// Attempt to create the task
	unsigned int stackSize = gAuxiliaryTaskStackSize;
#ifdef XENOMAI_SKIN_native
	if(int ret = rt_task_create(&(newTask->task), name, stackSize, priority, T_JOINABLE | T_FPU))
#endif
#ifdef XENOMAI_SKIN_posix
	if(int ret = __wrap_pthread_cond_init(&(newTask->cond), NULL))
	{
		fprintf(stderr, "Error: unable to create condition variable for auxiliary task %s : (%d) %s\n", name, ret, strerror(ret));
		free(newTask);
		return 0;
	}
	if(int ret = __wrap_pthread_mutex_init(&(newTask->mutex), NULL))
	{
		fprintf(stderr, "Error: unable to initialize mutex for auxiliary task %s : (%d) %s\n", name, ret, strerror(-ret));
		free(newTask);
		return 0;
	}
	// Upon calling this function, the thread will start and immediately wait
	// on the condition variable.
	if(int ret = create_and_start_thread(&(newTask->task), name, priority, stackSize,(pthread_callback_t*)auxiliaryTaskLoop, newTask))
#endif
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
#ifdef XENOMAI_SKIN_native
	rt_task_resume(&taskToSchedule->task);
	// the return value here is hardcoded: returns success
	// regardless of whether the task is actually scheduled or was
	// already running. Finding out whether it was successful or not
	// would require some overhead, through a call to rt_task_inquire,
	// so we leave it out for now.
	return 0;
#endif
#ifdef XENOMAI_SKIN_posix
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
			param.sched_priority = __wrap_sched_get_priority_max(SCHED_FIFO);
			__wrap_pthread_setschedparam(taskToSchedule->task,
					SCHED_FIFO, &param);
			// just in case we have the same priority, let the
			// other go first
			__wrap_pthread_yield();
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
	if(int ret = __wrap_pthread_mutex_trylock(&taskToSchedule->mutex))
	{
		// If we cannot get the lock, then the task is probably still running.
		return ret;
	} else {
		ret = __wrap_pthread_cond_signal(&taskToSchedule->cond);
		__wrap_pthread_mutex_unlock(&taskToSchedule->mutex);
		return 0;
	}
#endif
}

static void suspendCurrentTask(InternalAuxiliaryTask* task)
{
#ifdef XENOMAI_SKIN_native
	rt_task_suspend(NULL);
#endif
#ifdef XENOMAI_SKIN_posix
	__wrap_pthread_mutex_lock(&task->mutex);
	task->started = true;
	__wrap_pthread_cond_wait(&task->cond, &task->mutex);
	__wrap_pthread_mutex_unlock(&task->mutex);
#endif
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

	while(!gShouldStop) {
		// Then run the calculations
		auxiliary_argfunction(task->args);

		// we only suspend if the program is still running
		// otherwise, if we are during cleanup, the task would hang indefinitely
		// if rt_task_suspend is called after rt_task_join (below) has
		// already been called
		if(!gShouldStop){
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
#ifdef XENOMAI_SKIN_native
	if(int ret = rt_task_start(&(taskStruct->task), &auxiliaryTaskLoop, taskStruct)) {
		fprintf(stderr,"Error: unable to start Xenomai task %s: %s\n", taskStruct->name, strerror(-ret));
		return -1;
	}
#endif
#ifdef XENOMAI_SKIN_posix
	// The task has already been started upon creation.
	// It is currently waiting on a condition variable.
#endif
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
		// each thread should be checking on gShouldStop, which
		// should be true at this point. Let's make sure it is:
		gShouldStop = 1;
#ifdef XENOMAI_SKIN_native
		rt_task_resume(&taskStruct->task);
		rt_task_join(&(taskStruct->task));
#endif
#ifdef XENOMAI_SKIN_posix
		// REALLY lock the lock: we really must call _cond_signal here
		__wrap_pthread_mutex_lock(&taskStruct->mutex);
		__wrap_pthread_cond_signal(&taskStruct->cond);
		__wrap_pthread_mutex_unlock(&taskStruct->mutex);

		void* threadReturnValue;
		__wrap_pthread_join(taskStruct->task, &threadReturnValue);
#endif
	}
}

void Bela_deleteAllAuxiliaryTasks()
{
	// Clean up the auxiliary tasks
	vector<InternalAuxiliaryTask*>::iterator it;
	for(it = getAuxTasks().begin(); it != getAuxTasks().end(); it++) {
		InternalAuxiliaryTask *taskStruct = *it;

		// Delete the task
#ifdef XENOMAI_SKIN_native
		rt_task_delete(&taskStruct->task);
#endif
#ifdef XENOMAI_SKIN_posix
		pthread_cancel(taskStruct->task);
		__wrap_pthread_cond_destroy(&taskStruct->cond);
		__wrap_pthread_mutex_destroy(&taskStruct->mutex);
#endif
		// Free the name string and the struct itself
		free(taskStruct->name);
		free(taskStruct);
	}
	getAuxTasks().clear();
}
