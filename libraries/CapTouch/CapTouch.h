#include <I2c.h>

class CapTouch : public I2c
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
			kRawLength = 52
		};
		
		uint8_t last_read_loc_; // Which byte reads will begin from on the device
		uint8_t device_type_; // Which type of device is connected (if any)	
		uint8_t firmware_version_; // Firmware version running on the device

		void preapareForDataRead();

	public:
		enum Modes {
			NORMAL = 0,
			RAW = 1,
			BASELINE = 2,
			DIFF = 3
		};

		Captouch();
		~Captouch();
		int setup();
		void cleanup();
		
		int setMode(uint8_t mode);

}:
