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
