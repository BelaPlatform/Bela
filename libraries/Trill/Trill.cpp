#include <libraries/Trill/Trill.h>

#define MAX_TOUCH_1D_OR_2D ((device_type_ == TWOD ? kMaxTouchNum2D : kMaxTouchNum1D))
#define NUM_SENSORS ((device_type_ == ONED ? kNumSensorsBar : kNumSensors))
Trill::Trill(){}

Trill::Trill(int i2c_bus, int i2c_address, int mode) {
	setup(i2c_bus, i2c_address, mode);
}

int Trill::setup(int i2c_bus, int i2c_address, int mode) {

	if(initI2C_RW(i2c_bus, i2c_address, -1)) {
		fprintf(stderr, "Unable to initialise I2C communication\n");
		return 1;
	}

	if(identify() != 0) {
		fprintf(stderr, "Unable to identify device\n");
		return 2;
	}

	if(setMode(mode) != 0) {
		fprintf(stderr, "Unable to set mode\n");
		return 3;
	}

	if(updateBaseLine() != 0) {
		fprintf(stderr, "Unable to update baseline\n");
		return 6;
	}

	if(prepareForDataRead() != 0) {
		fprintf(stderr, "Unable to prepare for reading data\n");
		return 7;
	}

	return 0;
}

int Trill::setup(int i2c_bus, int i2c_address, int mode, int threshold, int prescaler) {

	if(initI2C_RW(i2c_bus, i2c_address, -1)) {
		fprintf(stderr, "Unable to initialise I2C communication\n");
		return 1;
	}

	if(identify() != 0) {
		fprintf(stderr, "Unable to identify device\n");
		return 2;
	}

	if(setMode(mode) != 0) {
		fprintf(stderr, "Unable to set mode\n");
		return 3;
	}

	if(setNoiseThreshold(threshold) != 0) {
		fprintf(stderr, "Unable to set threshold\n");
		return 4;
	}

	if(setPrescaler(prescaler) != 0) {
		fprintf(stderr, "Unabe to set prescaler\n");
		return 5;
	}

	if(updateBaseLine() != 0) {
		fprintf(stderr, "Unable to update baseline\n");
		return 6;
	}

	if(prepareForDataRead() != 0) {
		fprintf(stderr, "Unable to prepare for reading data\n");
		return 7;
	}

	return 0;
}

void Trill::cleanup() {
	closeI2C();
}

Trill::~Trill() {
	cleanup();
}

