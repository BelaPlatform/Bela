/*
 * WriteFile.h
 *
 *  Created on: 5 Oct 2015
 *      Author: giulio
 */

#ifndef WRITEFILE_H_
#define WRITEFILE_H_
#include <Bela.h>
#include <vector>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

typedef enum {
	kBinary,
	kText
} WriteFileType;

class WriteFile {
private:
	static AuxiliaryTask writeAllFilesTask;
	bool echo;
	int echoedLines;
	int echoPeriod;
	char *header;
	char *footer;
	char *stringBuffer;
	int stringBufferLength;
	std::vector<float> buffer;
	int textReadPointer;
	int binaryReadPointer;
	int writePointer;
	bool variableOpen;
	char* format;
	int lineLength;
	WriteFileType fileType;
	static int sleepTimeMs;
	FILE *file;
	char* _filename;
	void writeLine();
	void writeHeader();
	void writeFooter();
	void allocateAndCopyString(const char* source, char** destination);
	void print(const char* string);
	void printBinary(const char* string);
	void setLineLength(int newLineLength);
	int getOffsetFromPointer(int aPointer);
	std::vector<char *> formatTokens;
	static void sanitizeString(char* string);
	static void sanitizeString(char* string, int numberOfArguments);
	static bool isThreadRunning();
	static bool auxiliaryTaskRunning;
	static bool threadShouldExit();
	static bool threadIsExiting;
	static bool threadRunning;
	static bool threadScheduled;
	static bool staticConstructed;
	static void staticConstructor();
	static std::vector<WriteFile *> objAddrs;
	void writeOutput(bool flush);
public:
	WriteFile();
	WriteFile(const char* filename, bool overwrite, bool append);

	/**
	 * Set the type of file to write, can be either kText or kBinary.
	 * Binary files cAn be imported e.g. in Matlab:
	 *   fid=fopen('out','r');
	 *   A = fread(fid, 'float');
	 * */
	void setFileType(WriteFileType newFileType);

	/** 
	 * Set whether to echo the logged data to the console
	 * (according to the EchoInterval set with setEchoInterval()
	 */
	void setEcho(bool newEcho);

	/**
	 * Set after how often to log data to the console.
	 * The unit of measurement is the number of calls to log().
	 */
	void setEchoInterval(int newPeriod);

	/**
	 * Set the size of the internal buffer. 
	 *
	 * A reasonable default value is chosen automatically. However
	 * if your often received a "crossed pointer" error, you may
	 * want to use this to increase the size of the buffer manually.
	 */
	void setBufferSize(unsigned int newSize);

	/**
	 *  Set the format that you want to use for your output.
	 *
	 * Only %f is allowed (with modifiers). When in binary mode,
	 * the specified format is used only for echoing to console.
	 */
	void setFormat(const char* newFormat);
	/**
	 * Set one or more lines to be printed at the beginning of the file.
	 *
	 * This is ignored in binary mode.
	 */
	void setHeader(const char* newHeader);
	/**
	 * Set one or more lines to be printed at the end of the file.
	 *
	 * This is ignored in binary mode.
	 */
	void setFooter(const char* newFooter);

	/**
	 * Log one value to the file.
	 */
	void log(float value);
	/** 
	 * Log multiple values to the file.
	 */
	void log(const float* array, int length);

	/**
	 * Initialize the file to write to.
	 * This has to be called before any other method.
	 * If `overwrite` is false, existing files will not be overwritten
	 * and the filename will be automatically incremented.
	 */
	void setup(const char* filename, bool overwrite = false, bool append = false);

	/**
	 * Gets the distance between the write and read pointers of
	 * the buffer that holds data to be written to disk.
	 */
	int getOffset();

	/**
	 * Inquiries the status of the buffer that holds data to be written to disk.
	 *
	 * @return a value between 0 and 1, with 0 being buffer full (writing to disk not fast enough)
	 * and 1 being buffer empty (writing to disk is fast enough).
	 */
	float getBufferStatus();
	void cleanup();
	~WriteFile();
	static int getNumInstances();
	static void writeAllHeaders();
	static void writeAllFooters();
	static void writeAllOutputs(bool flush);
	static void startThread();
	static void stopThread();
	static void run(void*);
	/**
	 * Returns a unique filename by appending a number at the end of the original
	 * filename.
	 *
	 * @return a pointer to the unique filename. This MUST be freed by the
	 * invoking function.
	 */
	static char* generateUniqueFilename(const char* original);
};

#endif /* WRITEFILE_H_ */
