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

#if ENABLE_PRU_UIO == 1
#include <prussdrv.h>
#endif

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

#if ENABLE_PRU_RPROC == 1
class PruManagerRprocMmap : public PruManager
{
// use rproc for start/stop and mmap for memory sharing
public:
	PruManagerRprocMmap(unsigned int pruNum, int v);
	void stop();
	int start(bool useMcaspIrq);
	int start(const std::string& path);
	void* getOwnMemory();
	void* getSharedMemory();
private:
	std::vector<uint32_t> prussAddresses;
	std::string basePath;
	std::string statePath;
	std::string firmwarePath;
	std::string firmware;
	Mmap ownMemory;
	Mmap sharedMemory;
};
#endif // ENABLE_PRU_RPROC

#if ENABLE_PRU_UIO == 1
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

#endif // ENABLE_PRU_UIO
