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

Trill touchSensor;

Pipe gPipe;
Gui gui;

// Sleep time for auxiliary task
unsigned int gTaskSleepTime = 12000; // microseconds

// Time period (in seconds) after which data will be sent to the GUI
float gTimePeriod = 0.015;

int bitResolution = 12;

int gButtonValue = 0;

typedef enum {
	kPrescaler,
	kBaseline,
	kNoiseThreshold,
	kNumBits,
	kMode,
} ids_t;
struct Command {
	ids_t id;
	float value;
};

#include <tuple>
std::vector<std::pair<std::wstring, ids_t>> gKeys =
{
	{L"prescaler", kPrescaler},
	{L"baseline", kBaseline},
	{L"noiseThreshold", kNoiseThreshold},
	{L"numBits", kNumBits},
	{L"mode", kMode},
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
		if(json.find(k.first) != json.end() && json[k.first]->IsNumber())
		{
			command.id = k.second;
			command.value = json[k.first]->AsNumber();
			gPipe.writeNonRt(command);
		}
	}
	return false;
}

void loop(void*)
{
	int numBits;
	int speed = 0;
	while(!Bela_stopRequested())
	{
		touchSensor.readI2C();

		Command command;
		// receive any command from the gui through the pipe
		while(1 == gPipe.readRt(command))
		{
			float value = command.value;
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
				case kNoiseThreshold:
					printf("setting noiseThreshold to %f\n", value);
					touchSensor.setNoiseThreshold(value);
					break;
				case kNumBits:
					numBits = value;
					printf("setting number of bits to %d\n", numBits);
					touchSensor.setScanSettings(speed, numBits);
					break;
				case kMode:
					printf("setting mode to %.0f\n", value);
					touchSensor.setMode((Trill::Mode)value);
					break;
			}
		}
		usleep(50000);
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

	Bela_runAuxiliaryTask(loop);
	return true;
}

void render(BelaContext *context, void *userData)
{
	static unsigned int count = 0;

	for(unsigned int n = 0; n < context->audioFrames; n++) {
		// Send number of touches, touch location and size to the GUI
		// after some time has elapsed.
		if(count >= gTimePeriod*context->audioSampleRate)
		{
			gui.sendBuffer(0, touchSensor.getNumChannels());
			gui.sendBuffer(1, touchSensor.rawData);
			count = 0;
		}
		count++;
	}
}

void cleanup(BelaContext *context, void *userData)
{
}
