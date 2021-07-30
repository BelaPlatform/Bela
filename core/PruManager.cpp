/*
 * PruManager.cpp
 *
 *	Created on: July 3, 2021
 *		Author: Dhruva Gole
 */

#include "PruManager.h"
#include "MiscUtilities.h"
#include <iostream>

PruManager::PruManager(unsigned int pruNum, int v)
{
	/* based on the value of pru_num to choose:
	 * 0 for PRUSS1 core 0
	 * 1 for PRUSS1 core 1
	 * 2 for PRUSS2 core 0
	 * 3 for PRUSS2 core 1
	 */
	verbose = v;
	pruss = pruNum / 2 + 1;
	pruCore = pruNum % 2;
	pruStringId = "PRU" + std::to_string(pruss) + "_" + std::to_string(pruCore);
}

PruManager::~PruManager()
{}

#if ENABLE_PRU_RPROC == 1
#include <unistd.h>

const std::vector<uint32_t> prussOwnRamOffsets = {0x0, 0x2000};
const uint32_t prussSharedRamOffset = 0x10000;

PruManagerRprocMmap::PruManagerRprocMmap(unsigned int pruNum, int v) :
	PruManager(pruNum, v)
{
	basePath = "/dev/remoteproc/pruss" + std::to_string(pruss) + "-core" + std::to_string(pruCore) + "/";
	statePath = basePath + "state";
	firmwarePath = basePath + "firmware";
#ifdef IS_AM572x
	prussAddresses.push_back(0x4b200000);
	prussAddresses.push_back(0x4b280000);
	firmware = "am57xx";
#else // IS_AM572x
#warning Untested PRU addresses for am3358
	prussAddresses.push_back(0x4a334000);
	prussAddresses.push_back(0x4a338000);
	firmware = "am335x";
#endif // IS_AM572x
	firmware += "-pru" + std::to_string(pruss) + "_" + std::to_string(pruCore) + "-fw";
}

void PruManagerRprocMmap::stop()
{
	// performs echo stop > state
	if(verbose)
		printf("Stopping %s\n", pruStringId.c_str());
	IoUtils::writeTextFile(statePath, "stop");
}

int PruManagerRprocMmap::start(bool useMcaspIrq)
{
#if (defined(firmwareBelaRProcNoMcaspIrq) && defined(firmwareBelaRProcMcaspIrq))
	std::string firmwareBela = useMcaspIrq ? firmwareBelaRProcMcaspIrq : firmwareBelaRProcNoMcaspIrq; // Incoming strings from Makefile
	return start(firmwareBela);
#else
#error No PRU firmware defined. Pass the name of firmware.out file using firmwareBelaRProcNoMcaspIrq=<path> and firmwareBelaRProcMcaspIrq=<path>
#endif
}

int PruManagerRprocMmap::start(const std::string& path)
{
	stop();
	std::string symlinkTarget = "/lib/firmware/" + firmware;
	std::string firmwareCopyCommand = "ln -s -f " + path + " " + symlinkTarget;
	int wstatus = system(firmwareCopyCommand.c_str());
	int ret = !WIFEXITED(wstatus) ? -1 : WEXITSTATUS(wstatus);
	if (ret)
	{
		fprintf(stderr, "Error while executing `%s` to load PRU: %d\n", firmwareCopyCommand.c_str(), ret);
		return -1;
	}
	if(verbose)
		printf("Loading firmware into %s: %s symlinked from %s\n", pruStringId.c_str(), symlinkTarget.c_str(), path.c_str());
	// reload the new fw in PRU
	if(IoUtils::writeTextFile(firmwarePath, firmware))
	{
		fprintf(stderr, "PruManagerRprocMmap: unable to write %s to %s\n", firmware.c_str(), firmwarePath.c_str());
		return -1;
	}
	// performs echo start > state
	if(verbose)
		printf("Starting %s\n", pruStringId.c_str());
	if(IoUtils::writeTextFile(statePath, "start"))
	{
		fprintf(stderr, "PruManagerRprocMmap: unable to write %s to %s\n", "start", statePath.c_str());
		return -1;
	}
	usleep(10000); // not sure if needed, but it won't hurt to wait to give it time to load the firmware and become "running"
	std::string state = IoUtils::readTextFile(statePath);
	if(state != "running\n")
	{
		fprintf(stderr, "PruManagerRprocMmap: we started PRU but state in %s is %s\n", statePath.c_str(), state.c_str());
		return -1;
	}
	return 0;
}

void* PruManagerRprocMmap::getOwnMemory()
{
	return ownMemory.map(prussAddresses[pruss - 1] + prussOwnRamOffsets[pruCore], 0x2000);
}

void* PruManagerRprocMmap::getSharedMemory()
{
	return sharedMemory.map(prussAddresses[pruss - 1] + prussSharedRamOffset, 0x8000);
}
#endif // ENABLE_PRU_RPROC

#if ENABLE_PRU_UIO == 1
#include "../include/PruBinary.h"

PruManagerUio::PruManagerUio(unsigned int pruNum, int v) :
	PruManager(pruNum, v)
{
	prussdrv_init();
	if(prussdrv_open(PRU_EVTOUT_0)) {
		fprintf(stderr, "Failed to open PRU driver\n");
	}
}

int PruManagerUio::start(bool useMcaspIrq)
{
	unsigned int* pruCode;
	unsigned int pruCodeSize;
	switch((int)useMcaspIrq) // (int) is here to avoid stupid compiler warning
	{
		case false:
			pruCode = (unsigned int*)NonIrqPruCode::getBinary();
			pruCodeSize = NonIrqPruCode::getBinarySize();
			break;
		case true:
			pruCode = (unsigned int*)IrqPruCode::getBinary();
			pruCodeSize = IrqPruCode::getBinarySize();
			break;
	}
	if(prussdrv_exec_code(pruCore, pruCode, pruCodeSize)) {
		fprintf(stderr, "Failed to execute PRU code\n");
		return 1;
	}
	else
		return 0;
}

int PruManagerUio::start(const std::string& path)
{
	if(prussdrv_exec_program(pruCore, path.c_str())) {
		return 1;
	}
	return 0;
}

void PruManagerUio::stop(){
	if(verbose)
		printf("Stopping %s\n", pruStringId.c_str());
	prussdrv_pru_disable(pruCore);
}

void* PruManagerUio::getOwnMemory()
{
	void* pruDataRam;
	int ret = prussdrv_map_prumem (pruCore == 0 ? PRUSS0_PRU0_DATARAM : PRUSS0_PRU1_DATARAM, (void**)&pruDataRam);
	if(ret)
		return NULL;
	else
		return pruDataRam;
}

void* PruManagerUio::getSharedMemory()
{
	void* pruSharedRam;
	int ret = prussdrv_map_prumem (PRUSS0_SHARED_DATARAM, (void **)&pruSharedRam);
	if(ret)
		return NULL;
	else
		return pruSharedRam;
}
#endif // ENABLE_PRU_UIO
