/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Multichannel/multichannel-player/render.cpp

Mutichannel File Player
=======================

This example streams a multi-channel wav file to its respective audio outputs.

The example is essentially the same as \example Audio/sample-streamer as the AudioFile library
can handle an arbitrary number of channels and it has been added to serve as ane example
for multichannel files.

The provided wav file is an 8-channel wav with different detuned oscillators that are amplitude-modulated by LFOs
at different rates. Each oscillator is assigned to a different channel.

If WALK_CHANNELS is defined then channels on the file will be played one by one independenty for each playback cycle.
**/
#include <Bela.h>
#include <libraries/AudioFile/AudioFile.h>
#include <vector>

#define BUFFER_LEN 22050   // BUFFER LENGTH
// #define WALK_CHANNELS // If defined, play channels one by one

std::string gFilename = "eight_modulated_oscillators.wav";
int gNumFramesInFile;
int gNumChannelsInFile;

// Two buffers for each channel:
// one of them loads the next chunk of audio while the other one is used for playback
std::vector<std::vector<float> > gSampleBuf[2];

// read pointer relative current buffer (range 0-BUFFER_LEN)
// initialise at BUFFER_LEN to pre-load second buffer (see render())
int gReadPtr = BUFFER_LEN;
// read pointer relative to file, increments by BUFFER_LEN (see fillBuffer())
int gBufferReadPtr = 0;
// keeps track of which buffer is currently active (switches between 0 and 1)
int gActiveBuffer = 0;
// this variable will let us know if the buffer doesn't manage to load in time
int gDoneLoadingBuffer = 1;

AuxiliaryTask gFillBufferTask;

void fillBuffer(void*) {

    // increment buffer read pointer by buffer length
    gBufferReadPtr+=BUFFER_LEN;

    // reset buffer pointer if it exceeds the number of frames in the file
    if(gBufferReadPtr>=gNumFramesInFile)
        gBufferReadPtr=0;

    int endFrame = gBufferReadPtr + BUFFER_LEN;
    int zeroPad = 0;

    // if reaching the end of the file take note of the last frame index
    // so we can zero-pad the rest later
    if((gBufferReadPtr+BUFFER_LEN)>=gNumFramesInFile-1) {
          endFrame = gNumFramesInFile-1;
          zeroPad = 1;
    }

    for(unsigned int ch=0; ch < gSampleBuf[0].size(); ch++) {

        // fill (nonactive) buffer
        AudioFileUtilities::getSamples(gFilename,gSampleBuf[!gActiveBuffer][ch].data(),ch
                    ,gBufferReadPtr,endFrame);

        // zero-pad if necessary
        if(zeroPad) {
            int numFramesToPad = BUFFER_LEN - (endFrame-gBufferReadPtr);
            for(int n=0;n<numFramesToPad;n++)
                gSampleBuf[!gActiveBuffer][ch][n+(BUFFER_LEN-numFramesToPad)] = 0;
        }

    }

    gDoneLoadingBuffer = 1;

    //printf("done loading buffer!\n");

}

bool setup(BelaContext *context, void *userData)
{

    // Initialise auxiliary tasks
	if((gFillBufferTask = Bela_createAuxiliaryTask(&fillBuffer, 90, "fill-buffer")) == 0)
		return false;

    gNumFramesInFile = AudioFileUtilities::getNumFrames(gFilename);
    if(gNumFramesInFile <= 0)
        return false;
    if(gNumFramesInFile <= BUFFER_LEN) {
        printf("Sample needs to be longer than buffer size. This example is intended to work with long samples.");
        return false;
    }

    gNumChannelsInFile = AudioFileUtilities::getNumChannels(gFilename);
    printf("Number of channels in file: %d\n", gNumChannelsInFile);

	gSampleBuf[0] = AudioFileUtilities::load(gFilename, BUFFER_LEN, 0);
	gSampleBuf[1] = gSampleBuf[0]; // initialise the inactive buffer with the same channels and frames as the first one

	return true;
}

void render(BelaContext *context, void *userData)
{
#ifdef WALK_CHANNELS
	// Set current channel
	static int currentChannel = 0;
#endif

    for(unsigned int n = 0; n < context->audioFrames; n++) {

        // Increment read pointer and reset to 0 when end of file is reached
        if(++gReadPtr >= BUFFER_LEN) {
            if(!gDoneLoadingBuffer)
                rt_printf("Couldn't load buffer in time :( -- try increasing buffer size!");
            gDoneLoadingBuffer = 0;
            gReadPtr = 0;
#ifdef WALK_CHANNELS
	    // Increment current channel and wrap around number of channels in file
	    currentChannel++;
	    if(currentChannel >= gNumChannelsInFile)
		currentChannel = 0;
#endif
            gActiveBuffer = !gActiveBuffer;
            Bela_scheduleAuxiliaryTask(gFillBufferTask);

        }

    	for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
    	    // Wrap channel index in case there are more audio output channels than the file contains
#ifdef WALK_CHANNELS
		float out = 0.0;
		// Play only active channel
		if(channel ==  currentChannel)
			out = gSampleBuf[gActiveBuffer][channel%gSampleBuf[0].size()][gReadPtr];
#else
		float out = gSampleBuf[gActiveBuffer][channel%gSampleBuf[0].size()][gReadPtr];
#endif

    		audioWrite(context, n, channel, out);
    	}

    }
}


void cleanup(BelaContext *context, void *userData)
{
}
