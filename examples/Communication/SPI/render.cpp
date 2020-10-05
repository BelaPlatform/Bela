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
#include <stdio.h>
#include <libraries/SPI/SPI.h>

const int busSpeedHz = 32000000; // Fastest speed available
const int csDelay = 0; // how long to delay after the last bit transfer before deselecting the device 
const int wordLength = 8;

AuxiliaryTask SPITask;
void readSPI(void*);
int readInterval = 50;// Change this to change how often SPI is read (in Hz)
int readCount = 0; // How long until we read again...
int readIntervalSamples; // How many samples between reads

unsigned char exampleOutput;

bool setup(BelaContext *context, void *userData)
{
	// Initialise SPI
	if (SPIDEV_init("/dev/spidev2.0", 0, busSpeedHz, SPI_SS_LOW,
                      csDelay, wordLength,
                      SPI_MODE3) == -1)
        printf("SPI initialization failed\r\n");
    else
        printf("SPI initialized - READY\r\n");
        
    // Set up auxiliary task to read SPI outside of the real-time audio thread:
    SPITask = Bela_createAuxiliaryTask(readSPI, 50, "bela-SPI");
    readIntervalSamples = context->audioSampleRate / readInterval;
	return true;
}

void render(BelaContext *context, void *userData)
{
    for(unsigned int n = 0; n < context->audioFrames; n++) {
		
        // Schedule auxiliary task for SPI readings
        if(++readCount >= readIntervalSamples) {
            readCount = 0;
            Bela_scheduleAuxiliaryTask(SPITask);
        }
	    
	    // use SPI output for whatever you need here
	    exampleOutput;
    }
}

// Auxiliary task to read SPI
void readSPI(void*)
{
	int transmissionLength = 4;
	unsigned char Tx_spi[transmissionLength];
	unsigned char Rx_spi[transmissionLength];
    Tx_spi[0] = 0xff;
    Tx_spi[1] = 0x22;
    Tx_spi[2] = 0xff;
    Tx_spi[3] = 0x0;

    if (SPIDEV_transfer(Tx_spi, Rx_spi, transmissionLength) == 0)
    {
    	// Print result
        printf("SPI: Transaction Complete. Sent %d bytes, received: ", transmissionLength);
    	int n = 0;
        for(n = 0; n < transmissionLength; ++n)
        {
            printf("%#02x ", Rx_spi[n]);
        }
        printf("\n");
        
        // Send first byte of result to audio thread via global variable
        exampleOutput = Rx_spi[0];
    }
    else
        printf("SPI: Transaction Failed\r\n");
}

void cleanup(BelaContext *context, void *userData)
{

}


/**
\example SPI/render.cpp

Reading a SPI device on the Bela Mini
-------------------------

This sketch initialises the second SPI device (SPI1) on the Bela mini, and reads data from it.

The SPI pins are:
P2-25: MOSI
P2-27: MISO
P2-29: CLK
P2-31: CS

To enable these pins for SPI you must first ssh into the Bela OS and run the following commands:
config-pin P2.25 spi
config-pin P2.27 spi
config-pin P2.29 spi_sclk
config-pin P2.31 spi_cs

The SPI readouts are then performed in an Auxiliary Task, seperate from the real-time audio thread.

*/
