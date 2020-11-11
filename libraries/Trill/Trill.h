#pragma once
#include <I2c.h>
#include <stdint.h>
#include <string>
#include <vector>

/**
 * \brief A class to use the Trill family of capacitive sensors.
 * http://bela.io/trill
 * \nosubgrouping
 */

class Trill : public I2c
{
	public:
		/**
		 * The acquisition modes that a device can be set to.
		 */
		typedef enum {
			AUTO = -1, /**< Auto mode: the mode is set
				     automatically based on the device type */
			CENTROID = 0, /**< Centroid mode: detect discrete touches */
			RAW = 1, /**< Raw mode */
			BASELINE = 2, /**< Baseline mode */
			DIFF = 3, /**< Differential mode */
		} Mode;

		/**
		 * The types of Trill devices
		 */
		typedef enum {
			NONE = -1, ///< No device
			UNKNOWN = 0, ///< A valid device of unknown type
			BAR = 1, ///< %Trill Bar
			SQUARE = 2, ///< %Trill Square
			CRAFT = 3, ///< %Trill Craft
			RING = 4, ///< %Trill Ring
			HEX = 5, ///< %Trill Hex
			FLEX = 6, ///< %Trill Flex
		} Device;
	private:
		Mode mode_; // Which mode the device is in
		Device device_type_ = NONE; // Which type of device is connected (if any)
		uint8_t address;
		uint8_t firmware_version_; // Firmware version running on the device
		uint8_t num_touches_; // Number of touches on last read
		std::vector<uint8_t> dataBuffer;
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
		bool readErrorOccurred;
	public:
		/**
		 * @name RAW, BASELINE or DIFF mode
		 * When the device is in #RAW, #BASELINE, or #DIFF mode, the
		 * readings from the individual sensing channels are accessed
		 * through #rawData.
		 * @{
		 */
		/**
		 * An array containing the readings from the device's
		 * channel  when the device is in
		 * #RAW, #BASELINE or #DIFF mode.
		 *
		 * The type of data it contains depend on the device mode:
		 * - #RAW: the #rawData array contains
		 *   the raw readings of each individual capacitive sensing
		 *   channel. This corresponds to `CSD_waSnsResult`.
		 * - #BASELINE:the #rawData
		 *   array contains the baseline readings of each individual
		 *   capacitive sensing channel.
		 *   This corresponds to `CSD_waSnsBaseline`.
		 * - #DIFF: the #rawData array
		 *   contains differential readings between the baseline and
		 *   the raw reading. This corresponds to `CSD_waSnsDiff`.
		 */
		std::vector<float> rawData;
		/** @} */

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
		/**
		 * Initialise the device.
		 *
		 * @param i2c_bus the bus that the device is connected to.
		 * @param device the device type. If #UNKNOWN is passed, then
		 * the \p i2c_address parameter has to be a valid address, and
		 * any detected device type will be accepted. If something else
		 * than #UNKNOWN is passed, and the detected device type is
		 * different from the requested one, the function will fail and
		 * the object will be left uninitialised.
		 * @param i2c_address the address at which the device can be
		 * found. If `255` or no value is passed, the default address
		 * for the specified device type will be used.
		 */
		Trill(unsigned int i2c_bus, Device device, uint8_t i2c_address = 255);
		/**
		 * \copydoc Trill::Trill(unsigned int, Device, uint8_t)
		 *
		 * @return 0 upon success, an error code otherwise.
		 */
		int setup(unsigned int i2c_bus, Device device, uint8_t i2c_address = 255);

		/**
		 * Probe the bus for a device at the specified address.
		 *
		 * @return The type of the device that was found. If no device
		 * was found, #NONE is returned.
		 */
		static Device probe(unsigned int i2c_bus, uint8_t i2c_address);

		/**
		 * Update the baseline value on the device.
		 */
		int updateBaseline();

		/**
		 * \brief Read data from the device.
		 *
		 * Performs an I2C transaction with the device to retrieve new data.
		 */
		int readI2C();

