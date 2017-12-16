#include "I2c.h"
extern "C" {
#include "ringbuffer.h"
};
#include <vector>
#include <pthread.h>

class I2cRt : public I2c
{
public:
	I2cRt();
	~I2cRt();
	int resizeBuffers(int toIoSize, int fromIoSize);
	void startThread(volatile int* shouldStop);
	void stopThread();
	void doIo();
	static void* doIoLoop(void* arg);
	typedef enum {
		failure,
		success,
		noMessage,
	} MsgStatus;
	typedef enum {
		read,
		write,
		writeRead,
	} MsgType;
	typedef struct _Msg{
		MsgType type;
		MsgStatus status;
		int address;
		int readSize;
		int writeSize;
		i2c_char_t* payload;
	} Msg;
	int readRt(unsigned int readSize);
	int writeRt(i2c_char_t* outbuf, unsigned int writeSize);
	int writeReadRt(i2c_char_t* outbuf, unsigned int writeSize, unsigned int readSize);
	void setAddressRt(int address);
	int writeRegistersRt(i2c_char_t reg, i2c_char_t *values, unsigned int size);
	int readRegistersRt(i2c_char_t reg, unsigned int size);
	Msg retrieveMessage();
	bool isIoBufferEmpty();
private:
	int msgToIo(MsgType type, i2c_char_t* outbuf, unsigned int writeSize, unsigned int readSize);
	Msg failedReadingFromIo();
	void drainToIo();
	ring_buffer* toIo;
	ring_buffer* fromIo;
	volatile int* extIoShouldStop;
	volatile int intIoShouldStop;
	bool ioShouldStop();
	std::vector<i2c_char_t> inbuf;
	pthread_t thread;
	int i2cAddressRt;
};
