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
#include <ne10/NE10.h>					// neon library

int gFFTSize;

int gReadPointer = 0;
int gWritePointer = 0;

// FFT vars
static ne10_fft_cpx_float32_t* timeDomainIn;
static ne10_fft_cpx_float32_t* timeDomainOut;
static ne10_fft_cpx_float32_t* frequencyDomain;
static ne10_fft_cfg_float32_t cfg;

bool setup(BelaContext *context, void *userData)
{
    
    // Check that we have the same number of inputs and outputs.
	if(context->audioInChannels != context->audioOutChannels ||
			context->analogInChannels != context-> analogOutChannels){
		printf("Error: for this project, you need the same number of input and output channels.\n");
		return false;
	}
	
	// Retrieve a parameter passed in from the initAudio() call
	gFFTSize = *(int *)userData;

	timeDomainIn = (ne10_fft_cpx_float32_t*) NE10_MALLOC (gFFTSize * sizeof (ne10_fft_cpx_float32_t));
	timeDomainOut = (ne10_fft_cpx_float32_t*) NE10_MALLOC (gFFTSize * sizeof (ne10_fft_cpx_float32_t));
	frequencyDomain = (ne10_fft_cpx_float32_t*) NE10_MALLOC (gFFTSize * sizeof (ne10_fft_cpx_float32_t));
	cfg = ne10_fft_alloc_c2c_float32_neon (gFFTSize);

	memset(timeDomainOut, 0, gFFTSize * sizeof (ne10_fft_cpx_float32_t));

	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; n++) {
		timeDomainIn[gReadPointer].r = (ne10_float32_t) ((context->audioIn[n*context->audioInChannels] +
															context->audioIn[n*context->audioOutChannels+1]) * 0.5);
		timeDomainIn[gReadPointer].i = 0;

		if(++gReadPointer >= gFFTSize)
		{
			//FFT
			ne10_fft_c2c_1d_float32_neon (frequencyDomain, timeDomainIn, cfg, 0);

			//Do frequency domain stuff

			//IFFT
			ne10_fft_c2c_1d_float32_neon (timeDomainOut, frequencyDomain, cfg, 1);

			gReadPointer = 0;
			gWritePointer = 0;
		}

		for(unsigned int channel = 0; channel < context->audioOutChannels; channel++)
			context->audioOut[n * context->audioOutChannels + channel] = (float) timeDomainOut[gWritePointer].r;
		gWritePointer++;
	}
}

void cleanup(BelaContext *context, void *userData)
{
	NE10_FREE(timeDomainIn);
	NE10_FREE(timeDomainOut);
	NE10_FREE(frequencyDomain);
	NE10_FREE(cfg);
}


/**
\example FFT-audio-in/render.cpp

Fast Fourier Transform
----------------------

This sketch performs an FFT (Fast Fourier Transform) on incoming audio. It uses 
the NE10 library, included at the top of the file.

Read the documentation on the NE10 library [here](http://projectne10.github.io/Ne10/doc/annotated.html).

The variables `timeDomainIn`, `timeDomainOut` and `frequencyDomain` are 
variables of the struct `ne10_fft_cpx_float32_t` [http://projectne10.github.io/Ne10/doc/structne10__fft__cpx__float32__t.html](http://projectne10.github.io/Ne10/doc/structne10__fft__cpx__float32__t.html). 
These are declared at the top of the file, and memory is allocated 
for them in `setup()`.

In `render()` a `for` loop performs the FFT which is performed on each sample, 
and the resulting output is placed on each channel.
*/
