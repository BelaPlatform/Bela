#include "WriteFile_c.h"

WriteFile* WriteFile_new()
{
	return new WriteFile();
}
void WriteFile_delete(WriteFile* file)
{
	delete file;
}
void WriteFile_setFileType(WriteFile* file, WriteFileType newFileType)
{
	file->setFileType(newFileType);
}
void WriteFile_setEcho(WriteFile* file, int newEcho)
{
	file->setEcho(newEcho);
}
void WriteFile_setEchoInterval(WriteFile* file, int newPeriod)
{
	file->setEchoInterval(newPeriod);
}
void WriteFile_setBufferSize(WriteFile* file, unsigned int newSize)
{
	file->setBufferSize(newSize);
}
void WriteFile_setFormat(WriteFile* file, const char* newFormat)
{
	file->setFormat(newFormat);
}
void WriteFile_setHeader(WriteFile* file, const char* newHeader)
{
	file->setHeader(newHeader);
}
void WriteFile_setFooter(WriteFile* file, const char* newFooter)
{
	file->setFooter(newFooter);
}
void WriteFile_logArray(WriteFile* file, const float* array, int length)
{
	file->log(array, length);
}
void WriteFile_log(WriteFile* file, float value)
{
	file->log(value);
}
void WriteFile_init(WriteFile* file, const char* filename, int overwrite)
{
	file->setup(filename, overwrite);
}
int WriteFile_getOffset(WriteFile* file)
{
	return file->getOffset();
}
float WriteFile_getBufferStatus(WriteFile* file)
{
	return file->getBufferStatus();
}

