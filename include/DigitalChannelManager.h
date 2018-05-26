/*
 * DigitalStream.h
 *
 *  Created on: 7 Jun 2016
 *      Author: giulio
 */

#ifndef DIGITALCHANNELMANAGER_H_
#define DIGITALCHANNELMANAGER_H_
#include <Bela.h>

/**
 * This class manages the digital channels.
 *
 * Each channel can be set as either signal or message rate.
 * When set as message rate:
 * inputs are parsed when calling processInput() and a callback
 * is invoked when they change state, outputs are set via calls to setValue() and then written
 * to the output array when calling processOutput().
 *
 * When set at signal rate:
 * the DigitalChannelManager only sets the pin direction.
 *
 * Throughout the class we keep track of message/signal rate
 * and input/output in separate variables, so that we
 * always know if a channel is managed by the DigitalChannelManager
 * or not. This way, managed and unmanaged channels can be freely mixed in the code.
 *
 * For the reasons above, isSignalRate(channel) is not the same as !isMessageRate(channel)
 * and isInput(channel) is not the same as !isOutput(channel)
 *
 */

class DigitalChannelManager {
public:
	DigitalChannelManager();

	/**
	 * Set the callback.
	 *
	 * The callback will be called when one of the managed message-rate input bits
	 * changes state. The callback's signature is
	 *   void (*stateChangedCallback)(bool value, unsigned int delay, void* arg)
	 * where \c value is the new value of the channel, \c delay is the sample in the most
	 * recent block when the status changed, and \c arg is an additional argument passed
	 * to the callback, which can be set for each channel using setCallbackArgument()
	 *
	*/

	void setCallback(void (*newCallback)(bool, unsigned int, void*)){
		stateChangedCallback = newCallback;
		if(newCallback != NULL){
			callbackEnabled = true;
		} else {
			callbackEnabled = false;
		}
	};

	/**
	 * Sets the argument for the callback.
	 *
	 * Typically an argument will allow the callback to identify the channel
	 * that changed state.
	 *
	 * @param channel is the channel for which the argument is set
	 * @param arg is the argument that will be passed to the callback for that channel
	 */
	void setCallbackArgument(unsigned int channel, void* arg){
		callbackArguments[channel] = arg;
	}

	/** Process the input signals.
	 *
	 * Parses the input array and looks for state changes in the bits
	 * managed as message-rate inputs and invokes the
	 * appropriate callbacks.
	 *
	 * @param array the array of input values
	 * @param length the length of the array
	 *
	 */
	void processInput(uint32_t* array, unsigned int length){
		if(callbackEnabled == false){
			return;
		}
		// DIGITAL_FORMAT_ASSUMPTION
		static uint16_t lastDigitalInputValues = 0;
		for (unsigned int frame = 0; frame < length; ++frame) {
			uint32_t inWord = array[frame];
			uint16_t direction = inWord & 0Xffff;
			uint16_t inputValues = (inWord >> 16);
			// note: even though INPUT == 0 and OUTPUT == 0, this is actually reversed in the binary word,
			// so it actually is 1 for input and 0 for output

			// mask out outputValues from the half-word by setting them to zero
			// if a bit of direction is 1, then it is an input.
			// ANDing this with the inputValues gets rid of the output values
			inputValues &= direction;
			uint16_t changed = inputValues ^ lastDigitalInputValues;
			//mask out channels that are not set at message rate
			changed &= messageRate;
			if(changed){
//				rt_printf("changed: 0x%x, messageRate: 0x%x, ANDed: 0x%x\n", changed, messageRate, changed&messageRate);
				for(int n = 0; n < 16; ++n){
					if(changed & (1 << n)){ //if state for this channel has changed, invoke the callback
						stateChangedCallback(inputValues & (1 << n), frame, callbackArguments[n]);
					}
				}
			}
			lastDigitalInputValues = inputValues;
		}
	}

