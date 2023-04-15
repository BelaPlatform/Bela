/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Trill/general-settings/render.cpp

Adjusting Trill Settings
========================

This example will work with all types of Trill sensor and will allow you to adjust
the sensitivity and threshold settings.

The first thing to do is make sure that the correct sensor type is
given to `touchSensor.setup();`. If you have changed the address of the sensor
then you will need to add that to this function too.

The Trill sensor is scanned on an auxiliary task running parallel to the audio thread.

Launch the GUI to visualise the value of each capacitive channel on the sensor.

There are two important sensor settings that you may want to adjust when working
with the Trill sensors: the `threshold` and the `prescaler`.

The `threshold` setting is simply the threshold above which to read and is for
ignoring any noise that might be present in the lowest regions of the sensor reading.
This only applies to `DIFF` mode and is a float between 0.0 and 1.0. Typically values
would stay below 0.1.

The `prescaler` setting equates to the sensitivity of the sensor. Technically, this
value is a divider for the clock on the cypress chip and so it decides how long the
chip charges the connected material for before taking a reading. There are 8 different
settings for the prescaler.

The rule of thumb when adjusting these values is:
- A higher value prescaler (i.e. longer charging time as it is a divider of the clock)
  is better for more resistive materials and larger conductive objects connected.
- A lower value prescaler is better for proximity sensing.

When connecting different materials to Trill Craft we recommend experimenting with
the settings using this example. This example allows you to experiment with different
settings from within the GUI which you can then hard code in your project
once you're happy with the behaviour of the sensors.
*/

#include <Bela.h>
#include <libraries/Trill/Trill.h>
#include <libraries/Gui/Gui.h>
#include <libraries/Pipe/Pipe.h>
#include <poll.h>
#include <GPIOcontrol.h>

// Connect the EVT pin of the device to Bela.
// This is used in two ways: in `render()` it is read as Bela digital input and
// is used to measure period time. In `loop()` it is used to trigger device
// reads when hostReadTrigger is set to kHostReadTriggerEvt.
// We therefore need to identify the same pin by two different numbers: the
// Bela Digital number and the GPIO number.
static const unsigned int kDigitalInEventPin = 1; // Bela Digital in 1, P2.02
const size_t kGpioEventPin = 59; // PocketBeagle GPIO 59, P2.02

Trill touchSensor;

Pipe gPipe;
Gui gui;

// Sleep time for auxiliary task
unsigned int gTaskSleepTime = 12000; // microseconds

// Time period (in seconds) after which data will be sent to the GUI
float gTimePeriod = 0.015;

int bitResolution = 12;

typedef enum {
	kPrescaler,
	kBaseline,
	kNoiseThreshold,
	kNumBits,
	kMode,
	kReset,
	kTransmissionWidth,
	kTransmissionRightShift,
	kChannelMask,
	kEventMode,
	kScanTriggerI2c,
	kScanTriggerTimer,
	kTimerPeriod,
	kHostReadTrigger,
} ids_t;
struct Command {
	ids_t id;
	double value;
};

#include <tuple>
std::vector<std::pair<std::wstring, ids_t>> gKeys =
{
	{L"prescaler", kPrescaler},
	{L"baseline", kBaseline},
	{L"noiseThreshold", kNoiseThreshold},
	{L"numBits", kNumBits},
	{L"mode", kMode},
	{L"reset", kReset},
	{L"transmissionWidth", kTransmissionWidth},
	{L"transmissionRightShift", kTransmissionRightShift},
	{L"channelMask", kChannelMask},
	{L"eventMode", kEventMode},
	{L"scanTriggerI2c", kScanTriggerI2c},
	{L"scanTriggerTimer", kScanTriggerTimer},
	{L"timerPeriod", kTimerPeriod},
	{L"hostReadTrigger", kHostReadTrigger},
};

// This callback is called every time a new message is received from the Gui.
// Given how we cannot operate on the touchSensor object from a separate
// thread, we need to pipe the received messages to the loop() thread, so that
// they can be processed there
bool guiCallback(JSONObject& json, void*)
{
	struct Command command;
	for(auto& k : gKeys)
	{
		if(json.find(k.first) != json.end())
		{
			if(json[k.first]->IsNumber())
				command.value = json[k.first]->AsNumber();
			else if (json[k.first]->IsBool())
				command.value = json[k.first]->AsBool();
			else {
				fprintf(stderr, "Unexpected JSON element: %s with incompatible argument\n", JSON::ws2s(k.first).c_str());
				continue;
			}
			command.id = k.second;
			gPipe.writeNonRt(command);
		}
	}
	return false;
}

