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
	/**
	 * @param pruNum Select PRU and core number to run the pru code on<br>
	 * @param v verbose flag
	 */
	PruManager(unsigned int pruNum, int v);
	virtual ~PruManager() = 0;
	virtual int start(bool useMcaspIrq) = 0;
	/**
	 * Load the firmware and start the PRU
	 * @param path path to a PRU firmware file that is suitable to be loaded by the child class's underlying driver.
	 */
	virtual int start(const std::string& path) = 0;
	/**
	 * Stops the PRU
	 */
	virtual void stop() = 0;
	/**
	 * Obtain a pointer to the PRU's own DATA RAM
	 */
	virtual void* getOwnMemory() = 0;
	/**
	 * Obtain a pointer to the PRUSS shared RAM
	 */
	virtual void* getSharedMemory() = 0;
};

#if ENABLE_PRU_RPROC == 1
/**
 * \brief Support for interaction with PRU via
 * Remote Proc + Mmap
 * \nosubgrouping
 */
class PruManagerRprocMmap : public PruManager
{
public:
	/**
	 * @param pruNum select PRUSS and core On BBAI:<br>
	 * 0 for PRUSS1 core 0<br>
	 * 1 for PRUSS1 core 1<br>
	 * 2 for PRUSS2 core 0<br>
	 * 3 for PRUSS2 core 1
	 */
	PruManagerRprocMmap(unsigned int pruNum, int v);
	void stop();
	/**
	 * Loads a firmware ELF `.out` suitable for rproc.
	 */
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
/**
 * wrapper for libprussdrv for both start/stop and memory sharing
 * It has the libprussdrv calls currently present in the codebase
 */
class PruManagerUio : public PruManager
{
public:
	/**
	 * @param pruNum Select PRU<num> on BBB:<br>
	 * 0 for PRU 0<br>
	 * 1 for PRU 1
	 */
	PruManagerUio(unsigned int pruNum, int v);
	/**
	 * Loads a a binary of the firmware for Uio.
	 */
	int start(bool useMcaspIrq);
	int start(const std::string& path);
	void stop();
	void* getOwnMemory();
	void* getSharedMemory();
};

#endif // ENABLE_PRU_UIO
