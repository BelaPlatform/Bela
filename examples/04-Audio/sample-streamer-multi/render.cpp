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
#include <SampleStream.h>

#define NUM_CHANNELS 2    // NUMBER OF CHANNELS IN THE FILE
#define BUFFER_LEN 44100   // BUFFER LENGTH
#define NUM_STREAMS 20

SampleStream *sampleStream[NUM_STREAMS];
AuxiliaryTask gFillBuffersTask;
int gStopThreads = 0;
int gTaskStopped = 0;
int gCount = 0;

void fillBuffers(void*) {
    for(int i=0;i<NUM_STREAMS;i++) {
        if(sampleStream[i]->bufferNeedsFilled())
            sampleStream[i]->fillBuffer();
    }
}

bool setup(BelaContext *context, void *userData)
{
    
    for(int i=0;i<NUM_STREAMS;i++) {
        sampleStream[i] = new SampleStream("waves.wav",NUM_CHANNELS,BUFFER_LEN);
    }
    
    // Initialise auxiliary tasks
	if((gFillBuffersTask = Bela_createAuxiliaryTask(&fillBuffers, 90, "fill-buffer")) == 0)
		return false;

	return true;
}

void render(BelaContext *context, void *userData)
{

    // check if buffers need filling
    Bela_scheduleAuxiliaryTask(gFillBuffersTask);
    
    // ***** remove this -- it's just a demonstration
    // random playback toggling
    for(int i=0;i<NUM_STREAMS;i++) {
        // randomly pauses/unpauses + fades in/out streams
        if((rand() / (float)RAND_MAX)>0.9999)
            sampleStream[i]->togglePlaybackWithFade(0.1);
            // the above function can also be overloaded specifying the state
            // of playback to toggle - i.e. togglePlaybackWithFade(1,0.1)
            // same applies to togglePlayback()
        /*
         * demonstrates dynamically reloading samples
         * (TODO: this should really be done in a separate thread)
         */
        // if((rand() / (float)RAND_MAX)>0.9999) {
        //     // only change sample if sampleStream isn't playing
        //     if(!sampleStream[i]->isPlaying())
        //         sampleStream[i]->openFile("chimes_stereo.wav",NUM_CHANNELS,BUFFER_LEN);
        // }
    }
    // *****
    
    for(unsigned int n = 0; n < context->audioFrames; n++) {
        
        for(int i=0;i<NUM_STREAMS;i++) {
            // process frames for each sampleStream objects (get samples per channel below)
            sampleStream[i]->processFrame();
        }
        
    	for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
    	    
            float out = 0;
            for(int i=0;i<NUM_STREAMS;i++) {
                // get samples for each channel from each sampleStream object
                out += sampleStream[i]->getSample(channel);
            }
            // you may need to attenuate the output depending on the amount of streams playing back
            audioWrite(context, n, channel, out);
            
    	}
    	
    }
}


void cleanup(BelaContext *context, void *userData)
{
    for(int i=0;i<NUM_STREAMS;i++) {
        delete sampleStream[i];
    }
}


/**
\example sample-streamer-multi/render.cpp

Multiple playback of large wav files
---------------------------

This is an extension of the sampleStreamer example. Functionality of opening
files, managing buffers, retrieving samples etc. is built into the `sampleStream`
class, making it easier to have multiple playback streams at the same time.
Streams can be paused/unpaused with the option of fading in/out the playback.


*/
