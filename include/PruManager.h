/*
 * PruManager.h
 *
 * Support for interaction with PRU via
 * (rproc+mmap) and/or (uio+libprussdrv)
 *
 *	Created on: Jul 3, 2021
 *		Author: Dhruva Gole
 */

#include <string>
#include <prussdrv.h>
#include <vector>
#include "Mmap.h"

class PruManager
{
protected:
	unsigned int pruss;
	unsigned int pruCore;
	int verbose;
	std::string pruStringId;
public:
	PruManager(unsigned int pruNum, int v);
	virtual ~PruManager() = 0;
	virtual int start(bool useMcaspIrq) = 0;
	virtual int start(const std::string& path) = 0;
	virtual void stop() = 0;
	virtual void* getOwnMemory() = 0;
	virtual void* getSharedMemory() = 0;
};

class PruManagerUio : public PruManager
{
/* wrapper for libprussdrv for both start/stop and memory sharing
 * It has the libprussdrv calls currently present in the codebase
*/
public:
	PruManagerUio(unsigned int pruNum, int v);
	int start(bool useMcaspIrq);
	int start(const std::string& path);
	void stop();
	void* getOwnMemory();
	void* getSharedMemory();
};
