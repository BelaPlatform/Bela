/*
 * spear_parser.h v1.2
 *
 *  Created on: May 6, 2014
 *      Author: Victor Zappi
 */

#ifndef SPEAR_PARSER_H_
#define SPEAR_PARSER_H_

#include <iostream>
#include <fstream>
#include <cstring>
#include <string>
#include <stdlib.h>		// atoi, atof
#include <math.h>
#include <algorithm>	// std::fill

#include <sys/time.h>

using namespace std;


//------------------------------------------------------------------------------------------------
// partials
//------------------------------------------------------------------------------------------------

class Spear_parser; // for class friendship

class Partials
{
	friend class Spear_parser;
	friend class Dbox_parser;

public:
	int **partialSamples;				// sample at which each frame is
	float **partialFrequencies;			// frequencies at each frame
	float **partialAmplitudes;			// amplitudes at each frame
	unsigned int *partialNumFrames;		// Length of each partial in frames
	unsigned int *partialStartFrame;	// frame at which each partial begins
	float **partialFreqDelta;			// constant frequency slope for each partial in each frame interval
	float **partialAmpDelta;			// constant amplitude slope for each partial in each frame interval
	float *partialFreqMean;				// frequency mean for each partial, over all its frames

	unsigned short *activePartialNum;	// num of each active partial at each frame
	unsigned int **activePartials;		// indices of all active partials at each frame


	int getPartialNum();
	int getHopNum();
	int getMaxActivePartialNum();

private:
	Partials();
	~Partials();

	unsigned int *partialStartSample;	// sample at which each partial begins
	unsigned int *partialEndSample;		// sample at which each partial ends [sample gap between 2 consecutive frames can be an integer multiple of hopSize]
	unsigned int parNum;
	unsigned int currentSample;
	unsigned int hopSize;
	unsigned int hopNum;
	unsigned int maxActiveParNum;

	void init(int parNum, int hopSize, bool isDBX=false);
	void update(int parIndex, int frameNum);
	void setFreqDelta(int parIndex, int frameNum, double delta);
	void setAmpDelta(int parIndex, int frameNum, double delta);
	void setHopNum(int hopNum);
};

inline int Partials::getPartialNum()
{
	return parNum;
}

inline void Partials::setHopNum(int hopN)
{
	hopNum = hopN;

	// prepare data structures
	activePartialNum 	= new unsigned short[hopNum+1];	// +1 cos total num of frames = num of hops+1
	activePartials	 	= new unsigned int *[hopNum+1];
}

// useful to increase current sample using a modulo on the total number of samples [easy to be deduced from the total num or hops]
inline int Partials::getHopNum()
{
	return hopNum;
}

inline void Partials::setFreqDelta(int parIndex, int frameNum, double delta)
{
	partialFreqDelta[parIndex][frameNum] = delta;
}

inline void Partials::setAmpDelta(int parIndex, int frameNum, double delta)
{
	partialAmpDelta[parIndex][frameNum] = delta;
}

inline int Partials::getMaxActivePartialNum()
{
	return maxActiveParNum;
}







//------------------------------------------------------------------------------------------------
// spear parser
//------------------------------------------------------------------------------------------------

class Spear_parser
{
public:
	Spear_parser();
	~Spear_parser();

	Partials partials;

	bool parseFile(string filename, int hopsize=-1, int samplerate = 44100);
	bool parseFile(char *filename, int hopsize=-1, int samplerate = 44100);
	int getHopSize();
	int getFileSampleRate();
	double getDeltaTime();

private:

	int hopSize;
	int fileSampleRate;
	double deltaTime;	// min time gap between consecutive frames

	timeval start, stop;
	unsigned long hopSizeT, parserT, staticT;

	void calculateDeltaTime();
	void calculateHopSize(char *filename);
	bool parser(char *filename, int hopsize=-1, int samplerate=44100);
	bool DBXparser(char *filename, int samplerate=44100);
	bool TXTparser(char *filename, int hopsize=-1, int samplerate=44100);
	int fromTimeToSamples(float time);
	int interpolateSamples(int parIndex, int *frameIndex, int missCnt, int nextSample,
							double nextFreq, double nextAmp, double *prevFreq, double *prevAmp);
	void staticCalculations();

};

inline bool Spear_parser::parseFile(string filename, int hopsize, int samplerate)
{
	return parser((char *)filename.c_str(), hopsize, samplerate);
}

inline bool Spear_parser::parseFile(char *filename, int hopsize, int samplerate)
{
	return parser(filename, hopsize, samplerate);
}

inline void Spear_parser::calculateDeltaTime()
{
	deltaTime = (double)hopSize/ (double)fileSampleRate;
}

// each time value in the file is rounded, and 2 consecutive frames can differ of a time gap = i*deltaTime, where i is a positive integer
inline int Spear_parser::fromTimeToSamples(float time)
{
	return round(time/deltaTime)*hopSize;	// round is necessary since in the file log time values are rounded, so they do not apparently look like integer multiples of deltaTime
}

inline int Spear_parser::getHopSize()
{
	return hopSize;
}

inline int Spear_parser::getFileSampleRate()
{
	return fileSampleRate;
}

inline double Spear_parser::getDeltaTime()
{
	return deltaTime;
}

#endif /* SPEAR_PARSER_H_ */
