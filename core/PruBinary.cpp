#include "../include/PruBinary.h"

// the files included below are generated in build/pru/ from the files in pru/
// according to the rules defined in the Makefile

namespace NonIrqPruCode
{
#include "pru_rtaudio_bin.h"
	const unsigned int* getBinary()
	{
		return PRUcode;
	}
	unsigned int getBinarySize()
	{
		return sizeof(PRUcode);
	}
};

namespace IrqPruCode
{
#include "pru_rtaudio_irq_bin.h"
	const unsigned int* getBinary()
	{
		return PRUcode;
	}
	unsigned int getBinarySize()
	{
		return sizeof(PRUcode);
	}
};

