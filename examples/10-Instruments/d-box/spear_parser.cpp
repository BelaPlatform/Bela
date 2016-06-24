/*
 * spear_parser.cpp v1.2
 *
 *  Created on: May 6, 2014
 *      Author: Victor Zappi
 */

#include "spear_parser.h"

using namespace std;

//#define DO_CHECKS

//------------------------------------------------------------------------------------------------
// partials
//------------------------------------------------------------------------------------------------

Partials::Partials()
{
	partialFrequencies	= NULL;
//	partialAmplitudes	= NULL;
//	partialNumFrames	= NULL;
//	partialStartSample	= NULL;
//	partialEndSample	= NULL;
//	partialCurrentFrame	= NULL;
//	partialFreqDelta	= NULL;
//	partialAmpDelta	= NULL;


	activePartialNum	= NULL;
//	activePartials		= NULL;

	currentSample = -1;
}

Partials::~Partials()
{
	if(partialFrequencies != NULL)			// check on one is enough
	{
		if(partialFrequencies[0] != NULL)	// check on one is enough
		{
			for(unsigned int i=0; i<parNum; i++)
			{
				delete[] partialFrequencies[i];
				delete[] partialAmplitudes[i];
				delete[] partialFreqDelta[i];
				delete[] partialAmpDelta[i];

			}
		}

		delete[] partialFrequencies;
		delete[] partialAmplitudes;
		delete[] partialNumFrames;
		delete[] partialFreqDelta;
		delete[] partialAmpDelta;
		delete[] partialFreqMean;
	}

	if(activePartialNum != NULL)
	{
		for(unsigned int i=0; i<hopNum+1; i++)
			delete[] activePartials[i];

		delete[] activePartialNum;
		delete[] activePartials ;
	}
}

void Partials::init(int parN, int hopS, bool isDBX)
{
	if(!isDBX)
	{
		parNum	= parN;
		hopSize	= hopS;

		partialFrequencies	= new float *[parNum];
		partialAmplitudes	= new float *[parNum];
		partialNumFrames	= new unsigned int[parNum];
		partialStartFrame	= new unsigned int[parNum];
		partialStartSample	= new unsigned int[parNum];
		partialEndSample	= new unsigned int[parNum];
		partialFreqDelta	= new float *[parNum];
		partialAmpDelta		= new float *[parNum];
		partialFreqMean		= new float[parNum];



		// init in one shot
		fill(partialFreqMean, partialFreqMean+parNum, 0);			// mean is zero

		partialFrequencies[0] 	= NULL;								// for free check
	}
	else
	{
		parNum	= parN;
		hopSize	= hopS;

		partialFrequencies	= new float *[parNum];
		partialAmplitudes	= new float *[parNum];
		partialNumFrames	= new unsigned int[parNum];
		partialStartFrame	= new unsigned int[parNum];
		partialFreqDelta	= new float *[parNum];
		partialAmpDelta		= new float *[parNum];
		partialFreqMean		= new float[parNum];

		partialFrequencies[0] 	= NULL;								// for free check
	}
}



void Partials::update(int parIndex, int frameNum)
{
	partialFrequencies[parIndex] = new float[frameNum];
	partialAmplitudes[parIndex]	 = new float[frameNum];
	partialFreqDelta[parIndex]	 = new float[frameNum];
	partialAmpDelta[parIndex]	 = new float[frameNum];

	fill(partialFreqDelta[parIndex], partialFreqDelta[parIndex]+frameNum, 99999.0);	// in the end, only the last one will have 99999
	fill(partialAmpDelta[parIndex], partialAmpDelta[parIndex]+frameNum, 99999.0);	// in the end, only the last one will have 99999
}




















//------------------------------------------------------------------------------------------------
// spear parser
//------------------------------------------------------------------------------------------------
Spear_parser::Spear_parser()
{
	// some default values
	hopSize			= -1;
	fileSampleRate	= -1;
}

Spear_parser::~Spear_parser()
{
}

