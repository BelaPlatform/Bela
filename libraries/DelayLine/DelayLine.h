#pragma once
/*
 * \brief Basic multi-tap Delay Line Implementation with arbitrary tap number and maximum delay buffer length.
 *  Feedback can either be taken from the main tap or external via the use of set and get feedback loop methods.
 *  Mix of wet and dry signals can be set by using wet/dry mix or independent gains for each signal path.
 *  Process method works sample by sample.
 *
 * 	October 2021
 * 	Author: Adan L. Benito
 */
#include <vector>

class DelayLine
{
	public:
		DelayLine();
		~DelayLine();
		/*
		 * Initialise delay line.
		 *
		 * @param maxDelayTime Maximum size of delay that the delay buffer can hold (in milliseconds)
		 * @param fs Sample frequency
		 * @param nTaps Number of taps for the delay line.
		 */
		DelayLine(float maxDelayTime, float fs, unsigned int nTaps = 1);
		/*
		 * \copydoc DelayLine::DelayLine(float, float, unsigned int)
		 *
		 * @return 0 upon success, error otherwise
		 */
		int setup(float maxDelayTime, float fs, unsigned int nTaps);
		/*
		 * Free/dealocate any used memory.
		 */
		int cleanup();
		/*
		 * Process input and generate delay based on current parameters.
		 *
		 * @param input Input sample.
		 * @return Processed sample
		 */
		float process(float input);
		/*
		 * Set delay time for an specific tap
		 *
		 * @param delayTime Delay time in milliseconds (should be less than maximum delay time.
		 * @param tap Tap index. Defaults to main tap.
		 */
		void setDelayTime(float delayTime, unsigned int tap = 0)
		{
			tap = this->constrain<unsigned int>(tap, 0, _nTaps-1);
			_delaySamples[tap] = this->constrain<float>(_fs * delayTime / 1000.0, 0.0, (float)(_delayBuffer.size()));
		}
		/*
		 * Get current delay time (in milliseconds) for specified tap
		 *
		 * @param tap Tap index. Defaults to main tap.
		 */
		float getDelayTime(unsigned int tap = 0) { return 1000.0 *_delaySamples[tap] / _fs; };

		/* Set feedback gain */
		void setFeedbackGain(float feedbackGain)
		{
			_feedbackGain = this->constrain<float>(feedbackGain, 0.0, 0.99);
		}
		/* Get feedback gain */
		float getFeedbackGain(){ return _feedbackGain; };

		/* Set dry level value independenty from wet level */
		void setDryLevel(float dryLevel)
		{
			_dryLevel = this->constrain<float>(dryLevel, 0.0, 1.0);
		}
		/* Get dry level value */
		float getDryLevel(){ return _dryLevel; };

		/* Set wet level value independenty from dry level */
		void setWetLevel(float wetLevel)
		{
			_wetLevel = this->constrain<float>(wetLevel, 0.0, 1.0);
		}
		/* Get wet level value */
		float getWetLevel(){ return _wetLevel; };
		/*
		 * Set wet/dry mix
		 *
		 * @param wetDryMix Mix value, constrained from 0 to 1 ( 0 -> only dry, 1 -> only wet)
		 */
		void setWetDryMix(float wetDryMix)
		{
			_wetLevel = this->constrain<float>(wetDryMix, 0.0, 1.0);
			_dryLevel = 1.0 - _wetLevel;
		}
		/* Get wet/dry mix value from dry and wet levels */
		float getWetDryMix();
		/*
		 * Constrain input to a given range
		 *
		 * @param val input value
		 * @param min minimum value in constrained range
		 * @param max maximum value in constrained range
		 */
		template <typename T>
		static T constrain(T val, T min, T max)
		{
			T retVal = val;
			if(retVal < min)
				retVal = min;
			if(retVal > max)
				retVal = max;
			return retVal;
		}
		/*
		 * Simple linear interpolation method using previous and next value.
		 * This method is used to interpolate read pointers for each delay tap.
		 *
		 * @param index Interpolation index
		 * @param pVal Previous value
		 * @param nVal Next value
		 * @return Interpolated value
		 */
		static float lerp(float index, float pVal, float nVal);
		/* Get feedback send value as set during delay processing based on the interpolated
		 * reading of the delay line.
		 */
		float getFeedbackSend() { return _feedbackSend; };
		/*
		 * Set feedback return value.
		 * This can be either the feedback send value after processing or any other desired input.
		 *
		 * @param feedbackReturn Input value for feedback return path summed to the delay.
		 * @param preGain Boolean flag indicating wether feedback gain is applied to feedback input (post-gain) or not (pre-gain).
		 */
		void setFeedbackReturn(float feedbackReturn, bool preGain = false)
		{
			_feedbackReturn = (preGain) ?  feedbackReturn : _feedbackGain * feedbackReturn;
		}
		/*
		 * Flag to indicate wether the internal or external feedback path is being used.
		 *
		 * @param doUse Flag value, if true use external feedback path.
		 */
		void useExternalFeedback(bool doUse) { _externalFeedback = doUse; }
		/*
		 * Update pointer and interpolate to get delay output for an specific tap.
		 *
		 * @param tap Tap index.
		 * @param preGain Flag. If true output is taken before applying wet gain.
		 */
		float getTapOutput(unsigned int tap, bool preGain = true)
		{
			updateReadPointer(tap);
			return (preGain) ? interpolatedRead(_readPtr[tap]) : interpolatedRead(_readPtr[tap] * _wetLevel);
		}
		/*
		 * Flag to indicate wether taps are taken independently from the main tap or summed together and written back into the buffer.
		 *
		 * @param doUse Flag value, if true do not add taps to the main tap in processing() and allow to use independently..
		 */
		void useSeparateTaps(bool doUse) { _separateTaps = doUse; };
		/* Empty delay buffer */
		void flush() { std::fill(_delayBuffer.begin(), _delayBuffer.end(), 0); }
		/* Reset delay value and read pointer for all taps to the values indicated by the main tap */
		void resetTaps()
		{
			for(unsigned int t = 1; t<_nTaps; t++)
			{
				_delaySamples[t] = _delaySamples[0];
				_readPtr[t] = _readPtr[0];
			}
		}

	private:
		float _fs = 0.0; // Sample frequency
		float * _delaySamples = nullptr; // Pointer to array of delay times (in samples) for delay taps
		float _feedbackGain = 0.0; // Feedback gain
		float _dryLevel = 1.0; // Dry level
		float _wetLevel = 0.0; // Wet level

		float _feedbackSend = 0.0; // Feedback loop send value
		float _feedbackReturn = 0.0; // Feebback loop return value
		bool _externalFeedback = false; // Use external feedback flag

		unsigned int _writePtr = 0; // Write pointer for delay line

		unsigned int _nTaps = 1; // Number of taps
		float *_readPtr = nullptr; // Pointer to array of read pointers for delay taps
		bool _separateTaps = false; // Use separate taps flag

		std::vector<float> _delayBuffer; // Delay buffer

		/*
		 * Update write pointer and wrap around delay buffer size
		 */
		void updateWritePointer()
		{
			if(++_writePtr >= _delayBuffer.size())
				_writePtr = 0;
		}

		/*
		 * Update read pointer for specified tap adn wrap around delay buffer size
		 */
		void updateReadPointer(unsigned int tap = 0);
		/*
		 * Interpolate reading for a float index
		 */
		float interpolatedRead(float index);

};
