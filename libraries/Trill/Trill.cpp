#include "Trill.h"
#include <map>
#include <vector>
#include <string.h>

constexpr uint8_t Trill::speedValues[4];
#define MAX_TOUCH_1D_OR_2D (((device_type_ == SQUARE || device_type_ == HEX) ? kMaxTouchNum2D : kMaxTouchNum1D))

enum {
	kCentroidLengthDefault = 20,
	kCentroidLengthRing = 24,
	kCentroidLength2D = 32,
	kRawLength = 60
};

enum {
	kCommandNone = 0,
	kCommandMode = 1,
	kCommandScanSettings = 2,
	kCommandPrescaler = 3,
	kCommandNoiseThreshold = 4,
	kCommandIdac = 5,
	kCommandBaselineUpdate = 6,
	kCommandMinimumSize = 7,
	kCommandAutoScanInterval = 16,
	kCommandIdentify = 255
};

enum {
	kOffsetCommand = 0,
	kOffsetData = 4
};

enum {
	kNumChannelsBar = 26,
	kNumChannelsRing = 28,
	kNumChannelsMax = 30,
};

enum {
	kMaxTouchNum1D = 5,
	kMaxTouchNum2D = 4
};

struct TrillDefaults
{
	TrillDefaults(std::string name, Trill::Mode mode, uint8_t address) :
		name(name), mode(mode), address(address) {}
	std::string name;
	Trill::Mode mode;
	uint8_t address;
};

static const std::map<Trill::Device, struct TrillDefaults> trillDefaults = {
	{Trill::NONE, TrillDefaults("No device", Trill::AUTO, 0xFF)},
	{Trill::UNKNOWN, TrillDefaults("Unknown device", Trill::AUTO, 0xFF)},
	{Trill::BAR, TrillDefaults("Bar", Trill::CENTROID, 0x20)},
	{Trill::SQUARE, TrillDefaults("Square", Trill::CENTROID, 0x28)},
	{Trill::CRAFT, TrillDefaults("Craft", Trill::DIFF, 0x30)},
	{Trill::RING, TrillDefaults("Ring", Trill::CENTROID, 0x38)},
	{Trill::HEX, TrillDefaults("Hex", Trill::CENTROID, 0x40)},
};

static const std::map<Trill::Mode, std::string> trillModes = {
	{Trill::AUTO, "Auto"},
	{Trill::CENTROID, "Centroid"},
	{Trill::RAW, "Raw"},
	{Trill::BASELINE, "Baseline"},
	{Trill::DIFF, "Diff"},
};

struct trillRescaleFactors_t {
	float pos;
	float posH;
	float size;
};

static const std::vector<struct trillRescaleFactors_t> trillRescaleFactors ={
	{.pos = 1, .posH = 0, .size = 1}, // UNKNOWN = 0,
	{.pos = 3200, .posH = 0, .size = 4566}, // BAR = 1,
	{.pos = 1792, .posH = 1792, .size = 3780}, // SQUARE = 2,
	{.pos = 4096, .posH = 0, .size = 1}, // CRAFT = 3,
	{.pos = 3584, .posH = 0, .size = 5000}, // RING = 4,
	{.pos = 1920, .posH = 1664, .size = 4000}, // HEX = 5,
};

Trill::Trill(){}

Trill::Trill(unsigned int i2c_bus, Device device, uint8_t i2c_address) {
	setup(i2c_bus, device, i2c_address);
}

int Trill::setup(unsigned int i2c_bus, Device device, uint8_t i2c_address)
{
	dataBuffer.resize(kRawLength);
	rawData.resize(kNumChannelsMax);
	address = 0;
	device_type_ = NONE;

	if(128 <= i2c_address)
		i2c_address = trillDefaults.at(device).address;

	if(128 <= i2c_address) {
		fprintf(stderr, "Unknown default address for device type %s\n",
			trillDefaults.at(device).name.c_str());
		return -2;
	}
	if(initI2C_RW(i2c_bus, i2c_address, -1)) {
		fprintf(stderr, "Unable to initialise I2C communication\n");
		return 1;
	}

	if(identify() != 0) {
		fprintf(stderr, "Unable to identify device\n");
		return 2;
	}
	if(UNKNOWN != device && device_type_ != device) {
		fprintf(stderr, "Wrong device type detected. `%s` was requested "
				"but `%s` was detected on bus %d at address %#x(%d).\n",
				trillDefaults.at(device).name.c_str(),
				trillDefaults.at(device_type_).name.c_str(),
				i2c_bus, i2c_address, i2c_address
		       );
		device_type_ = NONE;
		return -3;
	}

	Mode mode = trillDefaults.at(device_type_).mode;
	if(setMode(mode) != 0) {
		fprintf(stderr, "Unable to set mode\n");
		return 3;
	}

	if(setScanSettings(0, 12)){
		fprintf(stderr, "Unable to set scan settings\n");
		return 7;
	}

	if(updateBaseline() != 0) {
		fprintf(stderr, "Unable to update baseline\n");
		return 6;
	}

	if(prepareForDataRead() != 0) {
		fprintf(stderr, "Unable to prepare for reading data\n");
		return 7;
	}

	address = i2c_address;
	readErrorOccurred = false;
	return 0;
}