void Spear_parser::calculateHopSize(char *filename)
{
	int index 		= 0;
	bool prevWas_ 	= false;
	bool found_h	= false;
	int n 			= 0;

	hopSize 		= 0;

	do
	{
		// check if '_'
		if(filename[index] == '_')
			prevWas_ = true;
		else if( (filename[index] == 'h') && prevWas_) // if it is not, but it is 'h' and previous was '_', found "_h"!
		{
			found_h = true;
			while(filename[index] != '\0')
			{
				index++;
				if( (filename[index] == '.') || (filename[index] == '_'))
					break;
				else // i am not checking if char are digits...!
				{
					n = filename[index];
					hopSize =  hopSize*10+(n-48);
				}
			}
		}
		else	// else, nothing
			prevWas_ = false;
		index++;
	}
	while( (filename[index] != '\0') && !found_h );

	if( !found_h || (hopSize<1) )
		hopSize = 551;	// default val

}


bool Spear_parser::parser(char *filename, int hopsize, int samplerate)
{
	string name = string(filename);
	int len		= name.length();
	// invoke correct parser according to the type of file...just checking the extension, crude but functional
	if( (name[len-4]=='.') && (name[len-3]=='d') && (name[len-2]=='b') && (name[len-1]=='x') )
		return DBXparser(filename, samplerate);				// .dbox
	else
		return TXTparser(filename, hopSize, samplerate);	// .txt, or whatever
}


bool Spear_parser::DBXparser(char *filename, int samplerate)
{
	fileSampleRate 	= samplerate;

	// working vars
	int parNum		= 0;	// total num of partials
	int hopNum		= 0;	// total num of hops

	//----------------------------------------------------------------------------------------
	// open a file
	ifstream fin;
	fin.open(filename, ios::in | ios::binary);
	if (!fin.good())
	{
		cout << "Parser Error: file not found" << endl;	// exit if file not found
		return false;
	}

	gettimeofday(&start, NULL);
	//----------------------------------------------------------------------------------------
	// general data

	// look for partial count
	fin.read((char *) &parNum, sizeof(int));
	partials.parNum 		= parNum;

	// look for hop count
	fin.read((char *) &hopNum, sizeof(int));
	partials.setHopNum(hopNum);

	// look for hop size
	fin.read((char *) &hopSize, sizeof(int));
	partials.hopSize 		= hopSize;		// it's handy for both classes to know it

	// init partials data structure
	partials.init(parNum, hopSize, true);

	// look for max active par num
	fin.read((char *) &(partials.maxActiveParNum), sizeof(int));



	// partial data

	// start frame of each partial
	fin.read((char *) partials.partialStartFrame, sizeof(int)*parNum);

	// num of frames of each partial
	fin.read((char *) partials.partialNumFrames, sizeof(int)*parNum);

	// frequency mean of each partial
	fin.read((char *) partials.partialFreqMean, sizeof(int)*parNum);

	for(int par=0; par<parNum; par++)
	{
		int frameNum = partials.partialNumFrames[par];
		partials.update(par, frameNum);
		fin.read((char *)partials.partialAmplitudes[par], sizeof(float)*frameNum);		// amplitude of each partial in each frame
		fin.read((char *)partials.partialFrequencies[par], sizeof(float)*frameNum);		// frequency of each partial in each frame
		fin.read((char *)partials.partialAmpDelta[par], sizeof(float)*frameNum);			// amplitude delta of each partial in each frame
		fin.read((char *)partials.partialFreqDelta[par], sizeof(float)*frameNum);			// frequency delta of each partial in each frame
	}




	// frame data

	// number of active partial per each frame
	fin.read((char *) partials.activePartialNum, sizeof(short)*(hopNum+1));
	// init array
	for(int frame=0; frame<hopNum+1; frame++)
	{
		partials.activePartials[frame] = new unsigned int[partials.activePartialNum[frame]];
		fin.read((char *)partials.activePartials[frame], sizeof(int)*partials.activePartialNum[frame]);			// active partials per each frame
	}





	gettimeofday(&stop, NULL);
	parserT = ( (stop.tv_sec*1000000+stop.tv_usec) - (start.tv_sec*1000000+start.tv_usec) );


	printf("\n-----------------------\n");
	printf("\nFile: %s\n", filename);
	printf("\n-----------------------\n");
	printf("Profiler\n");
	printf("-----------------------\n");
	printf("File parser:\t\t\t%lu usec\n", parserT);
	printf("\n\nTotal:\t\t%lu usec\n", parserT);
	printf("-----------------------\n");

	fin.close();

	return true;
}




