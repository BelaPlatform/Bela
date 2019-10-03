#include <I2c.h>
#include <stdint.h>

class Trill : public I2c
{
	private:

		enum {
			kCommandNone = 0,
			kCommandMode = 1,
			kCommandScanSettings = 2,
			kCommandPrescaler = 3,
			kCommandNoiseThreshold = 4,
			kCommandIdac = 5,
			kCommandBaselineUpdate = 6,
			kCommandMinimumSize = 7,
			kCommandIdentify = 255
		};

		enum {
			kOffsetCommand = 0,
			kOffsetData = 4
		};

		enum {
			kNormalLengthDefault = 20,
			kNormalLength2D = 32,
			kRawLength = 60
		};

		enum {
			kMaxTouchNum1D = 5,
			kMaxTouchNum2D = 4
		};

		enum {
			kNumSensorsBar = 26,
			kNumSensors = 30
		};

		bool preparedForDataRead_ = false;
		uint8_t device_type_; // Which type of device is connected (if any)
		uint8_t firmware_version_; // Firmware version running on the device
		uint8_t num_touches_; // Number of touches on last read
		uint8_t mode_; // Which mode the device is in

		uint8_t dataBuffer[kRawLength];
		uint16_t commandSleepTime = 10000;

	public:
		int rawData[kNumSensors];

		enum Modes {
			NORMAL = 0,
			RAW = 1,
			BASELINE = 2,
			DIFF = 3
		};

		enum Devices {
			NONE = 0,
			ONED = 1,
			TWOD = 2
		};

		Trill();
		~Trill();
		Trill(int i2c_bus, int i2c_address, int mode);
		int setup(int i2c_bus = 1, int i2c_address = 0x18, int mode = NORMAL);
		int setup(int i2c_bus, int i2c_address, int mode, int threshold, int prescaler);
		void cleanup();

		bool isReady(){ return preparedForDataRead_; }

		/* Update the baseline value on the sensor*/
		int updateBaseLine();
		int prepareForDataRead();
		int readI2C(); // This should maybe be renamed readRawData()
		int readLocations();
		/* Return the type of the device attached or 0 if none is attached */
		int deviceType() { return device_type_; }
		int firmwareVersion() { return firmware_version_; }
		int getMode() { return mode_; }
		int identify();
		void printDetails() {
			printf("Device type: %d\n", deviceType());
			printf("Firmware version: %d\n", firmwareVersion());
		};
		int numSensors();

		/* --- Scan configuration settings --- */
		int setMode(uint8_t mode);
		int setScanSettings(uint8_t speed, uint8_t num_bits = 12);
		int setPrescaler(uint8_t prescaler);
		int setNoiseThreshold(uint8_t threshold);
		int setIDACValue(uint8_t value);
		int setMinimumTouchSize(uint16_t size);

		/* --- Touch-related information --- */
		int numberOfTouches();
		int numberOfHorizontalTouches();
		int touchLocation(uint8_t touch_num);
		int touchSize(uint8_t touch_num);
		/* Only for 2D sensors */
		int touchHorizontalLocation(uint8_t touch_num);
		int touchHorizontalSize(uint8_t touch_num);

};
