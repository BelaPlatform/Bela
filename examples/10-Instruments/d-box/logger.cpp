/*
 * logger.cpp
 *
 *  Created on: Aug 6, 2014
 *      Author: VIctor Zappi and Andrew McPherson
 */

#include "logger.h"

// main extern vars
extern int gShouldStop;
extern int gVerbose;

// file nanme extern vars
extern char gId;
extern char gGroup;


// logged extern vars
extern int s0TouchNum;
extern float s0Touches_[MAX_TOUCHES];
extern float s0Size_[MAX_TOUCHES];
extern int s0LastIndex;

extern int s1TouchNum;
extern float s1Touches_[MAX_TOUCHES];
extern float s1Size_[MAX_TOUCHES];
extern int s1LastIndex;

extern int fsr;



string logPath			= "/boot/uboot/instrumentLog";
string logFileIncipit	= "/datalog";
string logFileName		= "";
ofstream logFile;
timeval logTimeVal;
unsigned long long logTimeOrig;
int logCnt				= 0;	// counts how many lines so far
int logCntSwap			= 50;	// how many log lines before closing and re-opening the file


// create the log file, using incremental name convention
int initLogLoop()
{
	if(gVerbose==1)
		cout << "---------------->Init Log Thread" << endl;


	// transform chars into strings via stringstream objs
	stringstream id_ss, group_ss, freedom_ss;
	id_ss 		<< gId;
	group_ss 	<< gGroup;

	int logNum	= -1;
	int logMax	= -1;
	int pathLen	= logPath.length() + logFileIncipit.length() + 4;	// + 4 is: "_", id, group, "_"
	glob_t globbuf;

	// check how many log files are already there, and choose name according to this
	glob( (logPath + logFileIncipit + "*").c_str(), 0, NULL, &globbuf);

	// cycle through all and find the highest index
	for(unsigned int i=0; i<globbuf.gl_pathc; i++)
	{
		// playing with 0-9 char digits, forming a number from 0 to 9999
		logNum  = (globbuf.gl_pathv[i][pathLen]-48)   * 1000;	// 42 to 45 are the indices of the chars forming the file index
		logNum += (globbuf.gl_pathv[i][pathLen+1]-48) * 100;
		logNum += (globbuf.gl_pathv[i][pathLen+2]-48) * 10;
		logNum +=  globbuf.gl_pathv[i][pathLen+3]-48;
		if(logNum > logMax)
			logMax = logNum;
	}
	logNum = logMax + 1;	// new index

	globfree(&globbuf);

	ostringstream numString;
	numString << setw (4) << setfill ('0') << logNum;	// set integer with 4 figures

	// here are the new names: PATH + DIR + INCIPIT + _ + id + group + freedom + _ + NUM (4figures) + _A.txt
	logFileName	= logPath + logFileIncipit;
	logFileName	+= "_" + id_ss.str() + group_ss.str() + freedom_ss.str();
	logFileName	+= "_" + numString.str();	 //static_cast<ostringstream*>( &(ostringstream() << logNum) )->str();
	logFileName	+= ".txt";


	// create new files
	FILE *fp_a		= fopen(logFileName.c_str(), "wb");
	if(!fp_a)
	{
		dbox_printf("Cannot create files...\n");
		return 2;
	}
	fclose(fp_a);

	// ready to append
	logFile.open(logFileName.c_str(), ios::out | ios::app);

	dbox_printf("Logging on file %s\n", logFileName.c_str());

	return 0;
}


void writeData(unsigned long long time)
{

	float fsr_ = ((float)(1799-fsr)/1799.0);
	logFile << time 				<< "\t"		// timestamp
			<< s0TouchNum			<< "\t";	// sensor 0 touch count
	for(int i=0; i<MAX_TOUCHES; i++)
		logFile << s0Touches_[i] 	<< "\t";	// sensor 0 touch pos x
	for(int i=0; i<MAX_TOUCHES; i++)
		logFile << s0Size_[i] 		<< "\t";	// sensor 0 touch size
	logFile << s0LastIndex 			<< "\t"		// sensor 0 last index
			<< fsr_					<< "\t"		// sensor 0 FSR pressure
			<< s1TouchNum			<< "\t";	// sensor 1 touch count
	for(int i=0; i<MAX_TOUCHES; i++)
		logFile << s1Touches_[i] 	<< "\t";	// sensor 1 touch pos x
	for(int i=0; i<MAX_TOUCHES; i++)
		logFile	<< s1Size_[i] 		<< "\t";	// sensor 1 touch size
	logFile << s1LastIndex 			<< "\t"		// sensor 1 last index
	//... AND SO ON
			<< "\n";

	//dbox_printf("%d\n", s0LastIndex);
	//dbox_printf("s0TouchNum: %d\t s0Touches[0]: %f\t s0Size[0]: %f\t s0LastIndex: %d\n", s0TouchNum, s0Touches_[0], s0Size_[0], s0LastIndex);

}

void logData(unsigned long long time)
{
	// if it's time to change write-file
	if(logCnt >= logCntSwap)
	{
		logFile.close();	// close file, dump stream
		logCnt = 0;		// ready for another whole round

		// open again, ready to append
		logFile.open(logFileName.c_str(), ios::out | ios::app);
	}

	writeData(time);

	logCnt++;
}




void *logLoop(void *)
{
	set_realtime_priority(10);

	if(gVerbose==1)
		dbox_printf("_________________Log Thread!\n");

	// get time reference
	gettimeofday(&logTimeVal, NULL);
	logData(0);

	logTimeOrig = logTimeVal.tv_usec;
	logTimeOrig *= 0.001;					// from usec to msec
	logTimeOrig += logTimeVal.tv_sec*1000;	// from sec to msec

	usleep(5000);

	while(!gShouldStop)
	{
		gettimeofday(&logTimeVal, NULL);
		unsigned long long currentTime = logTimeVal.tv_usec;
		currentTime *= 0.001;					// from usec to msec
		currentTime += logTimeVal.tv_sec*1000;	// from sec to msec

		logData(currentTime-logTimeOrig);

		usleep(5000);
	}

	if(logFile!=NULL)
		logFile.close();

	dbox_printf("log thread ended\n");

	return (void *)0;
}
