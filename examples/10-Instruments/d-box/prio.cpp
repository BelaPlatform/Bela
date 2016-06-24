/*
 * prio.cpp
 *
 *  Created on: May 14, 2014
 *      Author: Victor Zappi
 */

#include "prio.h"
using namespace std;
//-----------------------------------------------------------------------------------------------------------
// set wanted real-time priority to this thread
//-----------------------------------------------------------------------------------------------------------
void set_realtime_priority(int order)
{
    int ret;

    // We'll operate on the currently running thread.
    pthread_t this_thread = pthread_self();
    // struct sched_param is used to store the scheduling priority
	struct sched_param params;
	// We'll set the priority to the maximum.
	params.sched_priority = sched_get_priority_max(SCHED_FIFO) - order;

	// Attempt to set thread real-time priority to the SCHED_FIFO policy
	ret = pthread_setschedparam(this_thread, SCHED_FIFO, &params);
	if (ret != 0) {
		// Print the error
		cout << "Unsuccessful in setting thread realtime prio" << endl;
		return;
	}

	// Now verify the change in thread priority
    int policy = 0;
    ret = pthread_getschedparam(this_thread, &policy, &params);
    if (ret != 0) {
        cout << "Couldn't retrieve real-time scheduling parameters" << endl;
        return;
    }

    // Check the correct policy was applied
    if(policy != SCHED_FIFO) {
        cout << "Scheduling is NOT SCHED_FIFO!" << endl;
    }
}

//-----------------------------------------------------------------------------------------------------------


