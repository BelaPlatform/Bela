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
#include <libraries/AudioFile/AudioFile.h>
#include <vector>

std::string gFilename = "waves.wav";
int gStartFrame = 44100;
int gEndFrame = 88200;

std::vector<std::vector<float> > gSampleData;

int gReadPtr;	// Position of last read sample from file

bool setup(BelaContext *context, void *userData)
{
	gSampleData = AudioFileUtilities::load(gFilename, gStartFrame, gEndFrame - gStartFrame);
	return true;
}

void render(BelaContext *context, void *userData)
{
    for(unsigned int n = 0; n < context->audioFrames; n++) {
        
        // Increment read pointer and reset to 0 when end of file is reached
        if(++gReadPtr > gSampleData[0].size())
            gReadPtr = 0;

    	for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
    	    // Wrap channel index in case there are more audio output channels than the file contains
		float out = gSampleData[channel%gSampleData.size()][gReadPtr];
    		audioWrite(context, n, channel, out);
    	}
    }
}


void cleanup(BelaContext *context, void *userData)
{
}


/**
\example sample-loader/render.cpp

Simple Sample Loader
--------------------------------

This example loads a specified range of samples from a file into a buffer using a
helper function provided in libraries/AudioFile/AudioFile.h. This should be used when working
with small wav files. See sampleStreamer and sampleStreamerMulti for more elaborate ways
of loading and playing back larger files.
*/