Trill::Device Trill::probe(unsigned int i2c_bus, uint8_t i2c_address)
{
	Trill t;
	t.dataBuffer.resize(kRawLength);
	if(t.initI2C_RW(i2c_bus, i2c_address, -1)) {
		return Trill::NONE;
	}
	if(t.identify() != 0) {
		return Trill::NONE;
	}
	return t.device_type_;
}

Trill::~Trill() {
	closeI2C();
}

const std::string& Trill::getNameFromDevice(Device device)
{
	try {
		return trillDefaults.at(device).name;
	} catch (std::exception e) {
		return trillDefaults.at(Device::UNKNOWN).name;
	}
}

static bool strCmpIns(const std::string& str1, const std::string& str2)
{
	bool equal = true;
	if(str1.size() == str2.size()) {
		for(unsigned int n = 0; n < str1.size(); ++n) {
			if(std::tolower(str1[n]) != std::tolower(str2[n])) {
				equal = false;
				break;
			}
		}
	} else
		equal = false;
	return equal;
}

Trill::Device Trill::getDeviceFromName(const std::string& name)
{
	for(auto& td : trillDefaults)
	{
		Device device = td.first;
		const std::string& str2 = trillDefaults.at(device).name;
		if(strCmpIns(name, str2))
			return Device(device);
	}
	return Trill::UNKNOWN;
}

const std::string& Trill::getNameFromMode(Mode mode)
{
	try {
		return trillModes.at(mode);
	} catch (std::exception e) {
		return trillModes.at(Mode::AUTO);
	}
}

Trill::Mode Trill::getModeFromName(const std::string& name)
{
	for(auto& m : trillModes)
	{
		const std::string& str2 = m.second;
		if(strCmpIns(name, str2))
			return m.first;
	}
	return Trill::AUTO;
}

int Trill::identify() {
	unsigned int bytesToWrite = 2;
	char buf[2] = { kOffsetCommand, kCommandIdentify };
	if(int writtenValue = (::write(i2C_file, buf, bytesToWrite)) != bytesToWrite)
	{
		return -1;
	}
	preparedForDataRead_ = false;

	usleep(commandSleepTime); // need to give enough time to process command

	::read(i2C_file, dataBuffer.data(), 4); // discard first read

	unsigned int bytesToRead = 4;
	int bytesRead = ::read(i2C_file, dataBuffer.data(), bytesToRead);
	if (bytesRead != bytesToRead)
	{
		fprintf(stderr, "Failure to read Byte Stream. Read %d bytes, expected %d\n", bytesRead, bytesToRead);
		device_type_ = NONE;
		return -1;
	}

	// if we read back just zeros, we assume the device did not respond
	if(0 == dataBuffer[1]) {
		device_type_ = NONE;
		return -1;
	}
	Device readDeviceType = (Device)dataBuffer[1];
	// if we do not recognize the device type, we also return an error
	if(trillDefaults.find(readDeviceType) == trillDefaults.end()) {
		device_type_ = NONE;
		return -1;
	}
	device_type_ = readDeviceType;
	firmware_version_ = dataBuffer[2];

	return 0;
}

void Trill::updateRescale()
{
	float scale = 1 << (12 - numBits);
	posRescale = 1.f / trillRescaleFactors[device_type_].pos;
	posHRescale = 1.f / trillRescaleFactors[device_type_].posH;
	sizeRescale = scale / trillRescaleFactors[device_type_].size;
	rawRescale = 1.f / (1 << numBits);
}

void Trill::printDetails()
{
	printf("Device type: %s (%d)\n", getNameFromDevice(device_type_).c_str(), deviceType());
	printf("Address: %#x\n", address);
	printf("Firmware version: %d\n", firmwareVersion());
}

int Trill::setMode(Mode mode) {
	unsigned int bytesToWrite = 3;
	if(AUTO == mode)
		mode = trillDefaults.at(device_type_).mode;
	char buf[3] = { kOffsetCommand, kCommandMode, (char)mode };
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
	if(speed > 3)
		speed = 3;
	if(num_bits < 9)
		num_bits = 9;
	if(num_bits > 16)
		num_bits = 16;
	char buf[4] = { kOffsetCommand, kCommandScanSettings, speed, num_bits };
	preparedForDataRead_ = false;
	if(int writtenValue = (::write(i2C_file, buf, bytesToWrite)) != bytesToWrite)
	{
		fprintf(stderr, "Failed to set Trill's scan settings.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}
	usleep(commandSleepTime); // need to give enough time to process command
	numBits = num_bits;
	updateRescale();

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

int Trill::setNoiseThreshold(float threshold) {
	unsigned int bytesToWrite = 3;
	threshold = threshold * (1 << numBits);
	if(threshold > 255)
		threshold = 255;
	if(threshold < 0)
		threshold = 0;
	char thByte = char(threshold + 0.5);
	char buf[3] = { kOffsetCommand, kCommandNoiseThreshold, thByte };
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

int Trill::setMinimumTouchSize(float minSize) {
	unsigned int bytesToWrite = 4;
	uint16_t size;
	float maxMinSize = (1<<16) - 1;
	if(maxMinSize > minSize / sizeRescale) // clipping to the max value we can transmit
		minSize = maxMinSize;
	else
		size = minSize / sizeRescale;
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

int Trill::setAutoScanInterval(uint16_t interval) {
	unsigned int bytesToWrite = 4;
	char buf[4] = { kOffsetCommand, kCommandAutoScanInterval, (char)(interval >> 8), (char)(interval & 0xFF) };
	if(int writtenValue = (::write(i2C_file, buf, bytesToWrite)) != bytesToWrite)
	{
		fprintf(stderr, "Failed to set Trill's auto scan interval.\n");
		fprintf(stderr, "%d\n", writtenValue);
		return 1;
	}
	preparedForDataRead_ = false;
	usleep(commandSleepTime); // need to give enough time to process command

	return 0;
}

int Trill::updateBaseline() {
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
	if(!preparedForDataRead_)
	{
		unsigned int bytesToWrite = 1;
		char buf[1] = { kOffsetData };
		if(::write(i2C_file, buf, bytesToWrite) != bytesToWrite)
		{
			fprintf(stderr, "Failed to prepare Trill data collection\n");
			return 1;
		}
		preparedForDataRead_ = true;
		usleep(commandSleepTime); // need to give enough time to process command
	}

	return 0;
}

int Trill::readI2C() {
	if(NONE == device_type_ || readErrorOccurred)
		return 1;
	prepareForDataRead();

	uint8_t bytesToRead = kCentroidLengthDefault;
	if(CENTROID == mode_) {
		if(device_type_ == SQUARE || device_type_ == HEX)
			bytesToRead = kCentroidLength2D;
		if(device_type_ == RING)
			bytesToRead = kCentroidLengthRing;
	} else {
		bytesToRead = kRawLength;
	}
	errno = 0;
	int bytesRead = ::read(i2C_file, dataBuffer.data(), bytesToRead);
	if (bytesRead != bytesToRead)
	{
		num_touches_ = 0;
		fprintf(stderr, "Trill: error while reading from device %s at address %#x (%d): %d of %d bytes read (error: %d %s)\n",
			getNameFromDevice(device_type_).c_str(), address, address, bytesRead, bytesToRead, errno, strerror(errno));
		readErrorOccurred = true;
		return 1;
	}
	if(CENTROID != mode_) {
		// parse, rescale and copy data to public buffer
		for (unsigned int i = 0; i < getNumChannels(); ++i)
			rawData[i] = (((dataBuffer[2 * i] << 8) + dataBuffer[2 * i + 1]) & 0x0FFF) * rawRescale;
		return 0;
	}

	unsigned int locations = 0;
	// Look for 1st instance of 0xFFFF (no touch) in the buffer
	for(locations = 0; locations < MAX_TOUCH_1D_OR_2D; locations++)
	{
		if(dataBuffer[2 * locations] == 0xFF && dataBuffer[2 * locations + 1] == 0xFF)
			break;
	}
	num_touches_ = locations;

	if(device_type_ == SQUARE || device_type_ == HEX)
	{
		// Look for the number of horizontal touches in 2D sliders
		// which might be different from number of vertical touches
		for(locations = 0; locations < MAX_TOUCH_1D_OR_2D; locations++)
		{
			if(dataBuffer[2 * locations + 4 * MAX_TOUCH_1D_OR_2D] == 0xFF
				&& dataBuffer[2 * locations + 4 * MAX_TOUCH_1D_OR_2D+ 1] == 0xFF)
				break;
		}
		num_touches_ |= (locations << 4);
	}

	return 0;
}

bool Trill::is1D()
{
	if(CENTROID != mode_)
		return false;
	switch(device_type_) {
		case BAR:
		case RING:
		case CRAFT:
			return true;
		default:
			return false;
	}
}

bool Trill::is2D()
{
	if(CENTROID != mode_)
		return false;
	switch(device_type_) {
		case SQUARE:
		case HEX:
			return true;
		default:
			return false;
	}
}

unsigned int Trill::getNumTouches()
{
	if(mode_ != CENTROID)
		return 0;

	// Lower 4 bits hold number of 1-axis or vertical touches
	return (num_touches_ & 0x0F);
}

unsigned int Trill::getNumHorizontalTouches()
{
	if(mode_ != CENTROID  || (device_type_ != SQUARE && device_type_ != HEX))
		return 0;

	// Upper 4 bits hold number of horizontal touches
	return (num_touches_ >> 4);
}

float Trill::touchLocation(uint8_t touch_num)
{
	if(mode_ != CENTROID)
		return -1;
	if(touch_num >= MAX_TOUCH_1D_OR_2D)
		return -1;

	int location = dataBuffer[2*touch_num] * 256;
	location += dataBuffer[2*touch_num + 1];

	return location * posRescale;
}

float Trill::getButtonValue(uint8_t button_num)
{
	if(mode_ != CENTROID)
		return -1;
	if(button_num > 1)
		return -1;
	if(device_type_ != RING)
		return -1;

	return (((dataBuffer[4*MAX_TOUCH_1D_OR_2D+2*button_num] << 8) + dataBuffer[4*MAX_TOUCH_1D_OR_2D+2*button_num+1]) & 0x0FFF) * rawRescale;
}

float Trill::touchSize(uint8_t touch_num)
{
	if(mode_ != CENTROID)
		return -1;
	if(touch_num >= MAX_TOUCH_1D_OR_2D)
		return -1;

	int size = dataBuffer[2*touch_num + 2*MAX_TOUCH_1D_OR_2D] * 256;
	size += dataBuffer[2*touch_num + 2*MAX_TOUCH_1D_OR_2D + 1];

	return size * sizeRescale;
}

float Trill::touchHorizontalLocation(uint8_t touch_num)
{
	if(mode_ != CENTROID  || (device_type_ != SQUARE && device_type_ != HEX))
		return -1;
	if(touch_num >= MAX_TOUCH_1D_OR_2D)
		return -1;

	int location = dataBuffer[2*touch_num + 4*MAX_TOUCH_1D_OR_2D] * 256;
	location += dataBuffer[2*touch_num + 4*MAX_TOUCH_1D_OR_2D+ 1];

	return location * posHRescale;
}

float Trill::touchHorizontalSize(uint8_t touch_num)
{
	if(mode_ != CENTROID  || (device_type_ != SQUARE && device_type_ != HEX))
		return -1;
	if(touch_num >= MAX_TOUCH_1D_OR_2D)
		return -1;

	int size = dataBuffer[2*touch_num + 6*MAX_TOUCH_1D_OR_2D] * 256;
	size += dataBuffer[2*touch_num + 6*MAX_TOUCH_1D_OR_2D+ 1];

	return size * sizeRescale;
}

#define compoundTouch(LOCATION, SIZE, TOUCHES) {\
	float avg = 0;\
	float totalSize = 0;\
	unsigned int numTouches = TOUCHES;\
	for(unsigned int i = 0; i < numTouches; i++) {\
		avg += LOCATION(i) * SIZE(i);\
		totalSize += SIZE(i);\
	}\
	if(numTouches)\
		avg = avg / totalSize;\
	return avg;\
	}

float Trill::compoundTouchLocation()
{
	compoundTouch(touchLocation, touchSize, getNumTouches());
}

float Trill::compoundTouchHorizontalLocation()
{
	compoundTouch(touchHorizontalLocation, touchHorizontalSize, getNumHorizontalTouches());
}

float Trill::compoundTouchSize()
{
	float size = 0;
	for(unsigned int i = 0; i < getNumTouches(); i++)
		size += touchSize(i);
	return size;
}

unsigned int Trill::getNumChannels()
{
	switch(device_type_) {
		case BAR: return kNumChannelsBar;
		case RING: return kNumChannelsRing;
		default: return kNumChannelsMax;
	}
}