int Trill::identify() {
	unsigned int bytesToWrite = 2;
	char buf[2] = { kOffsetCommand, kCommandIdentify };
	if(int writtenValue = (::write(i2C_file, buf, bytesToWrite)) != bytesToWrite)
	{
		fprintf(stderr, "Unexpected or no response.\n No valid device connected.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return -1;
	}
	preparedForDataRead_ = false;

	usleep(commandSleepTime); // need to give enough time to process command

	::read(i2C_file, dataBuffer, 4); // discard first read

	unsigned int bytesToRead = 4;
	int bytesRead = ::read(i2C_file, dataBuffer, bytesToRead);
	if (bytesRead != bytesToRead)
	{
		fprintf(stderr, "Failure to read Byte Stream\n");
		device_type_ = NONE;
		return -1;
	}

	device_type_ = dataBuffer[1];
	firmware_version_ = dataBuffer[2];

	return 0;
}

int Trill::setMode(uint8_t mode) {
	unsigned int bytesToWrite = 3;
	char buf[3] = { kOffsetCommand, kCommandMode, mode };
	if(int writtenValue = (::write(i2C_file, buf, bytesToWrite)) != bytesToWrite)
	{
		fprintf(stderr, "Failed to set Trill's mode.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}
	preparedForDataRead_ = false;
	mode_ = mode;
	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}

int Trill::setScanSettings(uint8_t speed, uint8_t num_bits) {
	unsigned int bytesToWrite = 4;
	char buf[4] = { kOffsetCommand, kCommandScanSettings, speed, num_bits };
	if(int writtenValue = (::write(i2C_file, buf, bytesToWrite)) != bytesToWrite)
	{
		fprintf(stderr, "Failed to set Trill's scan settings.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}
	preparedForDataRead_ = false;
	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}

int Trill::setPrescaler(uint8_t prescaler) {
	unsigned int bytesToWrite = 3;
	char buf[3] = { kOffsetCommand, kCommandPrescaler, prescaler };
	if(int writtenValue = (::write(i2C_file, buf, bytesToWrite)) != bytesToWrite)
	{
		fprintf(stderr, "Failed to set Trill's prescaler.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}
	preparedForDataRead_ = false;
	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}

int Trill::setNoiseThreshold(uint8_t threshold) {
	unsigned int bytesToWrite = 3;
	char buf[3] = { kOffsetCommand, kCommandNoiseThreshold, threshold};
	if(int writtenValue = (::write(i2C_file, buf, bytesToWrite)) != bytesToWrite)
	{
		fprintf(stderr, "Failed to set Trill's threshold.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}
	preparedForDataRead_ = false;
	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}


int Trill::setIDACValue(uint8_t value) {
	unsigned int bytesToWrite = 3;
	char buf[3] = { kOffsetCommand, kCommandIdac, value };
	if(int writtenValue = (::write(i2C_file, buf, bytesToWrite)) != bytesToWrite)
	{
		fprintf(stderr, "Failed to set Trill's IDAC value.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}
	preparedForDataRead_ = false;
	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}

int Trill::setMinimumTouchSize(uint16_t size) {
	unsigned int bytesToWrite = 4;
	char buf[4] = { kOffsetCommand, kCommandMinimumSize, (char)(size >> 8), (char)(size & 0xFF) };
	if(int writtenValue = (::write(i2C_file, buf, bytesToWrite)) != bytesToWrite)
	{
		fprintf(stderr, "Failed to set Trill's minimum touch size value.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}
	preparedForDataRead_ = false;
	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}

int Trill::updateBaseLine() {
	unsigned int bytesToWrite = 2;
	char buf[2] = { kOffsetCommand, kCommandBaselineUpdate };
	if(int writtenValue = (::write(i2C_file, buf, bytesToWrite)) != bytesToWrite)
	{
		fprintf(stderr, "Failed to set Trill's baseline.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}
	preparedForDataRead_ = false;
	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}

int Trill::prepareForDataRead() {
	unsigned int bytesToWrite = 1;
	char buf[1] = { kOffsetData };
	if(::write(i2C_file, buf, bytesToWrite) != bytesToWrite)
	{
		fprintf(stderr, "Failed to prepare Trill data collection\n");
		return 1;
	}
	preparedForDataRead_ = true;
	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}

// This should maybe be renamed readRawData()
int Trill::readI2C() {

	if(!preparedForDataRead_)
		prepareForDataRead();

	int bytesRead = ::read(i2C_file, dataBuffer, kRawLength);
	if (bytesRead != kRawLength)
	{
		fprintf(stderr, "Failure to read Byte Stream\n");
		return 1;
	}
	for (unsigned int i=0; i < NUM_SENSORS; i++) {
		rawData[i] = ((dataBuffer[2*i] << 8) + dataBuffer[2*i+1]) & 0x0FFF;
	}

	return 0;
}

int Trill::readLocations() {
	if(!preparedForDataRead_)
		prepareForDataRead();

	uint8_t bytesToRead = kNormalLengthDefault;
	if(device_type_ == TWOD)
		bytesToRead = kNormalLength2D;
	int bytesRead = ::read(i2C_file, dataBuffer, kNormalLengthDefault);
	if (bytesRead != kNormalLengthDefault)
	{
		num_touches_ = 0;
		fprintf(stderr, "Failure to read Byte Stream\n");
		return 1;
	}

	unsigned int locations = 0;
	// Look for 1st instance of 0xFFFF (no touch) in the buffer
	for(locations = 0; locations < MAX_TOUCH_1D_OR_2D; locations++)
	{
		if(dataBuffer[2 * locations] == 0xFF && dataBuffer[2 * locations + 1] == 0xFF)
			break;
	}
	num_touches_ = locations;

	if(device_type_ == TWOD)
	{
		// Look for the number of horizontal touches in 2D sliders
		// which might be different from number of vertical touches
		for(locations = 0; locations < kMaxTouchNum2D; locations++)
		{
			if(dataBuffer[2 * locations + 4 * kMaxTouchNum2D] == 0xFF
				&& dataBuffer[2 * locations + 4 * kMaxTouchNum2D + 1] == 0xFF)
				break;
		}
		num_touches_ |= (locations << 4);
	}

	return 0;
}

int Trill::numberOfTouches()
{
	if(mode_ != NORMAL)
		return 0;

	// Lower 4 bits hold number of 1-axis or vertical touches
	return (num_touches_ & 0x0F);
}

// Number of horizontal touches for Trill 2D
int Trill::numberOfHorizontalTouches()
{
	if(mode_ != NORMAL || device_type_ != TWOD)
		return 0;

	// Upper 4 bits hold number of horizontal touches
	return (num_touches_ >> 4);
}

// Location of a particular touch.
// Range: 0 to N-1.
// Returns -1 if no such touch exists.
int Trill::touchLocation(uint8_t touch_num)
{
	if(mode_ != NORMAL)
		return -1;
	if(touch_num >= MAX_TOUCH_1D_OR_2D)
		return -1;

	int location = dataBuffer[2*touch_num] * 256;
	location += dataBuffer[2*touch_num + 1];

	return location;
}


// Size of a particular touch.
// Range: 0 to N-1.
// Returns -1 if no such touch exists.
int Trill::touchSize(uint8_t touch_num)
{
	if(mode_ != NORMAL)
		return -1;
	if(touch_num >= MAX_TOUCH_1D_OR_2D)
		return -1;

	int size = dataBuffer[2*touch_num + 2*MAX_TOUCH_1D_OR_2D] * 256;
	size += dataBuffer[2*touch_num + 2*MAX_TOUCH_1D_OR_2D + 1];

	return size;
}

int Trill::touchHorizontalLocation(uint8_t touch_num)
{
	if(mode_ != NORMAL || device_type_ != TWOD)
		return -1;
	if(touch_num >= MAX_TOUCH_1D_OR_2D)
		return -1;

	int location = dataBuffer[2*touch_num + 4*kMaxTouchNum2D] * 256;
	location += dataBuffer[2*touch_num + 4*kMaxTouchNum2D + 1];

	return location;
}

int Trill::touchHorizontalSize(uint8_t touch_num)
{
	if(mode_ != NORMAL || device_type_ != TWOD)
		return -1;
	if(touch_num >= MAX_TOUCH_1D_OR_2D)
		return -1;

	int size = dataBuffer[2*touch_num + 6*kMaxTouchNum2D] * 256;
	size += dataBuffer[2*touch_num + 6*kMaxTouchNum2D + 1];

	return size;
}

int Trill::numSensors()
{
	return NUM_SENSORS;
}
