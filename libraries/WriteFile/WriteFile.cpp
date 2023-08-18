/*
 * WriteFile.cpp
 *
 * Created on: 5 Oct 2015
 *      Author: giulio
 */

#include "WriteFile.h"
#include <glob.h>		// alternative to dirent.h to handle files in dirs
#include <stdlib.h>
#include <thread>
#include <pthread.h>
#include <functional>
#include <mutex>
#include <algorithm>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>

//setupialise static members
bool WriteFile::staticConstructed=false;
std::vector<WriteFile*> WriteFile::objAddrs;
bool WriteFile::threadRunning;
bool WriteFile::threadScheduled;
bool WriteFile::threadIsExiting;

class autojointhread {
public:
	void setup(std::function<void(void)> fun) {
		thread = std::thread(fun);
	}
	~autojointhread() {
		if(thread.joinable())
		{
			thread.join();
		}
	}
	pthread_t native_handle() {
		return thread.native_handle();
	}
	bool joinable() {
		return thread.joinable();
	}
	void join() {
		return thread.join();
	}
private:
	std::thread thread;
};
static autojointhread writeAllFilesThread;
static std::mutex mutex;

void WriteFile::staticConstructor(){
	std::unique_lock<std::mutex> lock(mutex);
	if(staticConstructed)
		return;
	// if previously running thread is exiting, wait for it
	while(writeAllFilesThread.joinable()) {
		lock.unlock();
		usleep(100000);
		lock.lock();
	}
	staticConstructed=true;
	threadIsExiting=false;
	threadRunning=false;
	threadScheduled = false;
	writeAllFilesThread.setup(&WriteFile::run);
	sched_param sch = {};
	sch.sched_priority = 60;
	pthread_setschedparam(writeAllFilesThread.native_handle(), SCHED_FIFO, &sch);
}

WriteFile::WriteFile(){
};

WriteFile::WriteFile(const std::string& filename, bool overwrite, bool append){
	setup(filename, overwrite, append);
}

WriteFile::~WriteFile(){
	cleanup();	
}

void WriteFile::cleanup(bool discard){
	if(cleaned)
		return;
	cleaned = true;
	std::unique_lock<std::mutex> lock(mutex);
	//write all that's left
	writeOutput(true);
	writeFooter();
	fflush(file);
	fclose(file);
	if(discard)
	{
		int ret = unlink(filename.c_str());
		if(ret)
			fprintf(stderr, "Error while deleting file %s: %d %s\n", filename.c_str(), errno, strerror(errno));
	}

	// remove from objAddrs list
	auto it = std::find(objAddrs.begin(), objAddrs.end(), this);
	if(it != objAddrs.end())
		objAddrs.erase(it);
	if(objAddrs.size())
		return;
	// if there are no instances left, stop the thread
	stopThread();
	staticConstructed = false;
	lock.unlock();
	// let the thread run to completion
	if(writeAllFilesThread.joinable())
		writeAllFilesThread.join();
}

std::string WriteFile::generateUniqueFilename(const std::string& original)
{
	int originalLen = original.size();

	// search for a dot in the file name (from the end)
	int dot = originalLen;
	for(int n = dot; n >= 0; --n)
	{
		if(original[n] == '.')
			dot = n;
	}
	int count = dot;
	constexpr char sep = '+';
	constexpr size_t sepLen = 1;
	// add a * before the dot
	std::string temp = std::string({original.begin(), original.begin() + dot}) + '*' + std::string({original.begin() + dot, original.end()});

	// check how many log files are already there, and choose name according to this
	glob_t globbuf;
	glob(temp.c_str(), 0, NULL, &globbuf);

	int logNum;
	int logMax = -1;
	// cycle through all and find the existing one with the highest index
	bool originalFree = true;
	for(unsigned int i = 0; i < globbuf.gl_pathc; ++i)
	{
		const char* path = globbuf.gl_pathv[i];
		size_t len = strlen(path);
		if(len < dot + sepLen)
			continue;
		if(sep != path[dot]) // quick check first
		{
			// this is either the same as the original or an unmatching pattern
			if(0 == strcmp(original.c_str(), path))
				originalFree = false;
			continue;
		}
		const char* start = path + dot + 1;
		logNum = atoi(start);
		if(logNum > logMax)
			logMax = logNum;
	}
	globfree(&globbuf);
	if(logMax == -1 && originalFree)
	{
		// use the same filename
		return original;
	} else {
		// generate a new filename
		logNum = logMax + 1;	// new index
		std::string out = std::string({original.begin(), original.begin() + dot}) + sep + std::to_string(logNum) + std::string({original.begin() + dot, original.end()});
		printf("File %s exists, writing to %s instead\n", original.c_str(), out.c_str());
		return out;
	}
}