bool Spear_parser::TXTparser(char *filename, int hopsize, int samplerate)
{
	hopSize 		= hopsize;
	fileSampleRate 	= samplerate;
	if(hopsize<0)
	{
		gettimeofday(&start, NULL);
		calculateHopSize(filename);
		gettimeofday(&stop, NULL);
		hopSizeT = ( (stop.tv_sec*1000000+stop.tv_usec) - (start.tv_sec*1000000+start.tv_usec) );
	}
	else
		hopSizeT = 0;

	calculateDeltaTime();

	// working vars
	char * token;			// where to save single figures from file
	string s		= "";	// where to save lines from file
	int parNum		= 0;	// total num of partials
	int parIndex	= -1;	// index of current partial
	int frameNum	= 0;	// total num of frames
	int frameIndex	= -1;	// index of current frame
	int startSample	= -1;	// sample value for first frame of partials
	int endSample	= -1;	// sample value for last frame of partials
	int maxSample	= 0;	// to calculate total number of hops in file
	int missSampCnt = 0;	// number of mising samples
	double freq		= 0;	// to calculate frequency delta
	double prevFreq	= 0;	// to calculate frequency delta
	double amp		= 0;	// to calculate amplitude delta
	double prevAmp	= 0;	// to calculate amplitude delta


	//----------------------------------------------------------------------------------------
	// open a file
	ifstream fin;
	fin.open(filename);
	if (!fin.good())
	{
		cout << "Parser Error: file not found" << endl;	// exit if file not found
		return false;
	}

	gettimeofday(&start, NULL);
	//----------------------------------------------------------------------------------------
	// init partials data structure
	getline(fin, s);
	getline(fin, s);
	getline(fin, s);	// third line is the first we are interested into

	// look for partial count
	token = strtok((char *)s.c_str(), " ");
	// check if first token is there
	if(token)
	{
		token = strtok(0, " ");
		// check if second token is there
		if(token)
			parNum = atoi(token);
		#ifdef DO_CHECKS
		else
		{
			cout << "Parser Error: partial count not found, bad file format" << endl;	// exit if value not found
			return false;
		}
		#endif
	}
	#ifdef DO_CHECKS
	else
	{
		cout << "Parser Error: partial count not found, bad file format" << endl;		// exit if value not found
		return false;
	}
	#endif
	// from now on we take for granted that format is correct

	// init partials data structure
	partials.init(parNum, hopSize);

	//----------------------------------------------------------------------------------------
	// fill in partials data structure
	getline(fin, s);		// get rid of intro line "partials-data"
	getline(fin, s);		// first important line

	while (!fin.eof())
	{
		//-------------------------------------
		// partial specific info
		token		= strtok((char *)s.c_str(), " ");
		parIndex	= atoi(token);						// partial index

		token		= strtok(0, " ");					// num of frames, not used, cos we will do linear interpolation for missing frames
//		frameNum	= atoi(token);
//		partials.partialNumFrames[parIndex]	= frameNum;

		token		= strtok(0, " ");					// time of first frame, still char *
		startSample = fromTimeToSamples(atof(token));	// convert time to samples
		partials.partialStartSample[parIndex]	= startSample;

		token		= strtok(0, " ");					// time of last frame, still char *
		endSample	= fromTimeToSamples(atof(token)); 	// convert time to samples
		partials.partialEndSample[parIndex]		= endSample;

		frameNum	= ((endSample-startSample)/hopSize) + 1;	// num of frames, including missing consecutive ones [+1 one cos we count frames, not hops]
		partials.partialNumFrames[parIndex]		= frameNum;


		// check if this is the highest sample value so far
		if(endSample > maxSample)
			maxSample = endSample;

		// update data structure
		partials.update(parIndex, frameNum);


		//-------------------------------------
		// frames
		getline(fin, s);
		token		= strtok((char *)s.c_str(), " ");	// frame time
		frameIndex	= -1;

		// unroll first iteration, so that in the following loop we save the check on the last frame to calculate increments
		if(token)						// all frames data are on one line, in groups of 3 entries
		{
			frameIndex++;

			endSample	= fromTimeToSamples(atof(token));

			token		= strtok(0, " ");	// frame frequency
			prevFreq	= atof(token);
			partials.partialFrequencies[parIndex][frameIndex]	= (float)prevFreq;
			partials.partialFreqMean[parIndex] 					+= prevFreq;		// for frequency mean

			token	 	= strtok(0, " ");	// frame amplitude
			prevAmp  	= atof(token);
			partials.partialAmplitudes[parIndex][frameIndex]	= (float)prevAmp;

			token 		= strtok(0, " ");	// next frame frequency, to be checked
		}

		// here the loop starts
		while(token)						// all frames data are on one line, in groups of 3 entries
		{
			frameIndex++;
			missSampCnt 	= 0;

			startSample		= fromTimeToSamples(atof(token));

			token			= strtok(0, " ");	// frame frequency
			freq			= atof(token);

			token			= strtok(0, " ");	// frame amplitude
			amp				= atof(token);
			// now we know all about the current frame, but we want to know if some frames are missing between this and the last one

			// while current frame sample is farther than one hopsize...
			while(startSample > endSample+hopSize)
			{
				missSampCnt++;				// ...one sample is missing
				endSample += hopSize;		// move to next hop
			}

			// if frames are missing do interpolation and update indices
			if(missSampCnt>0)
				startSample = interpolateSamples(parIndex, &frameIndex, missSampCnt, endSample+hopSize, freq, amp, &prevFreq, &prevAmp);

			partials.partialFrequencies[parIndex][frameIndex]	= (float)freq;
			partials.partialFreqMean[parIndex] 					+= freq;			// for frequency mean
			partials.setFreqDelta(parIndex, frameIndex-1, (freq-prevFreq)/hopSize);	// freq delta between prev and current frame
			prevFreq 	= freq;

			partials.partialAmplitudes[parIndex][frameIndex]	= (float)amp;
			partials.setAmpDelta(parIndex, frameIndex-1, (amp-prevAmp)/hopSize);	// amp delta between prev and current frame
			prevAmp		= amp;

			endSample	= startSample;
			token		= strtok(0, " ");	// next frame frequency, to be checked
		}
		#ifdef DO_CHECKS
		if(frameIndex != (frameNum-1))
		{
			cout << "Parser Error: frame count mismatch on partial " << parIndex << ", bad file format"  << endl;	// exit if mismatch
			cout << "frameIndex: " << frameIndex << endl;
			cout << "frameNum: " << frameNum << endl;
			return false;
		}
		#endif

		partials.partialFreqMean[parIndex] /= partials.partialNumFrames[parIndex];									// frequency mean

		getline(fin, s);					// next partial line, to check
	}
	#ifdef DO_CHECKS
	if(parIndex != (parNum-1))
	{
		cout << "Parser Error: partial count mismatch, bad file format"  << endl;									// exit if mismatch
		return false;
	}
	#endif

	partials.setHopNum(maxSample/hopSize);

	gettimeofday(&stop, NULL);
	parserT = ( (stop.tv_sec*1000000+stop.tv_usec) - (start.tv_sec*1000000+start.tv_usec) );

	gettimeofday(&start, NULL);
	staticCalculations();
	gettimeofday(&stop, NULL);
	staticT = ( (stop.tv_sec*1000000+stop.tv_usec) - (start.tv_sec*1000000+start.tv_usec) );

	fin.close();


	printf("\n-----------------------\n");
	printf("\nFile: %s\n", filename);
	printf("\n-----------------------\n");
	printf("Profiler\n");
	printf("-----------------------\n");
	printf("Hop size parser:\t\t%lu usec\n", hopSizeT);
	printf("File parser:\t\t\t%lu usec\n", parserT);
	printf("Static calculations:\t\t%lu usec\n", staticT);
	printf("\n\nTotal:\t\t%lu usec\n", hopSizeT+parserT+staticT);
	printf("-----------------------\n");

	return true;
}


