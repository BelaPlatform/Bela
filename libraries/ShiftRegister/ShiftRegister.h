#pragma once
#include <Bela.h> // this class acts on the BelaContext directly
#include <vector>

/**
 * @brief A class to drive a shift register using Bela's digital I/O.
 *
 * A class to drive a shift register using Bela's digital I/O.
 * This class accesses the BelaContext directly to perform data I/O.
 * You need to assign it three digital channels at initialisation, to which
 * data will be written at each call to process().
 */
class ShiftRegister
{
public:
	/**
	 * The Bela digital pins connected to the shift register.
	 */
	struct Pins {
		unsigned int data; ///< data pin
		unsigned int clock; ///< clock pin
		unsigned int latch; ///< latch pin
	};
	/**
	 * Default constructor. Does nothing. If the object is constructed
	 * this way, you have to call setup() to initialise it properly.
	 */
	ShiftRegister();
	/**
	 * Set the Bela digital channels that will be used and the maximum
	 * length of the messages to be transmitted.
	 *
	 * @param pins the data, clock, latch pins to be used.
	 * @param maxSize the maximum length of the messages that will be
	 * passed to setData().
	 */
	ShiftRegister(const Pins& pins, unsigned int maxSize);
	/**
	 * \copydoc ShiftRegister::ShiftRegister(unsigned int, unsigned int, unsigned int, unsigned int)
	 */
	 void setup(const Pins& pins, unsigned int maxSize);
	/**
	 * Check whether the last I/O transmission is completed.
	 * After one call has returned `true`, future calls will return `false`
	 * until a new transmission is completed.
	 *
	 * @return `true` if all data has been shifted, or `false` if
	 * shifting is still in progress.
	 */
	bool dataReady();
	/**
	 * Shift I/O data for frame @p n.
	 */
	virtual void process(BelaContext* context, unsigned int n) = 0;
protected:
	Pins pins;
	typedef enum {
		kStart,
		kTransmitting,
		kStop,
		kIdle,
	} State;

	State state = kStop;
	std::vector<bool> data;
	bool pinModeSet = false;
	bool notified = true;
};

class ShiftRegisterOut : public ShiftRegister
{
public:
	/**
	 * Set the period of the clock expressed in samples.
	 * The minimum value is 2.
	 */
	void setClockPeriod(unsigned int period);
	/**
	 * Set new data bits to be shifted out. Data willl be shifted out during the
	 * subsequent calls to process(), until dataSent() returns `true`.
	 * If the size of the data passed in is larger than
	 * `maxSize` was, the internal buffer holding a copy of the data will
	 * be reallocated, which is not a real-time safe operation.
	 *
	 * @param dataBuf the data to be shifted out.
	 */
	void setData(const std::vector<bool>& dataBuf);
	/**
	 * @copydoc ShiftRegister::setData(const std::vector<bool>&)
	 *
	 * @param length the length of the data.
	 */
	void setData(const bool* dataBuf, unsigned int length);
	/**
	 * Shift I/O data for all the digital frames in @p context.
	 */
	void process(BelaContext* context);
	void process(BelaContext* context, unsigned int n) override;
private:
	unsigned int period = 2;
	unsigned int currentDataFrame;
	unsigned int currentStopFrame;
};

class ShiftRegisterIn : public ShiftRegister
{
public:
	/**
	 * Check whether there is data that has been shifted in and the
	 * transmission has completed.
	 *
	 * @return `true` if the last transmission has completed and the data
	 * is ready to be accessed via getData().
	 */
	bool dataReceived();
	/**
	 * Get the data that has been shifted in. This is only guaranteed to
	 * contain the complete content of a transmission if it is called
	 * in the same frame as dataReceived() returns `true`.
	 *
	 * @return the incoming data.
	 */
	const std::vector<bool>& getData();
	void process(BelaContext* context, unsigned int n) override;
private:
	bool pastLatch = false;
	bool pastClock = false;
};