		/**
		 * Get the device type.
		 */
		Device deviceType() { return device_type_; }
		/**
		 * Get the name from the device.
		 */
		static const std::string& getNameFromDevice(Device device);
		/**
		 * Get the device from the name.
		 */
		static Device getDeviceFromName(const std::string& name);
		/**
		 * Get the mode from the name.
		 */
		static const std::string& getNameFromMode(Mode mode);
		/**
		 * Get the mode from the name.
		 */
		static Mode getModeFromName(const std::string& name);
		/**
		 * Get the firmware version of the device.
		 */
		int firmwareVersion() { return firmware_version_; }
		/**
		 * Get the mode that the device is currently in.
		 */
		Mode getMode() { return mode_; }
		/**
		 * Get the current address of the device.
		 */
		uint8_t getAddress() { return address; }
		/**
		 * Print details about the device to standard output
		 */
		void printDetails() ;
		/**
		 * Get the number of capacitive channels on the device.
		 */
		unsigned int getNumChannels();

		/**
		 * @name Scan Configuration Settings
		 * @{
		 *
		 * Some of the methods below map directly to function calls and
		 * variables with the `CSD_` prefix, which are described in the
		 * [Cypress CapSense Sigma-Delta * Datasheet
		 * v2.20](https://www.cypress.com/file/124551/download).
		 */
		/**
		 * Set the operational mode of the device.
		 *
		 * @param mode The device mode. The special mode #AUTO, selects the
		 * device-specific default mode for the _detected_ device type.
		 * @return 0 on success, or an error code otherwise.
		 */
		int setMode(Mode mode);
		/**
		 * Set the speed and bit depth of the capacitive scanning.
		 * This triggers a call to `CSD_SetScanMode(speed, num_bits)`
		 * on the device.
		 *
		 * @param speed The speed of the scanning
		 * Valid values of speed are, ordered by decreasing speed, are
		 * comprised between 0 (`CSD_ULTRA_FAST_SPEED`) and 3 (`CSD_SLOW_SPEED`)
		 * @param num_bits The bit depth of the scanning.
		 * Valid values are comprised between 9 and 16.
		 * @return 0 on success, or an error code otherwise.
		 */
		int setScanSettings(uint8_t speed, uint8_t num_bits = 12);
		/**
		 * Set the prescaler value for the capacitive scanning.
		 * This triggers a call to `CSD_SetPrescaler(prescaler)`
		 * on the device.
		 *
		 * @param prescaler The prescaler value. Valid values are
		 * between 0 and 8, inclusive, and map directly to values
		 * `CSD_PRESCALER_1` to `CSD_PRESCALER_256`.
		 * @return 0 on success, or an error code otherwise.
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
		 * `CSD_bNoiseThreshold` variable.
		 * @return 0 on success, or an error code otherwise.
		 */
		int setNoiseThreshold(float threshold);
		/**
		 * Sets the IDAC value for the device.
		 *
		 * This triggers a call to `CSD_SetIdacValue(value)` on the device.
		 *
		 * @param value the IDAC value. Valid values are between 0 and 255.
		 * @return 0 on success, or an error code otherwise.
		 */
		int setIDACValue(uint8_t value);
		/**
		 * Set minimum touch size
		 *
		 * Sets the minimum touch size below which a touch is ignored.
		 * @return 0 on success, or an error code otherwise.
		 *
		 */
		int setMinimumTouchSize(float minSize);
		/**
		 * Set the device to scan automatically at the specified intervals.
		 *
		 * @param interval The scanning period, measured in ticks of a
		 * 32kHz clock. This effective scanning period will be limited
		 * by the scanning speed, bit depth and any computation
		 * happening on the device (such as touch detection). A value
		 * of 0 disables auto scanning.
		 * @return 0 on success, or an error code otherwise.
		 */
		int setAutoScanInterval(uint16_t interval);
		/** @} */ // end of Scan Configuration Settings

