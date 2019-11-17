#include <CapTouch.h>

CapTouch::CapTouch(){}

CapTouch::CapTouch(int i2c_bus, int i2c_address) {
	setup(i2c_bus, i2c_address);
}
int CapTouch::setup(int i2c_bus, int i2c_address) {

	if(initI2C_RW(i2c_bus, i2c_address, -1)) {
		fprintf(stderr, "Unable to initialise I2C communication\n");
		return 1;
	}
	
	if(setMode(DIFF) != 0) {
		fprintf(stderr, "Unable to set mode\n");
		return 2;
	}
	
	if(updateBaseLine() != 0) {
		fprintf(stderr, "Unable to update baseline\n");
		return 3;
	}

	if(prepareForDataRead() != 0) {
		fprintf(stderr, "Unable to prepare for reading data\n");
		return 4;
	}

	isReady = true;
	return 0;
}

void CapTouch::cleanup() {
	closeI2C();
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
		device_type_ = 0;
		firmware_version_ = 0;
		return device_type_;
	}
	device_type_ = dataBuffer[0];
	firmware_version_ = dataBuffer[1];
	
	return device_type_;
}

int CapTouch::setMode(uint8_t mode) {
	char buf[3] = { kOffsetCommand, kCommandMode, mode };
	if(int writtenValue = (::write(i2C_file, buf, 3)) !=3) 
	{
		fprintf(stderr, "Failed to set CapTouch's mode.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}

	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}	

int CapTouch::setScanSettings(uint8_t speed, uint8_t num_bits) {
	char buf[4] = { kOffsetCommand, kCommandScanSettings, speed, num_bits };
	if(int writtenValue = (::write(i2C_file, buf, 4)) !=4) 
	{
		fprintf(stderr, "Failed to set CapTouch's scan settings.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}

	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}	


int CapTouch::setPrescaler(uint8_t prescaler) {
	char buf[3] = { kOffsetCommand, kCommandPrescaler, prescaler };
	if(int writtenValue = (::write(i2C_file, buf, 3)) !=3) 
	{
		fprintf(stderr, "Failed to set CapTouch's prescaler.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}

	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}	

int CapTouch::setNoiseThreshold(uint8_t threshold) {
	char buf[3] = { kOffsetCommand, kCommandNoiseThreshold, threshold};
	if(int writtenValue = (::write(i2C_file, buf, 3)) !=3) 
	{
		fprintf(stderr, "Failed to set CapTouch's threshold.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}

	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}	


int CapTouch::setIDACValue(uint8_t value) {
	char buf[3] = { kOffsetCommand, kCommandIdac, value };
	if(int writtenValue = (::write(i2C_file, buf, 3)) !=3) 
	{
		fprintf(stderr, "Failed to set CapTouch's IDAC value.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}

	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}	

int CapTouch::updateBaseLine() {
	char buf[2] = { kOffsetCommand, kCommandBaselineUpdate };
	if(int writtenValue = (::write(i2C_file, buf, 2)) !=2) 
	{
		fprintf(stderr, "Failed to set CapTouch's baseline.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}

	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}	

int CapTouch::prepareForDataRead() {
	char buf[1] = { kOffsetData };
	if(write(i2C_file, buf, 1) != 1)
	{
		fprintf(stderr, "Failed to prepare CapTouch data collection\n");
		return 1;
	}

	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}

int CapTouch::readI2C() {

	int bytesRead = read(i2C_file, dataBuffer, kRawLength);
	if (bytesRead != kRawLength)
	{
		fprintf(stderr, "Failure to read Byte Stream\n");
		return 1;
	}
	for (unsigned int i=0; i < numSensors; i++) {
		rawData[i] = ((dataBuffer[2*i] << 8) + dataBuffer[2*i+1]) & 0x0FFF;

	}
	
	return 0;
}
