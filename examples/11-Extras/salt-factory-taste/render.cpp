#include <Bela.h>
#include <math.h>

enum
{
	kButtonsTest,
	kTrigIoTest,
	kPotRangeTest,
	kCvLoRangeTest,
	kCvHiRangeTest,
	kEndTest
};

const int nPins = 4;

const int triggOutPins[nPins] = {0, 5, 12, 13};
const int triggInPins[nPins] = {15, 14, 1, 3};
const int sw1Pin = 6;
const int ledPins[nPins] = {2, 4, 8, 9};
const int pwmPin = 7;
const int audioPins[nPins/2] = {0, 1};
const int gNumButtons = nPins;
const int gNumCVs = nPins*2;

const int buttonPins[gNumButtons] = {sw1Pin, triggInPins[1], triggInPins[2], triggInPins[3]};
const int cvPins[gNumCVs] = {0, 1, 2, 3, 4, 5, 6, 7};

int gCurrentTest = 0;

int gPeriod; 
unsigned int count = 0;

int gLedState[nPins] = {0, 0, 0, 0};
int gButtonStatus[gNumButtons] = {0, 0, 0, 0};

int gLedsOn = false;

int gBlockSize = 512;

float gInverseAnalogSampleRate;

static float gCvRange[2][gNumCVs];

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
	if(prevNum != number || reset)
	{
		flashBlock = count;
		flashCount = 0;
		prevNum = number;
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

bool setup(BelaContext *context, void *userData)
{
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
	if(context->analogFrames == 0 || context->analogFrames > context->audioFrames) 
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
	
	gInverseAnalogSampleRate = 1.0 / context->analogSampleRate;
	return true;
}

void render(BelaContext *context, void *userData)
{
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
										if(count - gButtonCount[b] < 128) 
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

								++gCurrentTest;
								flashLeds = true;
							} 
							else 
							{
								rt_printf("ERROR: Buttons are not working. Test failed.\n");
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
	// SECOND 
	else if (gCurrentTest == kTrigIoTest)
	{	
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
		gCurrentTest = kCvLoRangeTest; // DELETE
		
		static bool potsWorking[gNumCVs] = {0};
		static int numOfWorkingPots = 0;
		static int currentPot = -1;
		static float previousRead[gNumCVs];
		static bool firstReading = true;

		
		for(unsigned int n = 0; n < context->analogFrames; n++) 
		{
			static unsigned int blockCount = count;
			static int testInitTime = count;
			
			// Flash test number
			if(flashLeds)
				flashNumberLed(context, n, pwmPin, ledPins, 4, gCurrentTest, -1, 0.15 * context->analogSampleRate, count, 1);
				
			// Show active potentiometer (starting from 1)
			if(currentPot != -1)
			{
				// Stop flashing LEDs
				flashLeds = false;
				
				if(potsWorking[currentPot])
				{
					encodeNumberLed(context, n, pwmPin, ledPins, 4, currentPot+1, 0);
					flashNumberLed(context, n, pwmPin, ledPins, 4, currentPot+1, -1, 0.25 * context->analogSampleRate, count, 0);
				} 
				else
				{
					encodeNumberLed(context, n, pwmPin, ledPins, 4, currentPot+1, 0);
				}
			}
			
			// Write 0.5 to the CV outs
			for(unsigned int c = 0; c < gNumCVs; ++c) 
			{
				analogWriteOnce(context, n, cvPins[c], 0.5);
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
			}
			
			// Test finishes when all pots are working
			if(numOfWorkingPots == gNumCVs)
			{
				rt_printf("All potentiometers work! %d\n", count);
				//++gCurrentTest;
				flashLeds = true;
				gCurrentTest = kCvLoRangeTest;
				break;
			}
			
			// Reset reading-block counter
			if(count - blockCount >= gBlockSize) 
				blockCount = count;
			++count;
		}
	}
	else if (gCurrentTest == kCvLoRangeTest) 
	{
		static int currentCv = 0;
		static int rampDirection = 1;
		static bool potCheck = true;
		static float cvOutVal = 0.0;
		float readVal;
		
		for(unsigned int n = 0; n < context->analogFrames; n++) 
		{
			static unsigned int blockCount = count;
			

			// Flash test number
			//if(flashLeds)
			if(!flashNumberLed(context, n, pwmPin, ledPins, 4, gCurrentTest, 10, 0.15 * context->analogSampleRate, count, 1))
			{
				encodeNumberLed(context, n, pwmPin, ledPins, 4, currentCv+1, 0);
				//flashNumberLed(context, n, pwmPin, ledPins, 4, currentCv+1, -1, 0.25 * context->analogSampleRate, count, 0);
			}
				
			if(currentCv < gNumCVs)
			{
				
			}
			else
			{
				// Wait for potentiometer to be set at minimum
				if(potCheck)
				{
					// Write 0.5 to the CV out being tested
					analogWriteOnce(context, n, cvPins[currentCv], 0.5);
					
					// Read after half a block-size samples
					if(count - blockCount == gBlockSize/2)
					{
						readVal = analogRead(context, n, cvPins[currentCv]);
						if(readVal <= 0.05)
							potCheck = false;
					}
				}
				else
				{
					analogWriteOnce(context, n, cvPins[currentCv], cvOutVal);
					
					// Read after half a block-size samples
					if(count - blockCount == gBlockSize/2)
					{
						
						// Read value
						readVal = analogRead(context, n, cvPins[currentCv]);
		
						// Check that the read value and the ouput value are within range
						if(fabs(readVal - cvOutVal) > 0.01)
						{
							// In and out are within range
						} 
						else
						{
							// In and out are out of range
						}
						
						// Increment CV output values
						cvOutVal += (rampDirection) * gInverseAnalogSampleRate;
						if(cvOutVal >= 0.5)
						{	
							rampDirection *= -1; // change ramp direction
						} 
						else if (cvOutVal <= 0)
						{
							rampDirection *= -1; // change ramp direction
							++currentCv; // go to next cv input
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
	else if (gCurrentTest == kCvHiRangeTest) 
	{
		for(unsigned int n = 0; n < context->digitalFrames; n++) 
		{
			// Flash test number
			if(flashLeds)
				flashNumberLed(context, n, pwmPin, ledPins, 4, gCurrentTest, -1, 0.15 * context->digitalSampleRate, count, 1);
				
			++count;
		}
	}
	else if (gCurrentTest == kEndTest) // TEST END
	{
		for(unsigned int n = 0; n < context->digitalFrames; n++) 
		{
			//encodeNumberLed(context, n, pwmPin, ledPins, 4, 5);
			//flashNumberLed(context, n, pwmPin, ledPins, 4, 5, 6, 0.5 * context->digitalSampleRate, count);
						

			++count;
		}
	}

}

void cleanup(BelaContext *context, void *userData)
{

}