		/**
		 * @name Centroid Mode
		 * @{
		 *
		 * When the device is in #CENTROID mode, touches are
		 * detected as discrete entities and can be retrieved with
		 * the methods in this section.
		 *
		 * The `location` of a touch is a normalised value where `0` and
		 * `1` are the extremes of the axis.
		 *
		 * The `size` of a touch is a rescaled value of the total
		 * activation measured on the sensing channels that contribute
		 * to the touch. The amount of activation for a touch of a
		 * given size is dependent (among other things) on the geometry
		 * of the device. The values used here have been determined
		 * empirically.
		 *
		 * A `compoundTouch` is a single touch represntation obtained
		 * by averaging the location and size of the touches on each
		 * axis and their size.
		 * This is most useful for 2-axes devices, in order to get a
		 * single touch.
		 *
		 * @class TAGS_1d
		 * \note It is only valid to call this method if one of is1D() and
		 * is2D() returns `true`.
		 * @class TAGS_2d
		 * \note It is only valid to call this method is2D() returns `true`
		*/
		/**
		 * Does the device have one axis of position sensing?
		 *
		 * @return `true` if the device has one axis of position sensing
		 * and is set in #CENTROID mode, `false`
		 * otherwise.
		 */
		bool is1D();
		/**
		 * Does the device have two axes of position sensing?
		 *
		 * @return `true` if the device has two axes of position sensing
		 * and is set in #CENTROID mode, `false`
		 * otherwise.
		 */
		bool is2D();
		/**
		 * Return the number of "button" channels on the device.
		 */
		unsigned int getNumButtons() { return 2 * (getMode() == CENTROID && RING == deviceType());};
		/**
		 * Get the number of touches currently active on the
		 * vertical axis of the device.
		 *
		 * \copydoc TAGS_1d
		 */
		unsigned int getNumTouches();
		/**
		 * Get the location of a touch on the vertical axis of the
		 * device.
		 *
		 * \copydoc TAGS_1d
		 *
		 * @param touch_num the number of the touch. This value needs
		 * to be comprised between 0 and `getNumTouches() - 1`.
		 * @return the position of the touch relative to the axis, or
		 * -1 if no such touch exists.
		 */
		float touchLocation(uint8_t touch_num);
		/**
		 * Get the size of a touch.
		 *
		 * \copydoc TAGS_1d
		 *
		 * @return the size of the touch, if the touch exists, or 0
		 * otherwise.
		 */
		float touchSize(uint8_t touch_num);
		/**
		 * Get the number of touches currently active on the
		 * horizontal axis of the device.
		 *
		 * \copydoc TAGS_2d
		 */
		unsigned int getNumHorizontalTouches();
		/**
		 * Get the location of a touch on the horizontal axis of the
		 * device.
		 *
		 * \copydoc TAGS_2d
		 *
		 * @param touch_num the number of the touch. This value needs
		 * to be comprised between 0 and `getNumHorizontalTouches() - 1`.
		 * @return the position of the touch relative to the axis, or
		 * -1 if no such touch exists.
		 *  */
		float touchHorizontalLocation(uint8_t touch_num);
		/**
		 * Get the size of a touch.
		 *
		 * \copydoc TAGS_2d
		 *
		 * @return the size of the touch, if the touch exists, or 0
		 * otherwise.
		 */
		float touchHorizontalSize(uint8_t touch_num);
		/**
		 * Get the vertical location of the compound touch on the
		 * device.
		 *
		 * \copydoc TAGS_1d
		 *  */
		float compoundTouchLocation();
		/**
		 * Get the horizontal location of the compound touch on the
		 * device.
		 *
		 * \copydoc TAGS_1d
		 */
		float compoundTouchHorizontalLocation();
		/**
		 * Get the size of the compound touch on the
		 * device.
		 *
		 * \copydoc TAGS_1d
		 */
		float compoundTouchSize();
		/**
		 * Get the value of the capacitive "button" channels on the
		 * device
		 *
		 * @param button_num the button number. Valid values are
		 * comprised between `0` and `getNumButtons() - 1`.
		 * @return The differential reading on the button, normalised
		 * between 0 and 1.
		 */
		float getButtonValue(uint8_t button_num);

		/** @}*/ // end of centroid mode
};
