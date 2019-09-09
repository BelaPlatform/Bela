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


// setup() is called once before the audio rendering starts.
// Use it to perform any initialisation and allocation which is dependent
// on the period size or sample rate.
//
// Return true on success; returning false halts the program.
bool setup(BelaContext *context, void *userData)
{
	return true;
}

// render() is called regularly at the highest priority by the audio engine.
// Input and output are given from the audio hardware and the other
// ADCs and DACs (if available).
void render(BelaContext *context, void *userData)
{

}

// cleanup() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in setup().
void cleanup(BelaContext *context, void *userData)
{

}


/**

\example minimal/render.cpp

The bare bones
----------------------

The structure of a render.cpp file
----------------------------------
A render.cpp file has three functions: `setup()`, `render()` and `cleanup()`.

`setup()` is an initialisation function which runs before audio rendering begins. 
It is called once when the project starts. Use it to prepare any memory or 
resources that will be needed in `render()`.

`render()` is a function that is regularly called, over and over continuously, at 
the highest priority by the audio engine. It is used to process audio and 
sensor data. This function is called regularly by the system every time there 
is a new block of audio and/or sensor data to process.

`cleanup()` is a function that is called when the program stops, to finish up any 
processes that might still be running.

Here we will briefly explain each function and the structure of the render.cpp 

Before any of the functions
---------------------------
At the top of the file, include any libraries you might need.

Additionally, declare any global variables. In these tutorial sketches, all 
global variables are preceded by a `g` so we always know which variables are 
global - `gSampleData`, for example. It's not mandatory but is a really good way 
of keeping track of what's global and what's not.

Sometimes it's necessary to access a variable from another file, such as 
main.cpp. In this case, precede this variable with the keyword `extern`.

Function arguments
------------------
`setup()`, `render()` and `cleanup()` each take the same arguments. These are:

`BelaContext *context`
`void *userData`

These arguments are pointers to data structures. The main one that's used is 
`context`, which is a pointer to a data structure containing lots of information 
you need.

Take a look at what's in the data structure in the API reference tab.

You can access any of these bits of information about current audio and sensor 
settings and pointers to data buffers that are contained in the data structure 
like this: `context->name_of_item`.

For example, `context->audioInChannels` returns the number of audio input channels. 
`context->audioSampleRate` returns the audio sample rate. 
`context->audioIn[n]` would give you the current input sample (assuming that 
your input is mono - if it's not you will have to account for multiple channels).

Note that `audioIn`, `audioOut`, `analogIn`, `analogOut` are all arrays (buffers).

*/
