#include <Bela.h>
#include <math.h>
#include <libraries/Scope/Scope.h>

#define PRINTONCE(...) {\
	static bool printed = false;\
	if(!printed)\
	{\
		printed = true;\
		rt_printf(__VA_ARGS__);\
	}\
}

Scope gScope;
enum
{
	kButtonsTest,
	kTrigIoTest,
	kPotRangeTest,
	kCvLoRangeTest,
	kCvHiRangeTest,
	kAudioTest,
	kRewireTest,
	kAudioDCTestHi,
	kAudioDCTestLo,
	kEndTest,
	kNumTest
};
int gCurrentTest = 0;

const int nPinsMax = 4;
const int gNumButtonsMax = nPinsMax;
const int gNumCVsMax = nPinsMax * 2;


// set the below to half their values to only test Salt
const int nPins = nPinsMax;
const int gNumButtons = gNumButtonsMax;
const int gNumCVs = gNumCVsMax;

const int triggOutPins[nPinsMax] = {0, 5, 12, 13};
const int triggInPins[nPinsMax] = {15, 14, 1, 3};
const int sw1Pin = 6;
const int ledPins[nPinsMax] = {2, 4, 8, 9};
const int pwmPin = 7;

const int buttonPins[gNumButtonsMax] = {sw1Pin, triggInPins[1], triggInPins[2], triggInPins[3]};
const int cvPins[gNumCVsMax] = {0, 1, 2, 3, 4, 5, 6, 7};

int gTestStatus[kNumTest] = {0};

int gPeriod; 
unsigned int count = 0;

int gLedState[nPinsMax] = {0, 0, 0, 0};
int gButtonStatus[gNumButtonsMax] = {0, 0, 0, 0};

int gLedsOn = false;

int gBlockSize = 512;//512;

float gInverseAudioSampleRate;

static float gCvRange[2][gNumCVsMax];

float gCVtolerance =  0.15;
float gAudioToCVtolerance =  0.2;

int gNumAudioChannels = 2;

float cvToAnalog(float cvVoltage)
{
	const float analogMin = 1/11.0;
	const float analogMax = 1;
	return analogMin + (analogMax-analogMin) * cvVoltage;
}
void setLed(BelaContext *context, int n, const int pwmPin, int channel, int state) {
	switch(state) {
		case 0:
			pinModeOnce(context, n, channel, INPUT);
			break;
		case 2:
			digitalWriteOnce(context, n, pwmPin, n&1);
		case 1:
			pinModeOnce(context, n, channel, OUTPUT);
			digitalWriteOnce(context, n, channel, state-1);
			break;
	}
}

void encodeNumberLed(BelaContext *context, int n, const int pwmPin, const int * ledPins, unsigned int nLeds, unsigned int number, unsigned int color = 0)
{
	for(unsigned int l = 0;  l<nLeds; ++l)
	{
		bool state = (number >> l) & 1;
		setLed(context, n, pwmPin, ledPins[nLeds - l -1], (state ? (int)state+color : state));
		
	}
}

bool flashNumberLed(BelaContext *context, int n, const int pwmPin, const int * ledPins, unsigned int nLeds, unsigned int number, unsigned int nFlash, unsigned int period, unsigned int count, unsigned int color = 0, bool reset = false)
{
	static int flashBlock = count;
	static int flashCount = 0;
	static int prevNum = number;
	static bool internalReset = reset;
	if(prevNum != number || (reset && internalReset != reset))
	{	
		flashBlock = count;
		flashCount = 0;
		prevNum = number;
		internalReset = reset;
	}
	
	if(flashCount < nFlash || nFlash == 0) {
		if(count - flashBlock <= (int) round(period/2.0))
		{
			encodeNumberLed(context, n, pwmPin, ledPins, nLeds, number, color);
		} 
		else
		{
			for(unsigned int l = 0;  l<nLeds; ++l)
				setLed(context, n, pwmPin, ledPins[nLeds - l -1], 0);
		}
		
		if(count - flashBlock >= period)
		{	
			flashBlock = count;
			if(nFlash != 0)
				++flashCount;
		}			
		return true;
	}	
	return false;
}

bool cvRamp(float * cvValue, float range[2], float step, int blockSize, bool reset = false) {

			static int rampDirection = 1;
			static bool internalReset = reset;
			if(reset != internalReset)
			{
				rampDirection = 1;
				internalReset = reset;
			}
			
			*cvValue += (rampDirection) * blockSize * step;
			
			if(*cvValue >= range[1])
			{	
				rampDirection = -1; // change ramp direction
			} 
			else if (*cvValue <= range[0])
			{
				*cvValue = range[0];
				rampDirection = 1; // change ramp direction
				return false;
			}

	return true;
}

void Bela_userSettings(BelaInitSettings *settings)
{
        settings->uniformSampleRate = 1;
        settings->analogOutputsPersist = 0;
        settings->pgaGain[0] = 0;
        settings->pgaGain[1] = 0;
}