void setScanTriggerMode(const Command& cmd)
{
	static int mode = 0;
	Trill::ScanTriggerMode flag = kScanTriggerI2c == cmd.id ? Trill::kScanTriggerI2c : Trill::kScanTriggerTimer;
	if(cmd.value)
		mode |= flag;
	else
		mode &= ~flag;
	printf("setting scanTrigger (%s:%d) to 0x%02x\n", kScanTriggerI2c == cmd.id ? "I2C" : "timer", int(cmd.value), mode);
	touchSensor.setScanTrigger(Trill::ScanTriggerMode(mode));
}

void loop(void*)
{
	int numBits;
	int speed = 0;
	uint8_t transmissionWidth = 16;
	uint8_t transmissionRightShift = 0;
	enum { kHostReadTriggerEvt = 0, kHostReadTriggerDisabled = 1001 };
	int hostReadTrigger = kHostReadTriggerDisabled;
	int fd = -1;
	while(!Bela_stopRequested())
	{
		bool shouldScan;
		if(kHostReadTriggerEvt == hostReadTrigger)
		{
			struct pollfd pfd[1];
			pfd[0].fd = fd;
			pfd[0].events = POLLPRI;
			int result = poll(pfd, 1, 50);
			if(1 == result && (pfd[0].revents & POLLPRI)) {
				char buf[16];
				// edge detected. We need to read the file in order to ensure
				// the next edge is detected appropriately.
				int ret = read(fd, &buf, sizeof(buf));
				ret |= lseek(fd, SEEK_SET, 0);
				if(ret <= 0) {
					fprintf(stderr, "read error :%d\n", ret);
					break;
				} else {
					// printf("edge %16s\n", buf);
				}
				shouldScan = true;
			} else if (result < 0) {
				fprintf(stderr, "Error while polling edge: %s %d\n", strerror(errno), errno);
				break;
			} else {
				// otherwise it's just a timeout: no edge detected.
				// We skip reading but we go through the rest to process and fwd any commands.
				shouldScan = false;
			}
		} else if (kHostReadTriggerDisabled == hostReadTrigger) {
			shouldScan = false;
			usleep(10000); // sleep a bit not to clog the CPU
		} else {
			usleep(hostReadTrigger * 1000);
			shouldScan = true;
		}
		if(shouldScan)
			touchSensor.readI2C(true);

		Command command;
		// receive any command from the gui through the pipe
		while(1 == gPipe.readRt(command))
		{
			double value = command.value;
			switch(command.id)
			{
				case kPrescaler:
					printf("setting prescaler to %.0f\n", value);
					touchSensor.setPrescaler(value);
					break;
				case kBaseline:
					printf("reset baseline\n");
					touchSensor.updateBaseline();
					break;
				case kReset:
					printf("reset chip\n");
					touchSensor.reset();
					usleep(500000);
					break;
				case kNoiseThreshold:
					printf("setting noiseThreshold to %f\n", value);
					touchSensor.setNoiseThreshold(value);
					break;
				case kNumBits:
					numBits = value;
					printf("setting number of bits to %d\n", numBits);
					touchSensor.setScanSettings(speed, numBits);
					break;
				case kTransmissionWidth:
					transmissionWidth = value;
					printf("setting transmission width to %d\n", transmissionWidth);
					touchSensor.setTransmissionFormat(transmissionWidth, transmissionRightShift);
					break;
				case kTransmissionRightShift:
					transmissionRightShift = value;
					printf("setting transmission right shift to %d\n", transmissionRightShift);
					touchSensor.setTransmissionFormat(transmissionWidth, transmissionRightShift);
					break;
				case kChannelMask:
				{
					uint32_t mask = value;
					printf("setting channel mask to %x\n", mask);
					touchSensor.setChannelMask(value);
				}
					break;
				case kEventMode:
					printf("setting eventMode to %d\n", int(value));
					touchSensor.setEventMode(Trill::EventMode(value));
					break;
				case kScanTriggerI2c:
				case kScanTriggerTimer:
					setScanTriggerMode(command);
					break;
				case kTimerPeriod:
					printf("setting timerPeriod to %d\n", int(value));
					touchSensor.setTimerPeriod(value);
					// touchSensor.setAutoScanInterval(32 * value);
					break;
				case kHostReadTrigger:
					printf("host read trigger %f\n", value);
					if(fd >= 0) {
						close(fd);
						fd = -1;
					}
					hostReadTrigger = value;
					if(kHostReadTriggerEvt == hostReadTrigger) {
						gpio_export(kGpioEventPin);
						gpio_set_dir(kGpioEventPin, INPUT_PIN);
						gpio_set_edge(kGpioEventPin, (char*) "rising");
						fd = gpio_fd_open(kGpioEventPin, O_RDONLY);
					}
					break;
				case kMode:
					printf("setting mode to %.0f\n", value);
					touchSensor.setMode((Trill::Mode)value);
					break;
			}
		}
	}
}

bool setup(BelaContext *context, void *userData)
{
	// Setup a Trill Craft on i2c bus 1, using the default address.
	if(touchSensor.setup(1, Trill::CRAFT) != 0) {
		fprintf(stderr, "Unable to initialise Trill Craft\n");
		return false;
	}
	touchSensor.printDetails();

	gui.setup(context->projectName);
	gui.setControlDataCallback(guiCallback, nullptr);
	gPipe.setup("guiToLoop");

	pinMode(context, 0, kDigitalInEventPin, INPUT);
	Bela_runAuxiliaryTask(loop);
	return true;
}

static std::vector<int> guiBuffer(7);
void render(BelaContext *context, void *userData)
{
	static unsigned int count = 0;
	static unsigned int evtPinPeriodUs = -1;
	for(unsigned int n = 0; n < context->digitalFrames; ++n)
	{
		static unsigned int evtPinCounterSamples;
		static bool pastIn;
		bool in = digitalRead(context, n , kDigitalInEventPin);
		// if the pin goes high
		if(in && ! pastIn)
		{
			static unsigned int evtPinCounterEvents = 0;
			if(0 == evtPinCounterEvents)
				evtPinCounterSamples = 0; // start counting on first event
			++evtPinCounterEvents;
			if(evtPinCounterSamples > 10000)
			{
				// every approx 10000 samples,
				// compute the average period of the events
				float period = evtPinCounterSamples / float(evtPinCounterEvents - 1);
				evtPinPeriodUs = period / context->digitalSampleRate * 1000 * 1000;
				// and restart
				evtPinCounterEvents = 0;
			}
		}
		evtPinCounterSamples++;
		if(evtPinCounterSamples > 80000)
			evtPinPeriodUs = -1; // if no events came in in a long while, tell the GUI that we don't have a valid value
		pastIn = in;
	}

	for(unsigned int n = 0; n < context->audioFrames; n++) {
		// Send channel reads to the GUI
		// after some time has elapsed.
		if(count >= gTimePeriod * context->audioSampleRate)
		{
			// compute average period over the last few frames
			static int periodFromFrameIdUs;
			static unsigned int periodCount = 0;
			static uint32_t startFrameId = 0;
			uint32_t frameId = touchSensor.getFrameIdUnwrapped();
			uint32_t frameCount = frameId - startFrameId;		
			if(periodCount >= 50 && frameCount > 20)
			{
				periodFromFrameIdUs = (gTimePeriod  * periodCount) / float(frameCount) * 1000 * 1000;
				periodCount = 0;
				startFrameId = frameId;
			}
			periodCount++;
			
			guiBuffer[0] = touchSensor.getNumChannels();
			guiBuffer[1] = touchSensor.getFrameId();
			guiBuffer[2] = touchSensor.getFrameIdUnwrapped();
			guiBuffer[3] = touchSensor.hasActivity();
			guiBuffer[4] = touchSensor.hasReset();
			guiBuffer[5] = periodFromFrameIdUs;
			guiBuffer[6] = evtPinPeriodUs;
			gui.sendBuffer(0, guiBuffer);
			gui.sendBuffer(1, touchSensor.rawData);
			count = 0;
		}
		count++;
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
