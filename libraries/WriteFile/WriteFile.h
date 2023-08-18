/*
 * WriteFile.h
 *
 *  Created on: 5 Oct 2015
 *      Author: giulio
 */

#ifndef WRITEFILE_H_
#define WRITEFILE_H_
#include <vector>
#include <string>
#include <stdint.h>

typedef enum {
	kBinary,
	kText
} WriteFileType;

class WriteFile {
private:
	int echoedLines;
	int echoPeriod;
	std::string header;
	std::string footer;
	std::vector<char> stringBuffer;
	std::vector<float> buffer;
	int textReadPointer;
	int binaryReadPointer;
	int writePointer;
	std::string format;
	int lineLength;
	WriteFileType fileType;
	FILE *file;
	std::string filename;
	std::vector<std::string> formatTokens;
	bool echo;
	bool cleaned = false;
	volatile bool shouldFlush = false;
	static constexpr size_t sleepTimeMs = 5;
	void writeLine();
	void writeHeader();
	void writeFooter();
	void print(const std::string& string);
	void setLineLength(int newLineLength);
	int getOffsetFromPointer(int aPointer);
	static std::string sanitizeString(const std::string& string);
	static bool isThreadRunning();
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
	WriteFile(const std::string& filename, bool overwrite, bool append);

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
	void setFormat(const std::string& newFormat);
	/**
	 * Set one or more lines to be printed at the beginning of the file.
	 *
	 * This is ignored in binary mode.
	 */
	void setHeader(const std::string& newHeader);
	/**
	 * Set one or more lines to be printed at the end of the file.
	 *
	 * This is ignored in binary mode.
	 */
	void setFooter(const std::string& newFooter);

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
	void setup(const std::string& filename, bool overwrite = false, bool append = false);

	/**
	 * Get the name of the file being written. This may be different from
	 * the filename passed to setup() if it was called with `overwrite =
	 * false`.
	 */
	const std::string& getName() { return filename; }
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
	/**
	 * Request that all of the data logged so far is flushed to disk.
	 */
	void requestFlush();
	/**
	 * Stop the logging, flush to disk and remove the file from the writing
	 * thread. After this, you need a new call to setup().
	 *
	 * @param discard Whether to delete the file after closing it.
	 */
	void cleanup(bool discard = false);
	~WriteFile();
	static int getNumInstances();
	static void writeAllOutputs(bool flush);
	static void startThread();
	static void stopThread();
	static void run();
	/**
	 * Returns a unique filename by appending a number at the end of the original
	 * filename.
	 *
	 * @return a pointer to the unique filename. This MUST be freed by the
	 * invoking function.
	 */
	static std::string generateUniqueFilename(const std::string& original);
};

#endif /* WRITEFILE_H_ */