int Spear_parser::interpolateSamples(int parIndex, int *frameIndex, int missCnt, int nextSample, double nextFreq, double nextAmp, double *prevFreq, double *prevAmp)
{
	int frame			= *frameIndex;						// current frame index
	int sample			= nextSample - (hopSize*(missCnt)); // move from next real frame sample to first missing frame sample
	double freq			= *prevFreq;						// freq of the prev real frame
	double freqStep		= (nextFreq-*prevFreq)/(missCnt+1);	// fixed freq step between hops, for missing frames [linear interpolation]
	double deltaFreq	= freqStep/hopSize;					// fixed hop freq step in samples
	double amp			= *prevAmp;							// same for amp...
	double ampStep		= (nextAmp-*prevAmp)/(missCnt+1);
	double deltaAmp		= ampStep/hopSize;

	// for each missing frame
	for(int i=0; i<missCnt; i++)
	{
		// calculate values for current missing frame
		freq	+= freqStep;
		amp		+= ampStep;
		// save values
		partials.partialFrequencies[parIndex][frame]	= freq;
		partials.partialAmplitudes[parIndex][frame]		= amp;
		partials.partialFreqMean[parIndex]				+= freq;	// for frequency mean
		// set deltas of previous frame [real or missing]
		partials.setFreqDelta(parIndex, frame-1, deltaFreq);
		partials.setAmpDelta(parIndex, frame-1, deltaAmp);
		// move to next frame [missing or real]
		sample += hopSize;
		frame++;
	}

	// update global values
	*frameIndex	= frame;
	*prevFreq	= freq;
	*prevAmp	= amp;

	return sample;	// return the frame sample of the next real frame
}