	/** Process the output signals.
	 *
	 * Processes the output array and appropriately sets the
	 * bits managed as message-rate outputs.
	 * Bits marked as input and unmanaged bits are left alone.
	 *
	 * It also updates the channel directions.
	 *
	 * @param array the array of input values
	 * @param length the length of the array
	 *
	 */
	void processOutput(uint32_t* array, unsigned int length){
		uint32_t orWord = ((setDataOut << 16) | modeInput);
		uint32_t andWord = ~((clearDataOut << 16) | modeOutput);
		uint32_t outWord;
		for (unsigned int frame = 0; frame < length; ++frame) {
			outWord = array[frame];
			outWord = outWord | orWord;
			outWord = outWord & andWord;
			array[frame] = outWord;
		}
	}

	/**
	 * Inquires if the channel is managed as signal-rate.
	 *
	 * @param channel the channel which is inquired.
	 */
	bool isSignalRate(unsigned int channel){
		return (bool)((1 << channel) & signalRate);
	}

	/**
	 * Inquires if the channel is managed as message-rate.
	 *
	 * @param channel the channel which is inquired.
	 * @return true if the channel is managed at message-rate, false otherwise
	 */
	bool isMessageRate(unsigned int channel){
		return (bool)((1 << channel) & messageRate);
	}

	/**
	 * Inquires if the channel is managed as input.
	 *
	 * @param channel the channel which is inquired.
	 * @return true if the channel is managed as input, false otherwise
	 */
	bool isInput(unsigned int channel){
		return (bool)((1 << channel) & modeInput);
	}

	/**
	 * Inquires if the channel is managed as output.
	 *
	 * @param channel the channel which is inquired.
	 * @return true if the channel is managed as output, false otherwise
	 */
	bool isOutput(unsigned int channel){
		return (bool)((1 << channel) & modeOutput);
	}

	/**
	 * Sets the output value for a channel.
	 *
	 * @param channel the channel to set.
	 * @param value the value to set.
	 */
	void setValue(unsigned int channel, bool value){
		if(value == 0){
			clearDataOut = setBit(clearDataOut, channel);
			setDataOut = clearBit(setDataOut, channel);
		} else {
			setDataOut = setBit(setDataOut, channel);
			clearDataOut = clearBit(clearDataOut, channel);
		}
	}

	/**
	 * Stops managing a channel.
	 *
	 * @param channel the channel number
	 */
	void unmanage(unsigned int channel){
		messageRate = clearBit(messageRate, channel);
		signalRate = clearBit(signalRate, channel);
		modeInput = clearBit(modeInput, channel);
		modeOutput = clearBit(modeOutput, channel);
		clearDataOut = clearBit(clearDataOut, channel);
		setDataOut = clearBit(setDataOut, channel);
	}

	/**
	 * Manages a channel.
	 *
	 * Starts managing a channel with given direction and rate.
	 * It can be called repeatedly on a given channel to change
	 * direction and/or rate.
	 *
	 * @param channel the channel to manage.
	 * @param direction
	 * @param isMessageRate whether the channel should be managed at audio rate (`false`) or message rate (`true`)
	 */
	void manage(unsigned int channel, bool direction, bool isMessageRate){
		// direction is expected to be one of INPUT or OUTPUT
		messageRate = changeBit(messageRate, channel, isMessageRate);
		signalRate = changeBit(signalRate, channel, !isMessageRate);
		if(direction == OUTPUT){
			modeOutput = setBit(modeOutput, channel);
			modeInput = clearBit(modeInput, channel);
		} else { // direction == INPUT
			modeInput = setBit(modeInput, channel);
			modeOutput = clearBit(modeOutput, channel);
		}
		if(verbose)
			rt_printf("Bela digital: channel %d is set as %s at %s rate\n", channel,
				isInput(channel) ? "input" : "output", isSignalRate(channel) ? "signal" : "message");
	}

	void setVerbose(bool isVerbose);
	virtual ~DigitalChannelManager();
private:
	bool callbackEnabled;
	void* callbackArguments[16];
	void (*stateChangedCallback)(bool value, unsigned int delay, void* arg);
	uint32_t clearDataOut;
	uint32_t setDataOut;
	uint16_t modeOutput;
	uint16_t modeInput;
	uint16_t messageRate;
	uint16_t signalRate;
	bool verbose;
};

#endif /* DIGITALCHANNELMANAGER_H_ */
