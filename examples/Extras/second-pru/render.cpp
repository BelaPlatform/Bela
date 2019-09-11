/*
 ____  _____ _        _    
| __ )| ____| |      / \   
|  _ \|  _| | |     / _ \  
| |_) | |___| |___ / ___ \ 
|____/|_____|_____/_/   \_\

The platform for ultra-low latency audio and sensor processing

http://bela.io

A project of the Augmented Instruments Laboratory within the
Centre for Digital Music at Queen Mary University of London.
http://www.eecs.qmul.ac.uk/~andrewm

(c) 2016 Augmented Instruments Laboratory: Andrew McPherson,
	Astrid Bin, Liam Donovan, Christian Heinrichs, Robert Jack,
	Giulio Moro, Laurel Pardue, Victor Zappi. All rights reserved.

The Bela software is distributed under the GNU Lesser General Public License
(LGPL 3.0), available here: https://www.gnu.org/licenses/lgpl-3.0.txt
*/

#include <Bela.h>
#include <GPIOcontrol.h>
#include <cmath>
#include "prussdrv.h"
#include "pruss_intc_mapping.h"

#include "pru_gpio_bin.h"

// The definitions below are locations in PRU memory
// that need to match the PRU code
#define PRU_COMM_USER_DELAY		0

uint32_t *gPRUCommunicationMem = 0;

int gpioNumber0 = 30; // must match PRU code

float gFrequency = 440.0;
float gPhase;
float gInverseSampleRate;

int gUpdateCount = 0;
int64_t gPeriodNS = 500000000LL;		// 0.5 seconds

bool load_pru(int pru_number);			// Load the PRU environment
bool start_pru(int pru_number);			// Start the PRU
void set_period(uint64_t period_ns);	// Set the period of the blink

bool setup(BelaContext *context, void *userData)
{
	int pruNumber;		 // comes from userData
	
	// Which PRU to use is in userData, assuming this project
	// is using the included main.cpp file.
	if(userData == 0) {
		printf("Error: PRU number not provided. Are you using the right main.cpp file?\n");
		return false;
	}
	
	pruNumber = *((int *)userData);
	
	if(gpio_export(gpioNumber0)) {
		printf("Warning: couldn't export GPIO pin %d\n", gpioNumber0);
	}
	if(gpio_set_dir(gpioNumber0, OUTPUT_PIN)) {
		printf("Warning: couldn't set direction on GPIO pin\n");
	}
		
	// Load PRU environment and map memory
	if(!load_pru(pruNumber)) {
		printf("Error: could not initialise user PRU code.\n");
		return false;
	}
	
	set_period(gPeriodNS);
	
	if(!start_pru(pruNumber)) {
		printf("Error: could not start user PRU code.\n");
		return false;		
	}
	
	gInverseSampleRate = 1.0 / context->audioSampleRate;
	gPhase = 0.0;
	
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		float out = 0.8 * sinf(gPhase);
		gPhase += 2.0f * (float)M_PI * gFrequency * gInverseSampleRate;
		if(gPhase > M_PI)
			gPhase -= 2.0f * (float)M_PI;

		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
			audioWrite(context, n, channel, out);
		}
		
		if(++gUpdateCount >= 1024) {
			gUpdateCount = 0;
			gPeriodNS -= 1000000LL;
			if(gPeriodNS <= 0)
				gPeriodNS = 500000000ULL;
			set_period(gPeriodNS);
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{
	if(gpio_unexport(gpioNumber0)) {
		printf("Warning: couldn't unexport GPIO pin %d\n", gpioNumber0);
	}

	int pruNumber = *((int *)userData);
	
    /* Disable PRU */
    prussdrv_pru_disable(pruNumber);
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

void set_period(uint64_t period_ns)
{
	// Set the period in nanoseconds (with a resolution of 20ns)
	// Write the value to the PRU which will use it in its loop
	// Each delay macro in the PRU code has 10ns on top of whatever
	// value is written, so subtract that off here. (Note that this
	// doesn't consider the time for the GPIO code itself to run.)
	
	uint64_t delay = period_ns / 20ULL - 20;
	
	gPRUCommunicationMem[PRU_COMM_USER_DELAY] = (uint32_t)delay;
}

/**
\example second-pru/render.cpp

Using the second PRU for your own code
--------------------------------------

The Bela environment uses one of the Programmable Real-time Units (PRUs) on the
BeagleBone Black to handle the data transfer to and from the analog, digital
and audio pins. The BeagleBone Black has two PRUs, leaving the second one free
for your use!

This example shows a simple GPIO sketch running on the second PRU, with communication
back to the main CPU. Because the 16 GPIOs used for the Bela digital pins are already
in use by the first PRU, we need to choose a different pin for this example. In this case,
GPIO 30 is used as an output to drive an LED.

To run this example, attach a resistor and LED in series between GPIO 30 and ground. You
should see the LED blink progressively faster, and when it becomes fast enough that it
cannot be seen blinking anymore, it resets to its original speed.

The PRU code for this exmaple can be found in pru_gpio.p. You need the program "pasm"
(PRU assembler) from the TI prussdrv library to compile it. The compiled version is found
in pru_gpio_bin.h. Which PRU this code runs on depends on which PRU is used by Bela.
This can be selected by passing the --pru-number flag to Bela; e.g. --pru-number=1
makes Bela use PRU 1 for its core code, leaving PRU 0 for the user code.
*/

