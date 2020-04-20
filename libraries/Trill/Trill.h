#include <I2c.h>
#include <stdint.h>
#include <string>

class Trill : public I2c
{
	public:
		typedef enum {
			CENTROID = 0,
			RAW = 1,
			BASELINE = 2,
			DIFF = 3,
		} Mode;

		typedef enum {
			UNKNOWN = -1,
			NONE = 0,
			BAR = 1,
			SQUARE = 2,
			CRAFT = 3,
			RING = 4,
			HEX = 5,
		} Device;
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
			kCommandAutoScanInterval = 16,
			kCommandIdentify = 255
		};

		enum {
			kOffsetCommand = 0,
			kOffsetData = 4
		};

		enum {
			kCentroidLengthDefault = 20,
			kCentroidLengthRing = 24,
			kCentroidLength2D = 32,
			kRawLength = 60
		};

		enum {
			kMaxTouchNum1D = 5,
			kMaxTouchNum2D = 4
		};

		enum {
			kNumSensorsBar = 26,
			kNumSensorsRing = 28,
			kNumSensorsMax = 30,
		};

		Mode mode_; // Which mode the device is in
		Device device_type_; // Which type of device is connected (if any)
		uint8_t address;
		uint8_t firmware_version_; // Firmware version running on the device
		uint8_t num_touches_; // Number of touches on last read
		uint8_t dataBuffer[kRawLength];
		uint16_t commandSleepTime = 10000;
		bool preparedForDataRead_ = false;
		int prepareForDataRead();
		int identify();
	public:
		int rawData[kNumSensorsMax];

		static constexpr uint8_t speedValues[4] = {0, 1, 2, 3}; // Ordered in decreasing speed: 0 is CSD_ULTRA_FAST_SPEED and 3 is CSD_SLOW_SPEED
		static constexpr uint8_t prescalerValues[6] = {1, 2, 4, 8, 16, 32};
		static constexpr uint8_t thresholdValues[7] = {0, 10, 20, 30, 40, 50, 60};
		Trill();
		~Trill();
		Trill(unsigned int i2c_bus, uint8_t i2c_address, Mode mode);
		int setup(unsigned int i2c_bus, uint8_t i2c_address, Mode mode,
				int threshold = -1, int prescaler = -1);
		void cleanup();

		bool isReady(){ return preparedForDataRead_; }

		/* Update the baseline value on the sensor*/
		int updateBaseLine();
		int readI2C(); // This should maybe be renamed readRawData()
		int readLocations();
		/* Return the type of the device attached*/
		Device deviceType() { return device_type_; }
		const std::string& getDeviceName();
		int firmwareVersion() { return firmware_version_; }
		Mode getMode() { return mode_; }
		void printDetails() ;
		unsigned int numSensors();

		/* --- Scan configuration settings --- */
		int setMode(Mode mode);
		int setScanSettings(uint8_t speed, uint8_t num_bits = 12);
		int setPrescaler(uint8_t prescaler);
		int setNoiseThreshold(uint8_t threshold);
		int setIDACValue(uint8_t value);
		int setMinimumTouchSize(uint16_t size);
		int setAutoScanInterval(uint16_t interval);

		/* --- Touch-related information --- */
		bool is1D();
		bool is2D();
		int hasButtons() { return getMode() == CENTROID && RING == deviceType();};
		int numberOfTouches();
		int numberOfHorizontalTouches();
		int touchLocation(uint8_t touch_num);
		int touchSize(uint8_t touch_num);
		/* --- Only for 2D sensors --- */
		int touchHorizontalLocation(uint8_t touch_num);
		int touchHorizontalSize(uint8_t touch_num);
		/* --- Only for Ring sensors --- */
		int readButtons(uint8_t button_num);
};
