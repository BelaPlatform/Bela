/**
 * \example Extras/pru-pwm
 * 
 * Pulse width modulation on the PRU
 * ---------------------------
 * 
 * This example uses the PRU onboard microcontroller to drive 8 channels of PWM.
 * The default behaviour is to run with 8 channels of PWM, a PWM frequency of 24.038kHz
 * and a precision of 8 bit.
 * 
 * You can set the pwm for each channel with set_widths() at any time in the code.
 * 
 * The carrier frequency and precision can be modified by changing PWM_MAX_WIDTH
 * in common_defs.h
 *
 * A slightly higher (25.773kHz) carrier frequency could be achieved by
 * refactoring the code so to use only one byte per channel, which would
 * clearly limit PWM_MAX_WIDTH <= 255
 *
 * An even higher (30.864kHz)) carrier frequecny could be achieved by taking the
 * LBBO operation out of USER_LOOP in pru_pwm.p, however this would mean that 
 * some PWM values (either close to 100% or close to 0%) could not be achieved
 *
 * Pinout: we are using PRU1's R30, that is:
 * 
 * ```
 * BBB pin  PWM channel
 * P8_45:    0
 * P8_46:    1
 * P8_43:    2
 * P8_44:    3
 * P8_41:    4
 * P8_42:    5
 * P8_39:    6 // this will require a change to the dtb
 * P8_40:    7 // this will require a change to the dtb
 * ```
 */

#include <Bela.h>
#include <GPIOcontrol.h>
#include "prussdrv.h"
#include "pruss_intc_mapping.h"
#include <string.h>
#include "pru_pwm_bin.h"
#include "common_defs.h"

typedef uint16_t count_t;

uint32_t *gPRUCommunicationMem = 0;

bool load_pru(int pru_number);			// Load the PRU environment
bool start_pru(int pru_number);			// Start the PRU
void set_widths(count_t* counts, unsigned int length);
int gPruNumber;

void Bela_userSettings(BelaInitSettings* settings)
{
	settings->pruNumber = 0;
	// Set user PRU to the opposite number as the default Bela PRU
	if(settings->pruNumber == 0)
		gPruNumber = 1;
	else
		gPruNumber = 0;
}

bool setup(BelaContext *context, void *userData)
{
	// Load PRU environment and map memory
	if(!load_pru(gPruNumber)) {
		printf("Error: could not initialise user PRU code.\n");
		return false;
	}
	
	unsigned int length = 8;
	count_t counts[length];
	memset(gPRUCommunicationMem, 0, 128);

	for(unsigned int n = 0; n < length; ++n) {
		counts[n] = PWM_MAX_WIDTH * (1+n)/(float)length;
	}
	set_widths(counts, length);
	
	if(!start_pru(gPruNumber)) {
		printf("Error: could not start user PRU code.\n");
		return false;		
	}
	return true;
}

void render(BelaContext *context, void *userData)
{
		

}

void cleanup(BelaContext *context, void *userData)
{
    /* Disable PRU */
    prussdrv_pru_disable(gPruNumber);
}

// Load environment for the second PRU, but don't run it yet
bool load_pru(int pru_number)
{
	void *pruMemRaw;
	uint32_t *pruMemInt;
	
	/* There is less to do here than usual for prussdrv because
	 * the core code will already have done basic initialisation 
	 * of the library. */

    /* Allocate and initialize memory */
    if(prussdrv_open(PRU_EVTOUT_1)) {
    	rt_printf("Failed to open user-side PRU driver\n");
    	return false;
    }

	/* Map shared memory to a local pointer */
	prussdrv_map_prumem(PRUSS0_SHARED_DATARAM, (void **)&pruMemRaw);
	
	/* The first 0x800 is reserved by Bela. The next part is available
	   for our application. */
	pruMemInt = (uint32_t *)pruMemRaw;
	gPRUCommunicationMem = &pruMemInt[0x800/sizeof(uint32_t)];

	return true;
}

// Start the second PRU running
bool start_pru(int pru_number)
{
	if(prussdrv_exec_code(pru_number, PRUcode, sizeof(PRUcode))) {
		rt_printf("Failed to execute user-side PRU code\n");
		return false;
	}
	
	return true;
}

void set_widths(count_t* counts, unsigned int length)
{
	// Set the period in counter units
	memcpy(&gPRUCommunicationMem[PRU_COMM_USER_WIDTH], counts, length * sizeof(counts[0]));
}
