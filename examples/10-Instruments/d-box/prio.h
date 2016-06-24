/*
 * prio.h
 *
 *  Created on: May 14, 2014
 *      Author: Victor Zappi
 */

#ifndef PRIO_H_
#define PRIO_H_


#include <pthread.h>
#include <sched.h>
#include <iostream>

//-----------------------------------------------------------------------------------------------------------
// set maximum real-time priority to this thread
//-----------------------------------------------------------------------------------------------------------
void set_realtime_priority(int order);
//-----------------------------------------------------------------------------------------------------------

#endif /* PRIO_H_ */