bool setup(BelaContext *context, void *userData)
{
	
	// Check that analog and audio sample rate are equal
	if(context->analogSampleRate != context->audioSampleRate)
		return false;
		
		
	gScope.setup(8, context->audioSampleRate);
	
	// Set direction of PWM pin
	pinMode(context, 0, pwmPin, OUTPUT);

		
	// Set direction of trigger pins
	for(unsigned int t = 0; t < nPins; ++t)
	{
		pinMode(context, 0, triggOutPins[t], OUTPUT);
		pinMode(context, 0, triggInPins[t], INPUT);
	}
	// Set direction of Button Switch 1
	pinMode(context, 0, sw1Pin, INPUT);
	// Set switching period
	gPeriod = 0.25 * context->digitalSampleRate; // duration (in samples) of a "brightness period", affects resolution of dimming. Larger values will cause flickering.
	// Check if analog channels are enabled
	if(context->audioFrames == 0 || context->audioFrames > context->audioFrames) 
	{
		rt_printf("Error: analog channels must be enable to use the CV in and outs on Salt\n");
		return false;
	}

	// Check that we have the same number of inputs and outputs.
	if(context->audioInChannels != context->audioOutChannels || context->analogInChannels != context-> analogOutChannels)
	{
		printf("Error: there should be the same number of analog in and outs.\n");
		return false;
	}
	// Initialise CV range to absurdly high & low values
	for(unsigned int c = 0; c < gNumCVs; ++c) 
	{
		gCvRange[0][c] = 1000;
		gCvRange[1][c] = -1000;
	}
	
	gInverseAudioSampleRate = 1.0 / context->audioSampleRate;
	return true;
}

