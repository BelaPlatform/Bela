#ifdef __cplusplus
#include "WriteFile.h"
extern "C"
{
#else
typedef void* WriteFile;
typedef enum {
	kBinary,
	kText
} WriteFileType;
#endif

WriteFile* WriteFile_new();
void WriteFile_delete(WriteFile* file);
void WriteFile_setFileType(WriteFile* file, WriteFileType newFileType);
void WriteFile_setEcho(WriteFile* file, int newEcho);
void WriteFile_setEchoInterval(WriteFile* file, int newPeriod);
void WriteFile_setBufferSize(WriteFile* file, unsigned int newSize);
void WriteFile_setFormat(WriteFile* file, const char* newFormat);
void WriteFile_setHeader(WriteFile* file, const char* newHeader);
void WriteFile_setFooter(WriteFile* file, const char* newFooter);
void WriteFile_logArray(WriteFile* file, const float* array, int length);
void WriteFile_log(WriteFile* file, float value);
void WriteFile_init(WriteFile* file, const char* filename, int length);
int WriteFile_getOffset(WriteFile* file);
float WriteFile_getBufferStatus(WriteFile* file);

#ifdef __cplusplus
}
#endif