void WriteFile::setup(const std::string& newFilename, bool overwrite, bool append){
	filename = newFilename;
	if(!overwrite)
	{
		filename = generateUniqueFilename(filename);
		file = fopen(filename.c_str(), "w");
	} else {
		printf("Overwrite %s\n", filename.c_str());
		if(!append)
		{
			file = fopen(filename.c_str(), "w");
		} else {
			file = fopen(filename.c_str(), "a");
		}
	}
	fileType = kBinary;
	lineLength = 0;
	setEcho(false);
	textReadPointer = 0;
	binaryReadPointer = 0;
	writePointer = 0;
	stringBuffer.resize(1000);
	setHeader("variable=[\n");
	setFooter("];\n");
	staticConstructor();
	mutex.lock();
	objAddrs.push_back(this);
	mutex.unlock();
	echoedLines = 0;
	echoPeriod = 1;
}

void WriteFile::setFileType(WriteFileType newFileType){
	fileType = newFileType;
	if(fileType == kBinary)
		setBufferSize(1e6);
}
void WriteFile::setEcho(bool newEcho){
	echo=newEcho;
}
void WriteFile::setEchoInterval(int newEchoPeriod){
	echoPeriod = newEchoPeriod;
	if(echoPeriod != 0)
		echo = true;
	else
		echo = false;
}

void WriteFile::setBufferSize(unsigned int newSize)
{
	buffer.resize(newSize);
}

void WriteFile::print(const std::string& string){
	return;
	if(echo == true){
		echoedLines++;
		if (echoedLines >= echoPeriod){
			echoedLines = 0;
			printf("%s", string.c_str());
		}
	}
	if(file != NULL && fileType != kBinary){
		fprintf(file, "%s", string.c_str());
	}
}

void WriteFile::writeLine(){
	if(echo == true || fileType != kBinary){
		int stringBufferPointer = 0;
		for(unsigned int n = 0; n < formatTokens.size(); n++){
			int numOfCharsWritten = snprintf( &stringBuffer[stringBufferPointer], stringBuffer.size() - stringBufferPointer,
								formatTokens[n].c_str(), buffer[textReadPointer]);
			stringBufferPointer += numOfCharsWritten;
			textReadPointer++;
			if(textReadPointer >= buffer.size()){
				textReadPointer -= buffer.size();
			}
		}
		print({stringBuffer.begin(), stringBuffer.begin() + strlen(stringBuffer.data())});
	}
}

void WriteFile::setLineLength(int newLineLength){
	lineLength = newLineLength;
	if(buffer.size() == 0)
		setBufferSize(lineLength * 1e5);
}

void WriteFile::log(float value){
	if(fileType != kBinary && (!format.size() || !buffer.size()))
		return;
	buffer[writePointer] = value;
	writePointer++;
	if(writePointer == buffer.size()){
		writePointer = 0;
	}
	if((fileType == kText && writePointer == textReadPointer - 1) ||
			(fileType == kBinary && writePointer == binaryReadPointer - 1)){
		rt_fprintf(stderr, "WriteFile: %s pointers crossed, you should probably slow down your writing to disk\n", filename.c_str());
	}
	if(threadScheduled == false){
		startThread();
	}
}

void WriteFile::log(const float* array, int length){
	for(int n = 0; n < length; n++){
		log(array[n]);
	}
}

