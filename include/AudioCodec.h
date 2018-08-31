#ifndef AUDIOCODEC_H_
#define AUDIOCODEC_H_

class AudioCodec
{
public:
	virtual ~AudioCodec() {};
	virtual int initCodec() = 0;
	virtual int startAudio(int parameter) = 0;
	virtual int stopAudio() = 0;
	virtual int setPga(float newGain, unsigned short int channel) = 0;
	virtual int setDACVolume(int halfDbSteps) = 0;
	virtual int setADCVolume(int halfDbSteps) = 0;
	virtual int setHPVolume(int halfDbSteps) = 0;
	virtual int disable() = 0;
	virtual int reset() = 0;
};
#endif /* AUDIOCODEC_H_ */
