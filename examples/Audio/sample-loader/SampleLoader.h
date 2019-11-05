/***** SampleLoader.h *****/

#include <Bela.h>
#include <libraries/sndfile/sndfile.h>				// to load audio files
#include <string>
#include <iostream>
#include <cstdlib>

// Load samples from file
int getSamples(std::string file, float *buf, int channel, int startFrame, int endFrame)
{
	SNDFILE *sndfile ;
	SF_INFO sfinfo ;
	sfinfo.format = 0;
	if (!(sndfile = sf_open (file.c_str(), SFM_READ, &sfinfo))) {
		std::cout << "Couldn't open file " << file << ": " << sf_strerror(sndfile) << std::endl;
		return 1;
	}

	int numChannelsInFile = sfinfo.channels;
	if(numChannelsInFile < channel+1)
	{
		std::cout << "Error: " << file << " doesn't contain requested channel" << std::endl;
		return 1;
	}
    
    int frameLen = endFrame-startFrame;
    
    if(frameLen <= 0 || startFrame < 0 || endFrame <= 0 || endFrame > sfinfo.frames)
	{
		std::cout << "Error: " << file << " invalid frame range requested" << std::endl;
		return 1;
	}
    
    sf_seek(sndfile,startFrame,SEEK_SET);
    
    float* tempBuf = new float[frameLen*numChannelsInFile];
    
	int readcount = sf_read_float(sndfile, tempBuf, frameLen*numChannelsInFile); //FIXME

	// Pad with zeros in case we couldn't read whole file
	for(int k = readcount; k <frameLen*numChannelsInFile; k++)
		tempBuf[k] = 0;
	
	for(int n=0;n<frameLen;n++)
	    buf[n] = tempBuf[n*numChannelsInFile+channel];
	delete[] tempBuf;

	sf_close(sndfile);

	return 0;
}

int getNumChannels(std::string file) {
    
	SNDFILE *sndfile ;
	SF_INFO sfinfo ;
	sfinfo.format = 0;
	if (!(sndfile = sf_open (file.c_str(), SFM_READ, &sfinfo))) {
		std::cout << "Couldn't open file " << file << ": " << sf_strerror(sndfile) << std::endl;
		return -1;
	}

	return sfinfo.channels;
}

int getNumFrames(std::string file) {
    
	SNDFILE *sndfile ;
	SF_INFO sfinfo ;
	sfinfo.format = 0;
	if (!(sndfile = sf_open (file.c_str(), SFM_READ, &sfinfo))) {
		std::cout << "Couldn't open file " << file << ": " << sf_strerror(sndfile) << std::endl;
		return -1;
	}

	return sfinfo.frames;
}