void WriteFile::setFormat(const std::string& format){
	formatTokens.clear();
	int tokenStart = 0;
	bool firstToken = true;
	for(unsigned int n = 0; n < format.size() + 1; n++){
		if(format[n] == '%' && format[n + 1] == '%'){
			n++;
		} else if (format[n] == '%' || format[n] == 0){
			if(firstToken == true){
				firstToken = false;
				continue;
			}
			unsigned int tokenLength = n - tokenStart;
			if(tokenLength == 0)
				continue;
			std::string string = {format.begin() + tokenStart, format.begin() + tokenStart + tokenLength};
			formatTokens.push_back(string);
			tokenStart = n;
		}
	}
	setLineLength(formatTokens.size());
}

int WriteFile::getNumInstances(){
	return objAddrs.size();
}

void WriteFile::startThread(){
	threadScheduled = true;
}

void WriteFile::stopThread(){
	threadIsExiting=true;
}

bool WriteFile::threadShouldExit(){
	return threadIsExiting;
}

bool WriteFile::isThreadRunning(){
	return threadRunning;
}

float WriteFile::getBufferStatus(){
	return 1-getOffset()/(float)buffer.size();
}

int WriteFile::getOffsetFromPointer(int aReadPointer){
	int offset = writePointer - aReadPointer;
		if( offset < 0)
			offset += buffer.size();
		return offset;
}
int WriteFile::getOffset(){
	if(fileType == kBinary){
		return getOffsetFromPointer(binaryReadPointer);
	}
	else{
		return getOffsetFromPointer(textReadPointer);
	}
}

void WriteFile::writeOutput(bool flush){
	while((echo == true || fileType == kText) && getOffsetFromPointer(textReadPointer) >= lineLength){ //if there is less than one line worth of data to write, skip over.
							 	 // So we make sure we only write full lines
		writeLine();
	}
	if(shouldFlush) {
		shouldFlush = false;
		flush = true;
	}
	if(fileType == kBinary){
		int numBinaryElementsToWriteAtOnce = 4096;
		bool wasWritten = false;
		while(getOffsetFromPointer(binaryReadPointer) > numBinaryElementsToWriteAtOnce){
			int elementsToEndOfBuffer = buffer.size() - binaryReadPointer;
			int numberElementsToWrite = numBinaryElementsToWriteAtOnce < elementsToEndOfBuffer ?
					numBinaryElementsToWriteAtOnce : elementsToEndOfBuffer;
			numberElementsToWrite = fwrite(&(buffer[binaryReadPointer]), sizeof(float), numberElementsToWrite, file);
			binaryReadPointer += numberElementsToWrite;
			if(binaryReadPointer >= buffer.size()){
				binaryReadPointer = 0;
			}
			wasWritten = true;
		}
		if(flush == true){ // flush all the buffer to the file
			while(getOffsetFromPointer(binaryReadPointer) != 0){
				binaryReadPointer += fwrite(&(buffer[binaryReadPointer]), sizeof(float), 1, file);
				if(binaryReadPointer >= buffer.size()){
					binaryReadPointer = 0;
				}
				wasWritten = true;
			}
		}
		if(wasWritten){
			fflush(file);
			fsync(fileno(file));
		}
	}
}

void WriteFile::writeAllOutputs(bool flush){
	std::lock_guard<std::mutex> lock(mutex);
	for(unsigned int n = 0; n < objAddrs.size(); n++){
		objAddrs[n] -> writeOutput(flush);
	}
}

void WriteFile::writeHeader(){
	print(header);
}

void WriteFile::writeFooter(){
	print(footer);
}

void WriteFile::setHeader(const std::string& newHeader){
	header = sanitizeString(newHeader);
}

void WriteFile::setFooter(const std::string& newFooter){
	footer = sanitizeString(newFooter);
}

std::string WriteFile::sanitizeString(const std::string& string){
	std::string ret = string;
	std::replace(ret.begin(), ret.end(), '%', ' ');
	return ret;
}

void WriteFile::run(){
	threadRunning = true;
	while(threadShouldExit()==false){
		writeAllOutputs(false);
		usleep(sleepTimeMs*1000);
	}
	threadRunning = false;
}

void WriteFile::requestFlush() {
	shouldFlush = true;
}
