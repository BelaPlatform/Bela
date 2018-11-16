#include <CapTouch.h>

CapTouch::CapTouch(){}

CapTouch::setup() {
}

CapTouch::cleanup() {
	closeI2C;
}

CapTouch::~CapTouch(){
	cleanup();
}

int CapTouch::identify() {
	int bytesToRead = 2;
	int bytesRead = read(i2C_file, dataBuffer, bytesToRead);
	if (bytesRead != bytesToRead)
	{
		fprintf(stderr, "Unexpected or no response.\n No valid device connected.\n");
		device_type_ = CAPSLIDER_DEVICE_NONE;
		firmware_version_ = 0;
		return device_type_;
	}
	device_type_ = dataBuffer[0];
	firmware_version_ = dataBuffer[1];
	
	return device_type_;
}

int CapTouch::setMode(uint8_t mode) {
	char buf[3] = { kOffsetCommand, kCommandMode, mode }; // code for centroid mode
	if(write(i2C_file, buf, 3) !=3) 
	{
		fprintf(stderr, "Failed to set TouchKey's mode.\n");
		return 1;
	}
	last_read_loc = kOffsetCommand;
	
	usleep(5000); // need to give TouchKey enough time to process command

	return 0;
}	

int CapTouch::prepareForDataRead() {
	char buf[0];
	if(last_read_loc_ != kOffsetData) {
		if(write(i2C_file, buf, 1) != 1)
		{
			fprintf(stderr, "Failed to prepare TouchKey data collection\n");
			return 1;
		}

		usleep(5000); // need to give TouchKey enough time to process command
	}

	return 0;
}

int CapTouch:: readRawData() {
	int bytesRead = read(i2C_file, dataBuffer, kRawLength);
	if (bytesRead != numBytesToRead)
	{
		fprintf(stderr, "Failure to read Byte Stream\n");
		return 2;
	}

}
