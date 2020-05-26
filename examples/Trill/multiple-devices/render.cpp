/// NOTE: this example scans several addresses on the i2c bus
// and it could cause non-Trill peripherals connected to it to malfunction

#include <Bela.h>
#include <libraries/Trill/Trill.h>
#include <libraries/Gui/Gui.h>

Gui gGui;
std::vector<Trill*> gTouchSensors;
unsigned int gSampleCount = 0;
float gSendInterval = 0.1;
unsigned int gSendIntervalSamples;

bool controlCallback(JSONObject& json, void*)
{
	// when any data from the Gui is received (which means it's ready)
	// we send back the id and type of each sensor.
	JSONObject root;
	root[L"event"] = new JSONValue(L"connectedDevices");
	JSONArray devices;
	for(auto t : gTouchSensors) {
		devices.push_back(new JSONValue(JSON::s2ws(Trill::getNameFromDevice(t->deviceType()))));
	}
	root[L"devices"] = new JSONValue(devices);
	JSONValue value(root);
	gGui.sendControl(&value);
	return true;
}

void readLoop(void*)
{
	while(!Bela_stopRequested())
	{
		for(unsigned int n = 0; n < gTouchSensors.size(); ++n)
		{
			Trill* t = gTouchSensors[n];
			t->readI2C();
		}
		usleep(50000);
	}
}

bool setup(BelaContext *context, void *userData)
{
	unsigned int i2cBus = 1;
	for(uint8_t addr = 0x20; addr <= 0x50; ++addr)
	{
		Trill::Device device = Trill::probe(i2cBus, addr);
		if(Trill::NONE != device && Trill::CRAFT != device)
		{
			gTouchSensors.push_back(new Trill(i2cBus, device, Trill::AUTO, addr));
		}
	}
	Bela_runAuxiliaryTask(readLoop);
	gGui.setup(context->projectName);
	gGui.setControlDataCallback(controlCallback);
	gSendIntervalSamples = context->audioSampleRate * gSendInterval;
	return true;
}

void render(BelaContext *context, void *userData)
{
	for(unsigned int n = 0; n < context->audioFrames; ++n)
	{
		gSampleCount++;
		if(gSampleCount == gSendIntervalSamples)
		{
			gSampleCount = 0;
			float arr[3];
			for(unsigned int t = 0; t < gTouchSensors.size(); ++t) {
				arr[0] = gTouchSensors[t]->compoundTouchSize();
				arr[1] = gTouchSensors[t]->compoundTouchLocation();
				arr[2] = gTouchSensors[t]->compoundTouchHorizontalLocation();
				gGui.sendBuffer(t, arr);
				rt_printf("[%d] %2.3f %.3f %.3f  ", t, arr[0], arr[1], arr[2]);
			}
			rt_printf("\n");
		}
	}
}

void cleanup(BelaContext *context, void *userData)
{
	for(auto t : gTouchSensors)
		delete t;
}
