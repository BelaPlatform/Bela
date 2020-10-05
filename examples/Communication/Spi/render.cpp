/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io

*/
/**

\example Communication/Spi/render.cpp

Reading a SPI device on the Bela Mini
-------------------------

This sketch initialises the second SPI device (SPI1) on the Bela Mini, and reads data from it.

The SPI pins are:
P2-25: MOSI
P2-27: MISO
P2-29: CLK
P2-31: CS

To enable these pins for SPI you must first run the following commands (e.g.:
in the console at the bottom of the Bela IDE, or via `ssh`)

config-pin P2.25 spi
config-pin P2.27 spi
config-pin P2.29 spi_sclk
config-pin P2.31 spi_cs

The SPI readouts are then performed in an Auxiliary Task, seperate from the real-time audio thread.

*/
/*
MIT License

Copyright (c) 2020 Jeremiah Rose

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

#include <Bela.h>
#include <stdio.h>
#include <libraries/Spi/Spi.h>

// Create a seperate thread to poll Spi from
AuxiliaryTask SpiTask;
void readSpi(void*); // Function to be called by the thread
float readInterval = 0.5;// How often readSpi() is run (in seconds)

int readCount = 0; // Used for scheduling, do not change
int readIntervalSamples; // How many samples between, do not change

Spi spiDevice;

unsigned char exampleOutput;

bool setup(BelaContext *context, void *userData)
{
	spiDevice.setup({
			.device = "/dev/spidev2.1", // Device to open
			.speed = 500000, // Clock speed in Hz
			.delay = 0, // Delay after last transfer before deselecting the device
			.numBits = 8, // No. of bits per transaction word
			.mode = Spi::MODE3 // Spi mode
			});

	// Set up auxiliary task to read Spi outside of the real-time audio thread:
	SpiTask = Bela_createAuxiliaryTask(readSpi, 50, "bela-Spi");
	readIntervalSamples = context->audioSampleRate * readInterval;
	return true;
}

// Runs every audio frame
void render(BelaContext *context, void *userData)
{
	// Runs every audio sample
	for(unsigned int n = 0; n < context->audioFrames; n++) {

		// Schedule auxiliary task for Spi readings
		if(++readCount >= readIntervalSamples) {
			readCount = 0;
			Bela_scheduleAuxiliaryTask(SpiTask);
		}

		// use Spi output for whatever you need here
		// exampleCalculation = (int) exampleOutput + 1;
	}
}

// Auxiliary task to read Spi
void readSpi(void*)
{
	// Example transmission
	int transmissionLength = 4; // Number of bytes to send/receive
	unsigned char Tx[transmissionLength]; // Buffer to send
	unsigned char Rx[transmissionLength]; // Buffer to receive into
	Tx[0] = 0xff; // Fill each byte of the send buffer
	Tx[1] = 0x22;
	Tx[2] = 0xff;
	Tx[3] = 0x0;

	if (spiDevice.transfer(Tx, Rx, transmissionLength) == 0)
	{
		// Print result
		printf("Spi: Transaction Complete. Sent %d bytes, received: ", transmissionLength);
		int n = 0;
		for(n = 0; n < transmissionLength; ++n)
			printf("%#02x ", Rx[n]);
		printf("\n");

		// Process received buffer. In this example we just send the first byte
		// to the audio thread via the global variable exampleOutput
		exampleOutput = Rx[0];
	}
	else
		fprintf(stderr, "Spi: Transaction Failed\r\n");
}

void cleanup(BelaContext *context, void *userData)
{
}
