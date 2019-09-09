/*
 * logger.h
 *
 *  Created on: Aug 6, 2014
 *      Author: Victor Zappi and Andrew McPherson
 */

#ifndef LOGGER_H_
#define LOGGER_H_

#include <string.h>
#include <pthread.h>
#include <stdio.h>
#include <unistd.h>
#include <fstream>		// file handle
#include <iostream>		// stringstream
#include <sstream>		// stringstream
#include <glob.h>		// alternative to dirent.h to handle files in dirs
#include <iomanip>		// setfill
#include <sys/time.h>	// elapsed time

#include "config.h"
#include "prio.h"

using namespace std;

int initLogLoop();
void *logLoop(void *);


#endif /* LOGGER_H_ */
