#include "../include/Tlv320_Es9080_Codec.h"
#include <stdexcept>
#include <algorithm>

constexpr AudioCodecParams::TdmMode kTdmModeTdm = AudioCodecParams::kTdmModeTdm;
constexpr AudioCodecParams::ClockSource kClockSourceMcasp = AudioCodecParams::kClockSourceMcasp;
constexpr AudioCodecParams::ClockSource kClockSourceCodec = AudioCodecParams::kClockSourceCodec;
constexpr AudioCodecParams::ClockSource kClockSourceExternal = AudioCodecParams::kClockSourceExternal;

[[noreturn]] static void throwErr(std::string err, std::string token = "")
{
	throw std::runtime_error("Tlv320_Es9080_Codec: " + err + (token != "" ? "`" + token : "") + "`\n");
}

Tlv320_Es9080_Codec::Tlv320_Es9080_Codec(int tlvI2cBus, int tlvI2cAddr, I2c_Codec::CodecType tlvType, int esI2cBus, int esI2cAddr, int esResetPin, bool verbose)
{
	tlv320 = new I2c_Codec(tlvI2cBus, tlvI2cAddr, tlvType, verbose);
	// temporarily instantiate es9080 so we can getNumIns/getNumOuts. Overridden below.
	es9080 = new Es9080_Codec(esI2cBus, esI2cAddr, kClockSourceCodec, esResetPin, 0, 0);
	primaryCodec = tlv320;
	secondaryCodec = es9080;
	AudioCodecParams params;
	params.slotSize = 32;
	params.startingSlot = 0;
	params.bitDelay = 1; // required by current Es9080 driver. Can be fixed there probably if needed.
	params.mclk = primaryCodec->getMcaspConfig().getValidAhclk(24000000);
	params.samplingRate = 44100;
	params.dualRate = false;
	params.tdmMode = AudioCodecParams::kTdmModeTdm;
	params.bclk = AudioCodecParams::kClockSourceCodec;
	params.wclk = AudioCodecParams::kClockSourceCodec;
	tlv320->setParameters(params);

	mcaspConfig = tlv320->getMcaspConfig();
	// modify the McASP configuration to accommodate both codecs
	mcaspConfig.params.dataSize = 16;
	unsigned int usedSlots = std::max(std::max(primaryCodec->getNumIns(), secondaryCodec->getNumIns()), std::max(primaryCodec->getNumOuts(), secondaryCodec->getNumOuts()));
	unsigned int requiredSlots = 256 / params.slotSize; // TLV can only generate 256-bit frames
	if(requiredSlots < usedSlots)
		throwErr("incompatible number of slots");
	mcaspConfig.params.numSlots = requiredSlots;
	double bclkFreq = params.samplingRate * mcaspConfig.params.slotSize * mcaspConfig.params.numSlots;

	delete es9080;
	// now instantiate it with the proper parameters
	es9080 = new Es9080_Codec(esI2cBus, esI2cAddr, kClockSourceExternal, esResetPin, bclkFreq, verbose);
	secondaryCodec = es9080;
	mcaspConfig.params.inChannels = primaryCodec->getNumIns() + secondaryCodec->getNumIns();
	// McASP has to write to / read from all active slots on all
	// serializers at once.
	// If the channel count differs among serializers, as in this case, we need to
	// use the max of the two and, in slots where we want only one serializer active,
	// write dummy data to the other one or - as in this case - disable subslots.
	mcaspConfig.params.outChannels = 2 * std::max(primaryCodec->getNumOuts(), secondaryCodec->getNumOuts());
	// use all serializers (assuming they are different)
	mcaspConfig.params.outSerializers.push_back(es9080->getMcaspConfig().params.outSerializers[0]);
	if(mcaspConfig.params.outSerializers[0] < mcaspConfig.params.outSerializers[1])
		// if the first serialiser is TLV, disable odd subslots after the first 2
		mcaspConfig.regs.outSerializersDisabledSubSlots = 0x5550;
	else
		// if the second serialiser is TLV, disable even subslots after the first 2
		mcaspConfig.regs.outSerializersDisabledSubSlots = 0xAAA0;
}

Tlv320_Es9080_Codec::~Tlv320_Es9080_Codec()
{
	delete tlv320;
	delete es9080;
}

#define FOR_EACH_CODEC_DO(DO) \
{ \
	if(secondaryCodec->DO) \
		return 1; \
	if(primaryCodec->DO) \
		return 1; \
} \
// FOR_EACH_CODEC_DO

int Tlv320_Es9080_Codec::initCodec()
{
	FOR_EACH_CODEC_DO(initCodec());
	return 0;
}

int Tlv320_Es9080_Codec::startAudio(int shouldBeReady)
{
	// do all codecs, but the last one needs to wait till ready
	if(primaryCodec->startAudio(0))
		return 1;
	if(secondaryCodec->startAudio(shouldBeReady))
		return 1;
	running = true;
	return 0;
}

int Tlv320_Es9080_Codec::stopAudio()
{
	if(running) {
		FOR_EACH_CODEC_DO(stopAudio());
	}
	running = false;
	return 0;
}

#define FOR_CODEC_CHANNEL_DO(do,in) \
{ \
	if(channel < 0) /* all channels on all codecs*/ \
	{ \
		int ret = 0;\
		ret |= secondaryCodec->do; \
		ret |= primaryCodec->do; \
		return ret; \
	} \
	/* else  */ \
	/* TLV is always first and ES is always last*/ \
	unsigned int tlvChs = in ? tlv320->getNumIns() : tlv320->getNumOuts(); \
	if(channel < tlv320->getNumIns()) { \
		if(tlv320->do) return 1; \
	} else { \
		channel -= tlvChs; \
		if(es9080->do) return 1; \
	} \
} \
// FOR_CODEC_CHANNEL_DO

int Tlv320_Es9080_Codec::setInputGain(int channel, float gain)
{
	FOR_CODEC_CHANNEL_DO(setInputGain(channel, gain), true);
	return 0;
}

int Tlv320_Es9080_Codec::setLineOutVolume(int channel, float gain)
{
	FOR_CODEC_CHANNEL_DO(setLineOutVolume(channel, gain), false);
	return 0;
}

int Tlv320_Es9080_Codec::setHpVolume(int channel, float gain)
{
	FOR_CODEC_CHANNEL_DO(setHpVolume(channel, gain), false);
	return 0;
}

int Tlv320_Es9080_Codec::disable()
{
	// Disable extra codecs first
	FOR_EACH_CODEC_DO(stopAudio());
	return 0;
}

int Tlv320_Es9080_Codec::reset()
{
	FOR_EACH_CODEC_DO(reset());
	return 0;
}

McaspConfig& Tlv320_Es9080_Codec::getMcaspConfig()
{
	return mcaspConfig;
}

unsigned int Tlv320_Es9080_Codec::getNumIns(){
	return tlv320->getNumIns() + es9080->getNumIns();
}

unsigned int Tlv320_Es9080_Codec::getNumOuts(){
	//return tlv320->getNumOuts() + es9080->getNumOuts();
	return 2 * es9080->getNumOuts();
}

float Tlv320_Es9080_Codec::getSampleRate() {
	return primaryCodec->getSampleRate();
}

int Tlv320_Es9080_Codec::setMode(std::string str)
{
	FOR_EACH_CODEC_DO(setMode(str));
	return 0;
}
