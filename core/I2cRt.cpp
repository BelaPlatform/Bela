#include <I2cRt.h>

I2cRt::I2cRt() : 
	I2c(),
	toIo(NULL),
	fromIo(NULL),
	extIoShouldStop(NULL),
	intIoShouldStop(1)
{
	int size = 16384;
	resizeBuffers(size, size);
}

I2cRt::~I2cRt()
{
	stopThread();
	rb_free(toIo);
	rb_free(fromIo);
}

int I2cRt::resizeBuffers(int toIoSize, int fromIoSize)
{
	if(toIo)
		rb_free(toIo);
	if(fromIo)
		rb_free(fromIo);
	inbuf.reserve(fromIoSize);
	toIo = rb_create(toIoSize);
	fromIo = rb_create(fromIoSize);
	if(!toIo || !fromIo)
		return -1;
	else
		return 0;
}

void I2cRt::startThread(volatile int* shouldStop)
{
	if(shouldStop)
		extIoShouldStop = &this->intIoShouldStop;
	else
		extIoShouldStop = shouldStop;
	intIoShouldStop = 0;
	pthread_create(&thread, NULL, I2cRt::doIoLoop, (void*)this);
}

void I2cRt::stopThread()
{
	if(!intIoShouldStop)
	{
		intIoShouldStop = 1;
		pthread_join(thread, NULL);
	}
}

void* I2cRt::doIoLoop(void* arg)
{
	I2cRt* that = (I2cRt*)arg;
	while(!that->ioShouldStop())
	{
		that->doIo();
		usleep(2000);
	}
	return NULL;
}

void I2cRt::doIo()
{
	while(rb_available_to_read(toIo))
	{
		Msg msg;
		rb_read_from_buffer(toIo, (char*)&msg, sizeof(Msg));
		unsigned int writeSize = msg.writeSize;
		unsigned int readSize = msg.readSize;
		i2c_char_t inbuf[readSize];
		i2c_char_t outbuf[writeSize];
		bool shouldWrite = (msg.type == MsgType::write || msg.type == MsgType::writeRead);
		bool shouldRead = (msg.type == MsgType::read || msg.type == MsgType::writeRead);
		if(shouldWrite)
		{
			int available = rb_available_to_read(toIo);
			if(available < writeSize)
			{
				// unexpected, everything is probably screwed by now
				// so let's drain the buffer and continue
				rb_read_from_buffer(toIo, (char*)&outbuf, available);
				fprintf(stderr, "Full on panic on I2C: unexpected number of byets available in the toIo ringbuffer\n");
				continue;
			}
			rb_read_from_buffer(toIo, (char*)&outbuf, writeSize);
		}
#if 0
		printf("Doing Io for message: ");
		printf("type: %d, readSize: %d, writeSize: %d, ", msg.type, msg.readSize, msg.writeSize);
		if(writeSize > 0)
		{
			printf("payload: ");
			for(int n = 0; n < writeSize; ++n)
			{
				printf("%#2x ", outbuf[n]);
			}
			printf("\n");
		}
#endif
		int ret;
		switch(msg.type)
		{
			case MsgType::write:
				//ret = I2c::write(outbuf, writeSize);
				ret = writeRegisters(outbuf[0], outbuf + 1, writeSize - 1);
			break;
			case MsgType::read:
				ret = 0;
				//ret = I2c::read(inbuf, readSize);
			break;
			case MsgType::writeRead:
				ret = readRegisters(outbuf[0], inbuf, readSize);
				//ret = I2c::writeRead(outbuf, writeSize, inbuf, readSize);
			break;
			default:
				ret = -1;
		}
		if(ret)
		{
			// send back a failure
			msg.status = MsgStatus::failure;
			rb_write_to_buffer(fromIo, 2, (char*)&msg, sizeof(msg)); // do not check for space avaiable or return value
			continue;
		}
		msg.status = MsgStatus::success;
		if(shouldRead)
		{
			// if we read something, we have to write the
			// retrieved values back into the ringbuffer:
			// - wait for the buffer to have enough space
			while(!ioShouldStop() && rb_available_to_write(fromIo) < sizeof(msg) + readSize)
				usleep(10000);
			// - write the message followed by the payload
			rb_write_to_buffer(fromIo, 2, (char*)&msg, sizeof(msg), (char*)&inbuf, readSize);
		} else {
			rb_write_to_buffer(fromIo, 2, (char*)&msg, sizeof(msg));
		}
	}
}

int I2cRt::writeRegistersRt(
	i2c_char_t reg,
	i2c_char_t *values,
	unsigned int size)
{
	Msg msg;
	// if the buffer is full, discard the new message and return failure
	if(rb_available_to_write(toIo) < sizeof(msg) + size)
		return 1;
	msg.type = MsgType::write;
	msg.readSize = 0;
	msg.writeSize = size + 1; // + 1 for the reg
	rb_write_to_buffer(toIo, 3,
			(char*)&msg, sizeof(msg),
			(char*)&reg, sizeof(reg),
			(char*)values, size
		);
	return 0;
}

int I2cRt::readRegistersRt(
	i2c_char_t reg,
	unsigned int size)
{
	Msg msg;
	// if the buffer is full, discard the new message and return failure
	if(rb_available_to_write(toIo) < sizeof(msg) + sizeof(reg))
		return 1;
	msg.type = MsgType::writeRead;
	msg.readSize = size;
	msg.writeSize = 1;
	rb_write_to_buffer(toIo, 2, (char*)&msg, sizeof(msg), (char*)&reg, sizeof(reg));
	return 0;
}

I2cRt::Msg I2cRt::retrieveMessage()
{
	int available = rb_available_to_read(fromIo);
	Msg msg;
	if(available == 0)
	{
		msg.status = MsgStatus::noMessage;
		return msg;
	}
	if(available < sizeof(Msg))
	{
		return failedReadingFromIo();
	}
	// all good, we retrieve the message from the buffer
	rb_read_from_buffer(fromIo, (char*)&msg, sizeof(msg));
	// retrieve the payload, if there is one
	if(msg.readSize)
	{
		if(available - sizeof(msg) < msg.readSize)
		{
			return failedReadingFromIo();
		}
		rb_read_from_buffer(fromIo, (char*)inbuf.data(), msg.readSize);
		msg.payload = inbuf.data();
	}
	return msg;
}

I2cRt::Msg I2cRt::failedReadingFromIo()
{
	Msg msg;
	msg.status = MsgStatus::failure;
	// something wrong happened. Let's just drain the buffer and
	// start over
	rb_read_from_buffer(fromIo, (char*)inbuf.data(), rb_available_to_read(fromIo));
	return msg;
}

bool I2cRt::ioShouldStop()
{
	bool shouldStop = intIoShouldStop;
	if(extIoShouldStop)
		shouldStop = shouldStop || *extIoShouldStop;
	return shouldStop;
}