// for each frame, statically calculate:
// - which partial is active [and the total num of active partials]
// - at which local frame each partial is
void Spear_parser::staticCalculations()
{
	partials.maxActiveParNum = 0;				// init to find maximum

	unsigned short *indices	= new unsigned short[partials.parNum];	// temp array to store up to the maximum num of active partial indices
	unsigned int activeCnt	= 0;						// counts the num of active partials in each frame

	unsigned int frameSample = 0;						// current frame in samples

	char *partialStarted = new char [partials.parNum];	// index of the last local frame found per each partial
	fill(partialStarted, partialStarted+partials.parNum, 0);

	for(unsigned int i=0; i<partials.hopNum+1; i++)		// for each frame [not hops, this explains the +1]
	{
		//partials.localPartialFrames[i] = new int[partials.parNum];	// init all local frames to -1
		//fill(partials.localPartialFrames[i], partials.localPartialFrames[i]+partials.parNum, -1);

		frameSample = i*hopSize;	// current frame, expressed in samples
		activeCnt	  = 0;			// reset a each frame

		for(unsigned int j=0; j<partials.parNum; j++)	// for each partial
		{
			// check if inside active time region [expressed in samples]
			if( (frameSample>=partials.partialStartSample[j]) && (frameSample<partials.partialEndSample[j]) )	// frame sample not equal to end sample, this filters out last frames and partials with one frame only
			{
				// activity
				indices[activeCnt] = j;	// save active index
				activeCnt++;			// increase counter

				// partial local frames
				if(partialStarted[j]==0)	// this partial has just started, so current local frame is first frame
				{
					partialStarted[j] 		 		= 1;
					partials.partialStartFrame[j]	= i;	// here is the number of the first frame
				}
			}
		}

		// activity
		partials.activePartialNum[i] = activeCnt;							// save number of active partials for this frame
		partials.activePartials[i]	 = new unsigned int[activeCnt];					// set correct size to save all indices

		// look for maximum number of active partials at the same time
		if(activeCnt > partials.maxActiveParNum)
			partials.maxActiveParNum = activeCnt;

		// copy indices
		for(unsigned int k=0; k<activeCnt; k++)
			partials.activePartials[i][k] = indices[k];
	}

	delete[] indices;
	delete[] partialStarted;

	delete[] partials.partialStartSample;
	delete[] partials.partialEndSample;
}



