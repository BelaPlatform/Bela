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
			ANY = 0, ///< A valid device of unknown type
			BAR = 1, ///< %Trill Bar
			SQUARE = 2, ///< %Trill Square
			CRAFT = 3, ///< %Trill Craft
			RING = 4, ///< %Trill Ring
			HEX = 5, ///< %Trill Hex
			FLEX = 6, ///< %Trill Flex
			UNKNOWN = ANY, ///< same as ANY, for backwards compatibility
		} Device;
		/**
		 * Controls when the EVT pin will be set when a new frame is
		 * available. In this context, the meaning "activity is detected"
		 * depends on the #Mode in which the device is:
		 * - in #CENTROID mode, activity is detected if one or more
		 *   touches are detected
		 * - in any other mode, activity is detected if any channel
		 *   after formatting is non-zero.
		 */
		typedef enum {
			kEventModeTouch = 0, ///< Only set the EVT pin if activity is detected in the current frame
			kEventModeChange = 1, ///< Only set the EVT pin if activity is detected in the current or past frame
			kEventModeAlways = 2, ///< Set the EVT pin every time a new frame is available
		} EventMode;
		/**
		 *
		 */
		typedef enum {
			kScanTriggerDisabled = 0x0, ///< Do not scan capacitive channels.
			kScanTriggerI2c = 0x1, ///< Scan capacitive channels after every I2C transaction
			kScanTriggerTimer = 0x2, ///< Scan capacitive channels every time the timer set by setAutoScanInterval() expires
			kScanTriggerI2cOrTimer = 0x3, ///< Scan capacitive channels after every I2C transaction or when timer expires, whichever comes first.
		} ScanTriggerMode;
	private:
		Mode mode_; // Which mode the device is in
		Device device_type_ = NONE; // Which type of device is connected (if any)
		uint32_t frameId;
		uint8_t statusByte;
		uint8_t address;
		uint8_t firmware_version_ = 0; // Firmware version running on the device
		uint8_t num_touches_; // Number of touches on last read
		bool dataBufferIncludesStatusByte = false;
		bool quiet = false;
		std::vector<uint8_t> dataBuffer;
		uint16_t commandSleepTime = 1000;
		size_t currentReadOffset = -1;
		bool shouldReadFrameId = false;
		unsigned int numBits;
		unsigned int transmissionWidth = 16;
		unsigned int transmissionRightShift = 0;
		uint32_t channelMask;
		uint8_t numChannels;
		float posRescale;
		float posHRescale;
		float sizeRescale;
		float rawRescale;
		ScanTriggerMode scanTriggerMode;
		int identify();
		void updateRescale();
		void parseNewData(bool includesStatusByte);
		void processStatusByte(uint8_t newStatusByte);
		int writeCommandAndHandle(const i2c_char_t* data, size_t size, const char* name);
		int writeCommandAndHandle(i2c_char_t command, const char* name);
		int readBytesFrom(uint8_t offset, i2c_char_t* data, size_t size, const char* name);
		int readBytesFrom(uint8_t offset, i2c_char_t& byte, const char* name);
		int waitForAck(uint8_t command, const char* name);
		void updateChannelMask(uint32_t mask);
		int verbose = 0;
		uint8_t cmdCounter = 0;
		bool readErrorOccurred;
		bool enableVersionCheck = true;
	public:
		/**
		 * @name RAW, BASELINE or DIFF mode
		 * When the device is in #RAW, #BASELINE, or #DIFF mode, the
		 * readings from the individual sensing channels are accessed
		 * through #rawData.
		 * @{
		 * @class TAGS_canonical_return
		 * @return 0 on success or an error code otherwise.
		 *
		 * @class TAGS_firmware_3_error
		 * \note This feature is only available with devices starting
		 * from firmware version 3. On older devices calling this
		 * function has no effect and it will return an error.
		 *
		 * @class TAGS_firmware_3_undef
		 * \note This feature is only available with devices starting from firmware
		 * version 3. On older devices calling this function has no effect and its
		 * return value is undefined.
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
		 * @param device the device type.
		 *
		 * @param i2c_address the address at which the device can be
		 * found.
		 *
		 * If @p device is #ANY then:
		 * -  if \p i2c_address is a valid address, then
		 * any device detected at that addres will be accepted
		 * - if \p i2c_address is `255` or unspecified, then the range of
		 *   valid addresses will be scanned, stopping at the first
		 *   valid device encountered. Use this with caution as it may
		 *   affect the behaviour of non-Trill devices on the I2C bus.
		 *
		 * Otherwise, if @p i2c_address is `255` or unspecified,
		 * the default address for the specified device type will be used.
		 */
		Trill(unsigned int i2c_bus, Device device, uint8_t i2c_address = 255);
		/**
		 * \copydoc Trill::Trill(unsigned int, Device, uint8_t)
		 *
		 * \copydoc TAGS_canonical_return
		 */
		int setup(unsigned int i2c_bus, Device device = ANY, uint8_t i2c_address = 255);

		/**
		 * Probe the bus for a device at the specified address.
		 *
		 * @return The type of the device that was found. If no device
		 * was found, #NONE is returned.
		 */
		static Device probe(unsigned int i2c_bus, uint8_t i2c_address);

		/**
		 * Probe the bus for a device at any valid address.
		 * \warning Use with caution as it may affect the behaviour of
		 * non-Trill devices on the I2C bus.
		 *
		 * @param i2c_bus the I2C bus to scan
		 * @param maxCount stop discovering new devices after this many
		 * have been discovered. Use 0 to find all possible devices.
		 *
		 * @return A vector containing the #Device and address pairs
		 * identified.
		 */
		static std::vector<std::pair<Device,uint8_t> > probeRange(unsigned int i2c_bus, size_t maxCount = 0);

		/**
		 * Update the baseline value on the device.
		 */
		int updateBaseline();
		/**
		 * Reset the chip.
		 */
		int reset();

		/**
		 * \brief Read data from the device.
		 *
		 * Performs an I2C transaction with the device to retrieve new data
		 * and parse them. Users calling this method won't need to call newData().
		 *
		 * @param shouldReadStatusByte whether or not to read the
		 * status byte as part of the transaction. If the firmware
		 * version is lower than 3, this should be set to `false`.
		 *
		 * \copydoc TAGS_canonical_return
		 */
		int readI2C(bool shouldReadStatusByte = false);

		/**
		 * \brief Set data retrieved from the device.
		 *
		 * Sets the data retrieved from the device.
		 * This can be used to pass to the object
		 * data retrieved elsewhere (e.g.: from an I2C DMA callback).
		 * Users calling readI2C() won't need to call this method.
		 *
		 * @param newData A pointer to an array containing new data.
		 * @param len The length of the array. For proper operation, this
		 * should be the value returned from getBytesToRead().
		 * @param includesStatusByte whether #newData includes the
		 * status byte or not.
		 */
		void newData(const uint8_t* newData, size_t len, bool includesStatusByte = false);

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
		 * Print more details about I/O transactions as they happen.
		 */
		void setVerbose(int verbose);
		/**
		 * Get the number of capacitive channels currently active on the device.
		 */
		unsigned int getNumChannels() const;
		/**
		 * Get the number of capacitive channels available on the device.
		 */
		unsigned int getDefaultNumChannels() const;

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
		 * \copydoc TAGS_canonical_return
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
		 * \copydoc TAGS_canonical_return
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
		 * \copydoc TAGS_canonical_return
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
		 * \copydoc TAGS_canonical_return
		 */
		int setIDACValue(uint8_t value);
		/**
		 * Set minimum touch size
		 *
		 * Sets the minimum touch size below which a touch is ignored.
		 * \copydoc TAGS_canonical_return
		 *
		 */
		int setMinimumTouchSize(float minSize);
		/**
		 * Set how the device triggers a new scan of its capacitive
		 * channels.
		 *
		 * @param arg One of the #ScanTriggerMode values
		 *
		 * \copydoc TAGS_firmware_3_error
		 * \copydoc TAGS_canonical_return
		 */
		int setScanTrigger(ScanTriggerMode scanTriggerMode);
		/**
		 * Set the interval for scanning capacitive channels when the
		 * device's scanning is triggered by the timer.
		 *
		 * @param ms the scanning period, measured in milliseconds. The
		 * effective minimum scanning period will be limited by the scanning
		 * speed, bit depth and any computation happening on the device
		 * (such as touch detection). Granularity is 1 ms for values
		 * until 255 ms and higher after that. Maximum value is just
		 * above 2032 ms.
		 * Scanning on timer has to be separately enabled via setScanTrigger().
		 * When @p ms is not greater than zero, the timer is disabled.
		 *
		 * \note The 32kHz clock often deviates by 10% or more from its
		 * nominal frequency, thus affecting the accuracy of the timer.
		 */
		int setTimerPeriod(float ms);
		/**
		 * Deprecated. Same as setTimerPeriod(), but the @p interval is
		 * expressed as cycles of a 32kHz clock. On devices with
		 * firmware 2, @p interval is used directly. On devices with
		 * firwmare 3 or above, it is quantised to blocks of at least
		 * 1 ms.
		 */
		int setAutoScanInterval(uint16_t interval);
		/**
		 * Set how the EVT pin behaves.
		 *
		 * @param mode an #EventMode denoting the required behaviour.
		 *
		 * \copydoc TAGS_canonical_return
		 * \copydoc TAGS_firmware_3_error
		 */
		int setEventMode(EventMode mode);
		/**
		 * Set a channel mask identifying which scanning channels are
		 * enabled.
		 *
		 * @param mask The channel mask. Bits 0 to 31 identify channels
		 * 0 to 31 respectively. Bit positions higher than the value
		 * returned by getDefaultNumChannels() are ignored.
		 *
		 * \copydoc TAGS_canonical_return
		 * \copydoc TAGS_firmware_3_error
		 */
		int setChannelMask(uint32_t mask);
		/**
		 * Set the format used for transmission of non-centroid data
		 * from the device to the host.
		 *
		 * @param width The data width. If a value would overflow when
		 * stored, it is clipped.
		 * @param shift Number of right shift operations applied on the
		 * value before being stored in the word.
		 *
		 * \copydoc TAGS_canonical_return
		 * \copydoc TAGS_firmware_3_error
		 */
		int setTransmissionFormat(uint8_t width, uint8_t shift);
		/** @} */ // end of Scan Configuration Settings
		/**
		 * @name Status byte
		 * @{
		 */
		/**
		 * Read the status byte from the device.
		 * Alternatively, the status byte can be read as part of
		 * reading data by calling readI2C(true).
		 *
		 * @return the status byte, or a negative value in case of
		 * error. As a successful call also updates the
		 * internal state, the caller is probably better off calling
		 * getFrameId(), hasActivity(), hasReset() instead of parsing
		 * the status byte directly.
		 *
		 * \copydoc TAGS_firmware_3_undef
		 */
		int readStatusByte();
		/**
		 * Whether the device has reset since a identify command was
		 * last written to it.
		 *
		 * This relies on a current status byte.
		 *
		 * \copydoc TAGS_firmware_3_error
		 */
		bool hasReset();
		/**
		 * Whether activity has been detected in the current frame.
		 *
		 * This relies on a current status byte.
		 *
		 * \copydoc TAGS_firmware_3_undef
		 */
		bool hasActivity();
		/**
		 * Get the frameId.
		 * This relies on a current status byte.
		 *
		 * \copydoc TAGS_firmware_3_undef
		 */
		uint8_t getFrameId();
		/**
		 * Same as above, but it tries to unwrap the 6-bit frameId into
		 * a uint32_t counter.
		 * This relies on reading several status bytes over time.
		 * The counter is guaranteed monotonic, but it can only be
		 * regarded as an actual frame counter if the status byte is
		 * read at least once every 63 frames.
		 *
		 * @return the counter
		 * \copydoc TAGS_firmware_3_undef
		 */
		uint32_t getFrameIdUnwrapped();
		/**
		 * @}
		 */

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
		 * Return the number of bytes to read when reading data.
		 */
		unsigned int getBytesToRead(bool includesStatusByte);
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
