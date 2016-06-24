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
#include <cmath>
#include <WriteFile.h>

WriteFile file1;
WriteFile file2;

bool setup(BelaContext *context, void *userData)
{
	file1.init("out.bin"); //set the file name to write to
	file1.setEchoInterval(1000);
	file1.setFileType(kBinary);
	file1.setFormat("%.4f %.4f\n"); // set the format that you want to use for your output. Please use %f only (with modifiers). When in binary mode, this is used only for echoing to console
	file2.init("out.m"); //set the file name to write to
	file2.setHeader("myvar=[\n"); //set one or more lines to be printed at the beginning of the file
	file2.setFooter("];\n"); //set one or more lines to be printed at the end of the file
	file2.setFormat("%.4f\n"); // set the format that you want to use for your output. Please use %f only (with modifiers)
	file2.setFileType(kText);
	file2.setEchoInterval(10000); // only print to the console 1 line every other 10000
	return true; 
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->analogFrames; n++) {
			file1.log(&(context->analogIn[n*context->analogFrames]), 2); // log an array of values
			file2.log(context->analogIn[n*context->analogFrames]); // log a single value
	}
}

// cleanup_render() is called once at the end, after the audio has stopped.
// Release any resources that were allocated in initialise_render().

void cleanup(BelaContext *context, void *userData)
{
    
}


/**
\example logging-sensors/render.cpp

Logging Sensor Data
---------------------------

This sketch demonstrates how to log sensor data for later processing or analysis
and requires more documentation.
*/

