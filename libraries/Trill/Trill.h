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
			NONE = -1,
			UNKNOWN = 0,
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
			kNumChannelsBar = 26,
			kNumChannelsRing = 28,
			kNumChannelsMax = 30,
		};

		Mode mode_; // Which mode the device is in
		Device device_type_; // Which type of device is connected (if any)
		uint8_t address;
		uint8_t firmware_version_; // Firmware version running on the device
		uint8_t num_touches_; // Number of touches on last read
		uint8_t dataBuffer[kRawLength];
		uint16_t commandSleepTime = 10000;
		bool preparedForDataRead_ = false;
		unsigned int numBits;
		float posRescale;
		float posHRescale;
		float sizeRescale;
		float rawRescale;
		int prepareForDataRead();
		int identify();
		void updateRescale();
	public:
		/**
		 * An array containing the raw reading when the sensor is in
		 * RAW, BASELINE or DIFF mode
		 */
		float rawData[kNumChannelsMax];

		/**
		 * An array containing the valid values for the speed parameter
		 * in setScanSettings()
		 */
		static constexpr uint8_t speedValues[4] = {0, 1, 2, 3};
		/**
		 * The maximum value for the setPrescaler() method
		 */
		static constexpr uint8_t prescalerMax = 8;
		Trill();
		~Trill();
		Trill(unsigned int i2c_bus, uint8_t i2c_address, Mode mode);
		int setup(unsigned int i2c_bus, uint8_t i2c_address, Mode mode,
				float threshold = -1, int prescaler = -1);
		void cleanup();

		/**
		 * Update the baseline value on the sensor.
		 */
		int updateBaseLine();

		int readI2C(); // This should maybe be renamed readRawData()
		int readLocations();

		/**
		 * Get the device type.
		 */
		Device deviceType() { return device_type_; }
		/**
		 * Get the device type as a string.
		 */
		const std::string& getDeviceName();
		/**
		 * Get the firmware version of the device.
		 */
		int firmwareVersion() { return firmware_version_; }
		/**
		 * Get the mode that the device is currently in.
		 */
		Mode getMode() { return mode_; }
		/**
		 * Print details about the device to standard output
		 */
		void printDetails() ;
		/**
		 * Get the number of capacitive channels on the device.
		 */
		unsigned int getNumChannels();

		/**
		 * @name TrillScanConfigurationSettings
		 * @{
		 *
		 * Some of the methods below map directly to function calls and
		 * values described in the Cypress CapSense Sigma-Delta Datasheet v2.20
		 * available [here](https://www.cypress.com/file/124551/download)
		 */
		/**
		 * Set the operational mode of the device.
		 *
		 * @param mode The device mode. Possible values are:
		 * - CENTROID: touches are detected as discrete entities and
		 *   can be retrieved with the touch...() methods
		 * - RAW: the rawData array contains the raw readings of each
		 *   individual capacitive sensing channel. This corresponds to
		 *   CSD_waSnsResult.
		 * - BASELINE: the rawData arraty contains the baseline
		 *   readings of each individual capacitive sensing channel.
		 *   This corresponds to CSD_waSnsBaseline.
		 * - DIFF: the rawData array contains differential readings
		 *   between the baseline and the raw reading. This corresponds
		 *   to CSD_waSnsDiff.
		 */
		int setMode(Mode mode);
		/**
		 * Set the speed and bit depth of the capacitive scanning.
		 * This triggers a call to CSD_SetScanMode(speed, num_bits)
		 * on the device.
		 *
		 * @param speed The speed of the scanning
		 * Valid values of speed are, ordered by decreasing speed, are
		 * comprised between 0 (CSD_ULTRA_FAST_SPEED) and 3 (CSD_SLOW_SPEED)
		 * @param num_bits The bit depth of the scanning.
		 * Valid values are comprised between 9 and 12.
		 */
		int setScanSettings(uint8_t speed, uint8_t num_bits = 12);
		/**
		 * Set the prescaler value for the capacitive scanning.
		 * This triggers a call to CSD_SetPrescaler(prescaler)
		 * on the device.
		 *
		 * @param prescaler The prescaler value. Valid values are
		 * between 0 and 8, inclusive, and map directly to values
		 * CSD_PRESCALER_1 to CSD_PRESCALER_256.
		 */
		int setPrescaler(uint8_t prescaler);
		/**
		 * Set the noise threshold for the capacitive channels.
		 *
		 * When a channel's scan returns a value smaller than the
		 * threshold, its value is set to 0.
		 *
		 * @param threshold the noise threshold level. Valid values are
		 * between 0 and `255.0/(1 << numBits)`.
		 * The value is internally converted to an 8-bit integer by
		 * multiplying it times `1 << numBits` before being sent to the device.
		 * On the device, the received value is used to set the
		 * CSD_bNoiseThreshold variable.
		 */
		int setNoiseThreshold(float threshold);
		/**
		 * Sets the IDAC value for the sensors.
		 *
		 * Thie triggers a call to CSD_SetIdacValue(value) on the device.
		 *
		 * @param value the IDAC value. Valid values are between 0 and 255.
		 */
		int setIDACValue(uint8_t value);
		int setMinimumTouchSize(uint16_t size);
		/**
		 * Set the sensor to scan automatically at the specified intervals.
		 *
		 * @param interval The scanning period, measured in ticks of a
		 * 32kHz clock. This effective scanning period will be limited
		 * by the scanning speed, bit depth and any computation
		 * happening on the device (such as touch detection). A value
		 * of 0 disables auto scanning.
		 */
		int setAutoScanInterval(uint16_t interval);
		/**
		 * @}
		 */

		/* --- Touch-related information --- */
		bool is1D();
		bool is2D();
		int hasButtons() { return getMode() == CENTROID && RING == deviceType();};
		unsigned int numberOfTouches();
// Number of horizontal touches for Trill 2D
		unsigned int numberOfHorizontalTouches();
// Location of a particular touch.
// Range: 0 to N-1.
// Returns -1 if no such touch exists.
		float touchLocation(uint8_t touch_num);

// Size of a particular touch.
// Range: 0 to N-1.
// Returns -1 if no such touch exists.
		float touchSize(uint8_t touch_num);
		/* --- Only for 2D sensors --- */
		float touchHorizontalLocation(uint8_t touch_num);
		float touchHorizontalSize(uint8_t touch_num);
		/* --- For all sensors, but most useful for 2D sensors --- */
		float compoundTouchSize();
		float compoundTouchHorizontalLocation();
		float compoundTouchLocation();
		/* --- Only for Ring sensors --- */
		int buttonValue(uint8_t button_num);
};