void render(BelaContext *context, void *userData)
{

	if(0)
	{
		// some debugging stubs, useful when you are desperate
		for(int n = 0; n < context->audioFrames; ++n)
		{
			for(int ch = 0; ch < context->analogOutChannels; ++ch)
			{
				audioWrite(context, n, ch, 1);
			}
			gScope.log(audioRead(context, n, 0), audioRead(context, n, 1));
		}
		for(int ch = 0; ch < context->analogOutChannels; ++ch)
		{
			analogWrite(context, 0, ch, cvToAnalog(0));
		}
		for(int n = 0; n < context->analogFrames; ++n)
		{
			//gScope.log(&(context->analogIn[context->analogInChannels * n]));
		}
		return;
	}
	// Skip 1st buffer
	if(context->audioFramesElapsed == 0)
		return;
		
	static bool flashLeds = true;
	// FIRST TEST
	if (gCurrentTest == kButtonsTest)
	{
		static bool buttonsWorking[gNumButtons] = {0};
		static int numOfWorkingButtons = 0;
		static bool buttonsFailing[gNumButtons] = {0};

		// Turn LEDs on
		if(!gLedsOn) 
		{
			for(unsigned int l = 0; l < nPins; ++l)
				gLedState[l] = 2;
			gLedsOn = true;
		}
		
		for(unsigned int n = 0; n < context->digitalFrames; ++n)
		{
			// Software PWM, toggling every sample
			int pwmValue = n & 1;
			digitalWriteOnce(context, n, pwmPin, pwmValue);
			// Set LED status
			for(unsigned int l = 0; l < nPins; ++l) 
			{
				setLed(context, n, pwmPin, ledPins[l], gLedState[l]);
			}
			// If count elapsed the time period, switch LED side (color)
			if(flashLeds)
			{
				if((count % gPeriod) == 0) 
				{
					// Switch LED side (color)
					for(unsigned int l = 0; l < nPins; ++l) 
					{
						if(gLedState[l] != 0)
							gLedState[l] = gLedState[l] % 2 + 1;
					}
				}
			}
	
			// Only start reading buttons after the 1st half second
			if(count >= 0.5 * context->digitalSampleRate) 
			{
				static unsigned int blockCount = count;
				// Output 0s on the digital pins (Trigger Outs)
				for(unsigned int t = 0; t < nPins; ++t)
				{
					digitalWriteOnce(context, n, triggOutPins[t], 0);
				}
	
				// Read after half a block-size samples
				if(count - blockCount == gBlockSize/2)
				{
					static int buttonTest = 0;
					static int testInitTime = count;
					static bool buttonTestFailed = false;
					switch(buttonTest) 
					{
						case 0:
							if(!buttonTestFailed)
							{
								if(count - testInitTime <= 0.25 * context->digitalSampleRate) 
								{
									int triggerStatus;
									for(unsigned int b = 0; b < gNumButtons; ++b)
									{
										triggerStatus = digitalRead(context, 0, buttonPins[b]);
										if(triggerStatus != 0) 
										{
											buttonsFailing[b] = 1;
											buttonTestFailed = true;
											rt_printf("ERROR: Ooops, it looks like button %d is not working as expected.\n", b);
											break;
										} 
									}
								} 
								else 
								{
									for(unsigned int b = 0; b < gNumButtons; ++b)
										gButtonStatus[b] = 0;
									
									rt_printf("Part %d of test %d passed!\n", buttonTest, gCurrentTest);
									buttonTest = 1;
									testInitTime = count;
								}
							} 
							else
							{
								rt_printf("ERROR: Part %d of test %d failed.\n", buttonTest, gCurrentTest);
								buttonTest = 2;
								testInitTime = count;
							}
						break;
						case 1:
							PRINTONCE("kTrigIoTest: Press one button at a time\n");

							// Stop flashing LEDs
							flashLeds = false;
							
							if(!buttonTestFailed)
							{
								int triggerStatus;
								static unsigned int gButtonCount[gNumButtons];
								for(unsigned int b = 0; b < gNumButtons; ++b)
								{
									triggerStatus = digitalRead(context, 0, buttonPins[b]);
									// If the switch has changed state
									if(triggerStatus != gButtonStatus[b]) 
									{
										// If 128 samples have been elapsed
										if(count - gButtonCount[b] < 128/2) 
										{
											buttonsFailing[b] = 1;
											buttonTestFailed = true;
											rt_printf("ERROR: Something has gone wrong with the button debouncing!\n");
										} 
										else 
										{
											// If trigger has raised from 0 to 1
											if(triggerStatus) {
												rt_printf("Button %d has been pressed.\n", b);
											} 
											else
											{
												rt_printf("Button %d has been released.\n", b);
												gLedState[b] = 0;
											}
											gButtonCount[b] = count;
											gButtonStatus[b] = triggerStatus;
										}
									}
									// If LEDs are off and 128 samples have been elapsed 
									if(count - gButtonCount[b] >= 128 && gLedState[b] == 0) 
									{
										if(buttonsWorking[b] == false) {
											buttonsWorking[b] = true;
											++numOfWorkingButtons;
											rt_printf("Button %d works.\n", b);
										}
									}
								}
								if(count - testInitTime >= 60 * context->digitalSampleRate) {
									buttonTestFailed = true;
									rt_printf("ERROR: A lot of time has elapsed and the test hasn't passed yet. One or more of the buttons may not be working\n");
								}
								
								if(numOfWorkingButtons == gNumButtons)
								{
									rt_printf("Part %d of test %d passed!\n", buttonTest, gCurrentTest);
									buttonTest = 2;
									testInitTime = count;
								}
							}
							else
							{
								rt_printf("Part %d of test %d failed.\n", buttonTest, gCurrentTest);
								buttonTest = 2;
								testInitTime = count;
							}
						break;
						case 2:
							if(buttonTestFailed == false) 
							{
								rt_printf("It seems that the buttons are fully functional.\n");
								rt_printf("Test %d passed!\n", gCurrentTest);
								gTestStatus[gCurrentTest] = 1;
								++gCurrentTest;
								flashLeds = true;
							} 
							else 
							{
								rt_printf("ERROR: Buttons are not working.\n");
								rt_printf("ERROR: Test %d failed.\n", gCurrentTest);
								gCurrentTest = kEndTest;
							}
						break;
					}
				}
				// Reset reading-block counter
				if(count - blockCount >= gBlockSize) 
					blockCount = count;
	
			}
			++count;
		}
	}
	// SECOND TEST
	else if (gCurrentTest == kTrigIoTest)
	{	
		PRINTONCE("kTrigIoTest: Testing trig loopback...\n");
		static bool digitalsFailing[nPins] = {0};
		static unsigned int numOfBrokenDigitals = 0;
		
		for(unsigned int n = 0; n < context->digitalFrames; n++) 
		{
			static int testInitTime = count;

			// Flash test number
			if(flashLeds)
				flashNumberLed(context, n, pwmPin, ledPins, 4, gCurrentTest, -1, 0.15 * context->digitalSampleRate, count, 1);
			
			static unsigned int blockCount = count;
			
			// Set output value depending on which block we are writting			
			int outputVal = n<gBlockSize ? 1 : 0;

			// Write outputs to digital pins (digital triggers)
			for(unsigned int t = 0; t < nPins; ++t)
			{	
				digitalWriteOnce(context, n, triggOutPins[t], outputVal);
			}

			// Read after half and 3/2 of a block size
			if(count-blockCount == gBlockSize/2 || count-blockCount == 3*gBlockSize/2)
			{
				for(unsigned int t = 0; t < nPins; ++t)
				{
					if(digitalsFailing[t])
						break;
						
					int readVal = digitalRead(context, 0, triggInPins[t]);
					
					if(readVal != outputVal)
					{
						digitalsFailing[t] = 1;
						++numOfBrokenDigitals;
					}
						

				}
			}
			
			// If more than 3 sec elapsed then conclude test
			if(count - testInitTime >= 3 * context->digitalSampleRate) 
			{
				// If there are no broken digitals, progress to next test
				if(numOfBrokenDigitals == 0)
				{
					rt_printf("It seems that the trigger I/O is fully functional.\n");
					rt_printf("Test %d passed!\n", gCurrentTest);
					gTestStatus[gCurrentTest] = 1;
					++gCurrentTest;
					flashLeds = true;
					break;
				}
				else
				{
					rt_printf("ERROR: Digital I/O is not working. Test failed.\n");
					for(unsigned int t = 0; t < nPins; ++t)
					{
						if(digitalsFailing[t])	
							rt_printf("ERROR: There is a problem with digital I/O %d.\n", t);
					}
					rt_printf("ERROR: Test %d failed.\n", gCurrentTest);
					gCurrentTest = kEndTest;
					break;
				}
			}
			
			// Reset reading-block counter (every 2 blocks)
			if(count - blockCount >= 2 * gBlockSize) 
				blockCount = count;
				
			++count;
		}
	}
	// THIRD TEST
	else if (gCurrentTest == kPotRangeTest) 
	{
		PRINTONCE("kPotRangeTest: swipe each pot so that it covers the whole range\n");
		static bool potsWorking[gNumCVs] = {0};
		static int numOfWorkingPots = 0;
		static int currentPot = -1;
		static float previousRead[gNumCVs];
		static bool firstReading = true;


		for(unsigned int n = 0; n < context->audioFrames; n++) 
		{
			static unsigned int blockCount = count;
			static int testInitTime = count;
			
			// Flash test number
			if(flashLeds)
				flashNumberLed(context, n, pwmPin, ledPins, 4, gCurrentTest, -1, 0.15 * context->audioSampleRate, count, 1);
				
			// Show active potentiometer (starting from 1)
			if(currentPot != -1)
			{
				// Stop flashing LEDs
				flashLeds = false;
				
				if(potsWorking[currentPot])
				{
					encodeNumberLed(context, n, pwmPin, ledPins, 4, currentPot+1, 0);
					flashNumberLed(context, n, pwmPin, ledPins, 4, currentPot+1, -1, 0.25 * context->audioSampleRate, count, 0);
				} 
				else
				{
					encodeNumberLed(context, n, pwmPin, ledPins, 4, currentPot+1, 0);
				}
			}
			
			// Write 0.5 to the CV outs
			for(unsigned int c = 0; c < gNumCVs; ++c) 
			{
				analogWriteOnce(context, n, cvPins[c], cvToAnalog(0.5));
				gScope.log(context->analogIn);

			}
			
			// Read after half a block-size samples
			if(count - blockCount == gBlockSize/2)
			{
				for(unsigned int c = 0; c < gNumCVs; ++c) 
				{
					// Store first reading
					if(firstReading)
					{
						for(unsigned int c = 0; c < gNumCVs; ++c) 
							previousRead[c] = analogRead(context, n, cvPins[c]);
						firstReading = false;
					}
					else
					{
						float readVal = analogRead(context, n, cvPins[c]);

						if(fabs(readVal - previousRead[c]) > 0.01)
						{
							// If pot changes, update previous value 
							if(c != currentPot) 
							{
								currentPot = c;
								previousRead[c] = readVal;
							}
							
							// Update min and max values
							if(readVal < gCvRange[0][c])
								gCvRange[0][c] = readVal;
							if(readVal > gCvRange[1][c]) 
								gCvRange[1][c] = readVal;
								
							// Check if range has been covered (with 5% margin)
							if(gCvRange[1][c] >= 0.95 && gCvRange[0][c] < 0.05) {
								if(!potsWorking[c])
								{
									potsWorking[c] = 1;
									++numOfWorkingPots;
									rt_printf("Potentiometer %d covers the full range of the CV input.\n", c);
								}
							}
						}
					}
				}
			}
			
			// If more than 5 min elapsed then print a message
			if(count - testInitTime >= 5 * 60 * context->digitalSampleRate) 
			{
				rt_printf("ERROR: A lot of time has elapsed and the test hasn't passed yet. One or more of the potentiometers may not be working\n");
				rt_printf("ERROR: Test %d failed.\n", gCurrentTest);
			}
			
			// Test finishes when all pots are working
			if(numOfWorkingPots == gNumCVs)
			{
				rt_printf("All potentiometers work!\n");
				rt_printf("Test %d passed!\n", gCurrentTest);
				gTestStatus[gCurrentTest] = 1;
				++gCurrentTest;
				flashLeds = true;
				break;
			}
			
			// Reset reading-block counter
			if(count - blockCount >= gBlockSize) 
				blockCount = count;
			++count;
		}
	}
	// FOURTH TEST
	else if (gCurrentTest == kCvLoRangeTest) 
	{
		PRINTONCE("Set all the pots to minimum\n");
		static int currentCv = 0;
		static bool potCheck = true;
		float readVal;
		static bool brokenCvs[gNumCVs] = {0};
		static int numOfWorkingCvs = 0;
		float cvOutRange[2] = {0.55, 0.95};
		static float cvOutVal = cvOutRange[0];
		float inOutOffset = 0.5;
		static bool flashError = false;
		static bool runTest = false;

		for(unsigned int n = 0; n < context->audioFrames; n++) 
		{
			static unsigned int blockCount = count;
			
			// Flash test number
			if(!flashError)
			{
				if(!flashNumberLed(context, n, pwmPin, ledPins, 4, gCurrentTest, 10, 0.15 * context->audioSampleRate, count, 1))
				{
					runTest = true;
					encodeNumberLed(context, n, pwmPin, ledPins, 4, currentCv+1, 0);
				} 	
			}
				
			// Iterate over CVs
			if(runTest)
			{
				if(currentCv < gNumCVs)
				{
					// Wait for potentiometer to be set at minimum
					if(potCheck)
					{
						// Write 0.5 to the CV out being tested
						analogWriteOnce(context, n, cvPins[currentCv], cvToAnalog(0.5));
						
						// Read after half a block-size samples
						if(count - blockCount == gBlockSize/2)
						{
							readVal = analogRead(context, n, cvPins[currentCv]);
							// Finish checking the potentiometer when it is in the CCW position
							if(readVal <= 0.05)
								potCheck = false;
						}
					}
					else
					{	
						PRINTONCE("Testing CV loopback");
						// Write value to CV output
						analogWriteOnce(context, n, cvPins[currentCv], cvToAnalog(cvOutVal));
					
						// Read after half a block-size samples
						if(count - blockCount == gBlockSize/2)
						{
						
							// Read value
							readVal = analogRead(context, n, cvPins[currentCv]);
	
							// Check that the read value and the ouput value are within range
							if(!(fabs(readVal+inOutOffset - cvOutVal) <= gCVtolerance))
							{
								brokenCvs[currentCv] = 1; // In and out are out of range
								rt_printf("currentCv: %d, fabs(readVal+inOutOffset - cvOutVal): %f, readVal: %f, inOutOffset: %f, cvOutVal: %f, gCVtolerance: %f\n",
									currentCv, fabs(readVal+inOutOffset - cvOutVal), readVal, inOutOffset, cvOutVal, gCVtolerance);
							}
							
							// Create CV ramp and go to next potentiometer when the ramp has finished
							if(!cvRamp(&cvOutVal, cvOutRange, gInverseAudioSampleRate, gBlockSize))
							{
								if(!brokenCvs[currentCv])
									++numOfWorkingCvs;
								++currentCv; // go to next cv input
								potCheck = true;
							}
						}
					}
				}
				else
				{
					if(numOfWorkingCvs == gNumCVs)
					{
						rt_printf("All CV I/O work when potentiometes are set to minimum!\n");
						rt_printf("Test %d passed!\n", gCurrentTest);
						gTestStatus[gCurrentTest] = 1;
						++gCurrentTest;
						break;
					}
					else
					{
						static int cvBrokenIndex = 0;
						if(cvBrokenIndex < gNumCVs)
						{
							if(brokenCvs[cvBrokenIndex])
							{
								flashError = true;
								if(!flashNumberLed(context, n, pwmPin, ledPins, 4, cvBrokenIndex+1, 10, 0.25 * context->audioSampleRate, count, 0, true))
								{
									rt_printf("ERROR: CV %d is broken\n", cvBrokenIndex);
									rt_printf("ERROR: Test %d failed.\n", gCurrentTest);
									gCurrentTest = kEndTest;
									break;
								}
							}
							else
							{
								++cvBrokenIndex;
							}	
						}
					}
				}
			}
			
			// Reset reading-block counter
			if(count - blockCount >= gBlockSize) 
				blockCount = count;
			++count;			
		}
	}
	// FIFTH TEST
	else if (gCurrentTest == kCvHiRangeTest) 
	{
		PRINTONCE("Set all the pots to maximum\n");
		static int currentCv = 0;
		static bool potCheck = true;

		float readVal;
		static bool brokenCvs[gNumCVs] = {0};
		static int numOfWorkingCvs = 0;
		float cvOutRange[2] = {0.05, 0.45};
		static float cvOutVal = cvOutRange[0];
		float inOutOffset = -0.5;
		static bool flashError = false;
		static bool runTest = false;

		for(unsigned int n = 0; n < context->audioFrames; n++) 
		{
			static unsigned int blockCount = count;

			// Flash test number
			if(!flashError)
			{
				if(!flashNumberLed(context, n, pwmPin, ledPins, 4, gCurrentTest, 10, 0.15 * context->audioSampleRate, count, 1))
				{
					runTest = true;
					encodeNumberLed(context, n, pwmPin, ledPins, 4, currentCv+1, 0);
				} 	
			}
			
			// Iterate over CVs
			if(runTest)
			{
				if(currentCv < gNumCVs)
				{
					// Wait for potentiometer to be set at maximum
					
					if(potCheck)
					{
						// Write 0.5 to the CV out being tested
						analogWriteOnce(context, n, cvPins[currentCv], cvToAnalog(0.5));
						
						// Read after half a block-size samples
						if(count - blockCount == gBlockSize/2)
						{
							readVal = analogRead(context, n, cvPins[currentCv]);
							// Finish checking the potentiometer when it is in the CW position
							if(readVal >= 0.95)
								potCheck = false;
						}
					}
					else
					{	
						// Write value to CV output
						analogWriteOnce(context, n, cvPins[currentCv], cvToAnalog(cvOutVal));
						// Read after half a block-size samples
						if(count - blockCount == gBlockSize/2)
						{
							readVal = analogRead(context, n, cvPins[currentCv]);
							// Check that the read value and the ouput value are within range
							if(!(fabs(readVal+inOutOffset - cvOutVal) <= gCVtolerance))
							{
								brokenCvs[currentCv] = 1; // In and out are out of range
								rt_printf("currentCv: %d, fabs(readVal+inOutOffset - cvOutVal): %f, readVal: %f, inOutOffset: %f, cvOutVal: %f, gCVtolerance: %f\n",
									currentCv, fabs(readVal+inOutOffset - cvOutVal), readVal, inOutOffset, cvOutVal, gCVtolerance);
							}
							// Create CV ramp and go to next potentiometer when the ramp has finished
							if(!cvRamp(&cvOutVal, cvOutRange, gInverseAudioSampleRate, gBlockSize))
							{
								if(!brokenCvs[currentCv])
								{
									rt_printf("CV %d works!\n", currentCv+1);
									++numOfWorkingCvs;
								}
								++currentCv; // go to next cv input
								potCheck = true;
							}
						}
					}
					
				}
				else
				{
					PRINTONCE("Testing CV loopback\n");

					if(numOfWorkingCvs == gNumCVs)
					{
						rt_printf("All CV I/O work when potentiometes are set to maximum!\n");
						rt_printf("Test %d passed!\n", gCurrentTest);
						gTestStatus[gCurrentTest] = 1;
						++gCurrentTest;
						break;
					}
					else
					{
						static int cvBrokenIndex = 0;
						if(cvBrokenIndex < gNumCVs)
						{
							if(brokenCvs[cvBrokenIndex])
							{
								flashError = true;
								if(!flashNumberLed(context, n, pwmPin, ledPins, 4, cvBrokenIndex+1, 10, 0.25 * context->audioSampleRate, count, 0, true))
								{
									rt_printf("ERROR: CV %d is broken\n", cvBrokenIndex);
									rt_printf("ERROR: Test %d failed.\n", gCurrentTest);
									gCurrentTest = kEndTest;
									break;
								}
							}
							else
							{
								++cvBrokenIndex;
							}	
						}
					}
				}	
			}
			
			// Reset reading-block counter
			if(count - blockCount >= gBlockSize) 
				blockCount = count;
			++count;			
		}
	}
	// SIXTH TEST
	else if (gCurrentTest == kAudioTest)
	{
		PRINTONCE("kAudioTest: Testing audio loopback\n");
		static unsigned int currentChannel = 0; // 0 - Left, 1 - right
		const char* channelLabels[2] = {"LEFT", "RIGHT"};
		
		static int workingAudioChannels[2] = {0};
		static unsigned int numOfWokingAudioChannels = 0;
		
		static float peakLevels[2][2] = {{1, -1}, {1, -1}}; // Negative (0) and Positive (1) levels, initialize
		float peakLevelDecayRate = 0.999;
		const float peakLevelThreshold[2] = {0.02, 0.15}; // High and low
		const float DCOffsetThreshold = 0.1;
		
		float sineFrequency = 3000.0;
		static float phase = 0.0;
		
		static int audioTestSuccessCounter = 0;
		const int audioTestSuccessCounterThreshold = 64;
		const int audioTestSampleThreshold = 16384;
		static bool flashError = false;
		static bool runTest = false;
		

		for(unsigned int n = 0; n < context->audioFrames; n++) 
		{
		
			// Flash test number
			
			if(!flashError)
			{
				if(!flashNumberLed(context, n, pwmPin, ledPins, 4, gCurrentTest, 10, 0.15 * context->audioSampleRate, count, 1))
				{
					runTest = true;
					encodeNumberLed(context, n, pwmPin, ledPins, 4, currentChannel+1, 0);
				} 	
			}
			
			// Peak detection on the audio inputs, with offset to catch
			// DC errors
			for(int ch = 0; ch < context->audioInChannels; ch++) 
			{
				float value = audioRead(context, n, ch);
				// Positive peak levels
				if(value > peakLevels[1][ch])
					peakLevels[1][ch] = value;
				peakLevels[1][ch] += 0.1f;
				peakLevels[1][ch] *= peakLevelDecayRate;
				peakLevels[1][ch] -= 0.1f;
				// Negative peak levels
				if(value < peakLevels[0][ch])
					peakLevels[0][ch] = value;
				peakLevels[0][ch] -= 0.1f;
				peakLevels[0][ch] *= peakLevelDecayRate;
				peakLevels[0][ch] += 0.1f;
			}
			
			//Write sine on current channel and 0 on unused channel
			audioWrite(context, n, currentChannel, 0.2f * sinf(phase));
			audioWrite(context, n, 1-currentChannel, 0);
			
			// Update phase
			phase += 2.0f * (float)M_PI * sineFrequency / context->audioSampleRate;
			if(phase >= M_PI)
				phase -= 2.0f * (float)M_PI;
			
			if(runTest)
			{
				if(currentChannel < context->audioInChannels)
				{
					static int testInitTime = count;
					
					if((count - testInitTime) <= 2 * context->audioSampleRate)
					{
						if((count - testInitTime) >= audioTestSampleThreshold)
						{
							// Check if we have the expected input: signal on the enabledChannel but not
							// on the disabledChannel. Also check that there is not too much DC offset on the
							// inactive channel
							float peakDifference[2];
								peakDifference[currentChannel] = peakLevels[1][currentChannel] - peakLevels[0][currentChannel];
								peakDifference[1-currentChannel] = peakLevels[1][1-currentChannel] - peakLevels[0][1-currentChannel];
							if(
								peakDifference[currentChannel] >= peakLevelThreshold[1]
								&& peakDifference[1-currentChannel] <= peakLevelThreshold[0]
								&& fabsf(peakLevels[1][1-currentChannel]) < DCOffsetThreshold
								&& fabsf(peakLevels[0][1-currentChannel]) < DCOffsetThreshold
							)
							{
								// Successfull test
								++audioTestSuccessCounter;
								if(audioTestSuccessCounter >= audioTestSuccessCounterThreshold)
								{
									rt_printf("Audio %s test successful!\n", channelLabels[currentChannel]);
									workingAudioChannels[currentChannel] = 1;
									++numOfWokingAudioChannels;
									
									++currentChannel;
									audioTestSuccessCounter = 0;
									testInitTime = count;
								}
							}
							else
							{
								// Printing debug messages
								if(!((context->audioFramesElapsed + n) % 22050)) 
								{
									if(peakDifference[currentChannel] < peakLevelThreshold[1])
										rt_printf("%s Audio In FAIL: insufficient signal: %f\n", channelLabels[currentChannel],
													peakDifference[currentChannel]);
									else if(peakDifference[1-currentChannel] > peakLevelThreshold[0])
										rt_printf("%s Audio In FAIL: signal present when it should not be: %f\n", channelLabels[1-currentChannel],
													peakDifference[1-currentChannel]);
									else if(fabsf(peakLevels[1][1-currentChannel]) >= DCOffsetThreshold ||
											fabsf(peakLevels[0][1-currentChannel]) >= DCOffsetThreshold)
										rt_printf("%s Audio In FAIL: DC offset: (%f, %f)\n", channelLabels[1-currentChannel],
													peakLevels[1][1-currentChannel], peakLevels[0][1-currentChannel]);
								}
								audioTestSuccessCounter--;
								if(audioTestSuccessCounter <= 0)
									audioTestSuccessCounter = 0;
							}
						}
					}
					else
					{
						++currentChannel;
						audioTestSuccessCounter = 0;
						count = 0;
					}
				}
				else
				{
					if(numOfWokingAudioChannels == context->audioInChannels)
					{
						// All audio channels are working
						rt_printf("All audio channels are working!\n");
						rt_printf("Test %d passed!\n", gCurrentTest);
						gTestStatus[gCurrentTest] = 1;
						++gCurrentTest;
						break;
					}
					else
					{
						static int audioBrokenIndex = 0;
						if(audioBrokenIndex < context->audioInChannels)
						{	
							if(!workingAudioChannels[audioBrokenIndex])
							{
								flashError = true;
								if(!flashNumberLed(context, n, pwmPin, ledPins, 4, audioBrokenIndex+1, 10, 0.25 * context->audioSampleRate, count, 0, true))
								{
									rt_printf("ERROR: %s Audio Channel is broken\n", channelLabels[audioBrokenIndex]);
									rt_printf("ERROR: Test %d failed.\n", gCurrentTest);
									gCurrentTest = kEndTest;
									break;
								}
								
							}
							else
							{
								++audioBrokenIndex;
							}	
						}
					}
				}
			}
			++count;
		}
	}
	// SEVENTH TEST
	else if (gCurrentTest == kRewireTest)
	{
		PRINTONCE("kRewireTest: now connect audio output L-R to CV in 1-2, respectively, and press switch 1 when done\n");
		static int previousTriggerStatus = 0;
		
		for(unsigned int n = 0; n < context->analogFrames; n++) 
		{
			static unsigned int blockCount = count;
			
			if(!flashNumberLed(context, n, pwmPin, ledPins, 4, gCurrentTest, 10, 0.15 * context->audioSampleRate, count, 1))
			{
				encodeNumberLed(context, n, pwmPin, ledPins, 4, 15, 1);
			
				int triggerStatus = digitalRead(context, 0, buttonPins[0]);
				if(triggerStatus != previousTriggerStatus)
				{
					if(previousTriggerStatus == 1)
					{
						rt_printf("Button 0 has been pressed!\n");
						gTestStatus[gCurrentTest] = 1;
						++gCurrentTest;
						break;
					}
					previousTriggerStatus = triggerStatus;
				}
			} 
			// Reset reading-block counter
			if(count - blockCount >= gBlockSize) 
				blockCount = count;
			++count;		
		}
	}
	// EIGHT TEST
	else if (gCurrentTest == kAudioDCTestHi)
	{
		PRINTONCE("kAudioDCTestHi: testing audio out loopback to CV in. Make sure CV1 and CV2 are at max\n");
		static int currentChannel = 0;
		static bool potCheck = true;
		
		float readVal;
		static bool brokenAudioChannels[2] =  {0};
		static int numOfWokingAudioChannels = 0;
		float audioOutRange[2] = {-1.0, 0.0};
		static float audioOutVal = audioOutRange[0];

		static bool flashError = false;
		static bool runTest = false;
		
		for(unsigned int n = 0; n < context->analogFrames; n++) 
		{
			static unsigned int blockCount = count;

			// Flash test number
			if(!flashError)
			{
				if(!flashNumberLed(context, n, pwmPin, ledPins, 4, gCurrentTest, 10, 0.15 * context->audioSampleRate, count, 1))
				{
					runTest = true;
					encodeNumberLed(context, n, pwmPin, ledPins, 4, currentChannel+1, 0);
				} 	
			}
			
			if(runTest)
			{
				if(currentChannel < context->audioInChannels)
				{
					// Wait for potentiometer to be set at minimum
					if(potCheck)
					{
						// Write 0.5 to the CV out being tested
						audioWrite(context, n, currentChannel, 0.0);
						
						// Read after half a block-size samples
						if(count - blockCount == gBlockSize/2)
						{
							readVal = analogRead(context, n, cvPins[currentChannel]);
							
							// Finish checking the potentiometer when it is in the CCW position
							if(readVal >= 0.95)
								potCheck = false;
						}
					}
					else
					{
						PRINTONCE("Testing audio to CV loopback\n");
						// Write value to audio output
						audioWrite(context, n, currentChannel, audioOutVal);

						// Read after half a block-size samples
						if(count - blockCount == gBlockSize/2)
						{
							// Read value
							readVal = analogRead(context, n, cvPins[currentChannel]);

							// Check that the read value and the ouput value are within range
							if(!(fabs((readVal-1)*2 - audioOutVal) <= gAudioToCVtolerance))
							{
								rt_printf("audio out %d, fabs((readVal-1)*2 - audioOutVal): %f, gAudioToCVtolerance: %f, readVal: %f, audioOutVal: %f\n",
										currentChannel, fabs((readVal-1)*2 - audioOutVal) , gAudioToCVtolerance, readVal, audioOutVal);
								brokenAudioChannels[currentChannel] = 1; // In and out are out of range
							}
							

							// Create CV ramp and go to next potentiometer when the ramp has finished
							if(!cvRamp(&audioOutVal, audioOutRange, gInverseAudioSampleRate, gBlockSize))
							{
								if(!brokenAudioChannels[currentChannel])
									++numOfWokingAudioChannels;
								++currentChannel; // go to next channel
								potCheck = true;
							}

						}
					}
				}
				else
				{
					if(numOfWokingAudioChannels == context->audioInChannels)
					{
						rt_printf("Audio to CV works when potentiometes are set to maximum!\n");
						rt_printf("Test %d passed!\n", gCurrentTest);
						gTestStatus[gCurrentTest] = 1;
						++gCurrentTest;
						break;
					}
					else
					{
						static int audioBrokenIndex = 0;
						if(audioBrokenIndex < context->audioInChannels)
						{
							if(brokenAudioChannels[audioBrokenIndex])
							{
								flashError = true;
								if(!flashNumberLed(context, n, pwmPin, ledPins, 4, audioBrokenIndex+1, 10, 0.25 * context->audioSampleRate, count, 0, true))
								{
									rt_printf("ERROR: Audio Channel %d to CV link is broken\n", audioBrokenIndex);
									rt_printf("ERROR: Test %d failed.\n", gCurrentTest);
									gCurrentTest = kEndTest;
									break;
								}
							}
							else
							{
								++audioBrokenIndex;
							}	
						}
					}
				}
			}
			
			// Reset reading-block counter
			if(count - blockCount >= gBlockSize) 
				blockCount = count;
			++count;	
		}
	}
	// NINTH TEST
	else if (gCurrentTest == kAudioDCTestLo)
	{
		PRINTONCE("kAudioDCTestHi: testing audio out loopback to CV in. Make sure CV1 and CV2 are at min\n");
		static int currentChannel = 0;

		static bool potCheck = true;
		
		float readVal;
		static bool brokenAudioChannels[2] =  {0};
		static int numOfWokingAudioChannels = 0;
		float audioOutRange[2] = {0.0, 1.0};
		static float audioOutVal = audioOutRange[0];

		static bool flashError = false;
		static bool runTest = false;
		
		for(unsigned int n = 0; n < context->analogFrames; n++) 
		{
			static unsigned int blockCount = count;

			// Flash test number
			if(!flashError)
			{
				if(!flashNumberLed(context, n, pwmPin, ledPins, 4, gCurrentTest, 10, 0.15 * context->audioSampleRate, count, 1))
				{
					runTest = true;
					encodeNumberLed(context, n, pwmPin, ledPins, 4, currentChannel+1, 0);
				} 	
			}
			
			if(runTest)
			{
				if(currentChannel < context->audioInChannels)
				{
					// Wait for potentiometer to be set at minimum
					if(potCheck)
					{
						// Write 0.5 to the CV out being tested
						audioWrite(context, n, currentChannel, 0.0);
						
						// Read after half a block-size samples
						if(count - blockCount == gBlockSize/2)
						{
							readVal = analogRead(context, n, cvPins[currentChannel]);
							// Finish checking the potentiometer when it is in the CCW position
							if(readVal <= 0.05)
								potCheck = false;
						}
					}
					else
					{
						PRINTONCE("Testing audio to CV loopback\n");
						// Write value to audio output
						audioWrite(context, n, currentChannel, audioOutVal);

						// Read after half a block-size samples
						if(count - blockCount == gBlockSize/2)
						{
							// Read value
							readVal = analogRead(context, n, cvPins[currentChannel]);

							// Check that the read value and the ouput value are within range
							if(!(fabs(readVal*2 - audioOutVal) <= gAudioToCVtolerance))
							{
								brokenAudioChannels[currentChannel] = 1; // In and out are out of range
								rt_printf("audio out %d, fabs(readVal*2 - audioOutVal): %f, gAudioToCVtolerance: %f, readVal: %f, audioOutVal: %f\n",
										currentChannel, fabs(readVal*2 - audioOutVal), gAudioToCVtolerance, readVal, audioOutVal);
							}
							
							
							// Create CV ramp and go to next potentiometer when the ramp has finished
							if(!cvRamp(&audioOutVal, audioOutRange, gInverseAudioSampleRate, gBlockSize))
							{
								if(!brokenAudioChannels[currentChannel])
									++numOfWokingAudioChannels;
								++currentChannel; // go to next channel
								potCheck = true;
							}
							
						}
					}
				}
				else
				{
					if(numOfWokingAudioChannels == context->audioInChannels)
					{
						rt_printf("Audio to CV works when potentiometes are set to minimum!\n");
						rt_printf("Test %d passed!\n", gCurrentTest);
						gTestStatus[gCurrentTest] = 1;
						++gCurrentTest;
						break;
					}
					else
					{
						static int audioBrokenIndex = 0;
						if(audioBrokenIndex < context->audioInChannels)
						{
							if(brokenAudioChannels[audioBrokenIndex])
							{
								flashError = true;
								if(!flashNumberLed(context, n, pwmPin, ledPins, 4, audioBrokenIndex+1, 10, 0.25 * context->audioSampleRate, count, 0, true))
								{
									rt_printf("ERROR: Audio Channel %d to CV link is broken\n", audioBrokenIndex);
									rt_printf("ERROR: Test %d failed.\n", gCurrentTest);
									gCurrentTest = kEndTest;
									break;
								}
							}
							else
							{
								++audioBrokenIndex;
							}	
						}
					}
				}
			}
			
			// Reset reading-block counter
			if(count - blockCount >= gBlockSize) 
				blockCount = count;
			++count;	
		}
	}
	else if (gCurrentTest == kEndTest) // TEST END
	{
		for(unsigned int n = 0; n < context->digitalFrames; n++) 
		{
			static int passedTestIndex = 0;
			if(passedTestIndex < kNumTest-1)
			{	
				if(!gTestStatus[passedTestIndex])
				{
					if(!flashNumberLed(context, n, pwmPin, ledPins, 4, passedTestIndex+1, 20, 0.25 * context->audioSampleRate, count, 0))
					{
						rt_fprintf(stderr, "Some tests failed\n");
						exit(1);
					}
				}
				else
				{
					++passedTestIndex;
				}	
			} 
			else
			{
				if(!flashNumberLed(context, n, pwmPin, ledPins, 4, 15, 20, 0.25 * context->audioSampleRate, count, 1))
				{
					rt_printf("All tests passed\n");
					exit(0);
				}
			}
			++count; 
		}
	}

}

void cleanup(BelaContext *context, void *userData)
{

}
