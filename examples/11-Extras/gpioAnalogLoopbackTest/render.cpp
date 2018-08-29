#include <Bela.h>
#include <cmath>
#include <sys/time.h>
#include <sys/types.h>
#include <unistd.h>
#include <stats.hpp>

// digital inputs can be changed at will (as they are all being processed at the same time)
// analog channels must be as per below
int gAnalogOutCh = 1;
int gDigitalOutCh = 2;
int gDigitalInACh = 0;
int gDigitalInDCh = 3;
int gAnalogOutLoopDelay;
int gDigitalOutLoopDelay;
bool setup(BelaContext *context, void *userData)
{
	rt_printf("For this test you need the following connections:\n"
			"analog%d out->digital%d in, analog%d out->analog%d in, "
			"digital%d out -> digital%d in, digital%d out-> analog%d in\n",
			gAnalogOutCh, gDigitalInACh, gAnalogOutCh, 0, gDigitalOutCh, gDigitalInDCh, gDigitalOutCh, 0);
	rt_printf("Running test with %d analog channels and a buffer size of %d\n",
			context->analogInChannels, context->audioFrames);

	for(unsigned int n = 0; n < context->digitalFrames; n++){
		pinMode(context, n, gDigitalInACh, INPUT);
		pinMode(context, n, gDigitalInDCh, INPUT);
		pinMode(context, n, gDigitalOutCh, OUTPUT);
	}
	switch (context->analogOutChannels){
		case 2:
			gAnalogOutLoopDelay = context->audioFrames*2 + 3;
			gDigitalOutLoopDelay = context->audioFrames*2 + 2;
			break;
		case 4:
			gAnalogOutLoopDelay = context->audioFrames*2 + 3;
			gDigitalOutLoopDelay = context->audioFrames*2 + 2;
			break;
		case 8:
			gAnalogOutLoopDelay = context->audioFrames + 3;
			gDigitalOutLoopDelay = context->audioFrames + 1;
			break;
		default:
			exit(2);
	}

    return true;
}

const int patternLength = 31;
static int anaErrorCount = 0;
static int digErrorCount = 0;
void render(BelaContext *context, void *userData)
{
	static bool writePattern[patternLength] = {
									0,1,0,1,0,0,1,1,
									0,0,0,1,1,1,0,0,
									1,1,1,1,0,0,0,0,
									1,1,1,1,1,0,0};
//	for(int n = 0; n < patternLength; n++){
//		writePattern[n]=1;
//	}
	static int inPointer = 0;
	static int outPointer = 0;
	static int digitalOutPointer = 0;
	static int digitalInPointer = 0;
	static int analogOut = 1;
	/** Checking offset between analog and digital
	 * how it should be :
	 * The PRU loop does the following (the loop runs at 88.2kHz):
	 * - Read/write audio sample (once for the left channel, once for the right channel)
	 * - Write DAC 0 or 0/2 or 0/2/4/6
	 * - Read ADC 0 or 0/2 or 0/2/4/6, 2 samples (@176.4) older than NOW
	 * - /During/ the line above, every two loops we also Read/Write GPIO,
	 * therefore reading on ADC 0/2/4/6 a value that is being output from GPIO will lead to undefined results
	 * - Write DAC 1 or 1/3 or 1/3/5/7
	 * - Read ADC 1 or 1/3 or 1/3/5/7, 2 samples (@176.4) older than NOW
	 */
	if(1)
	for(unsigned int n = 0; n < context->audioFrames; n++){
		static bool analog0In = false;
		static bool digitalAIn = false;
		static int count = 0;
		bool doReadWrite = context->analogInChannels<=4 ? true : ((context->analogInChannels == 8) && (n&1)==0);
		if(doReadWrite){
			digitalAIn = digitalRead(context, n, gDigitalInACh);
			switch(context->analogInChannels){
			case 8:
				analog0In = analogRead(context, n/2, 0) > 0.5;
				analogWriteOnce(context, n/2, analogOut, writePattern[outPointer]);
				break;
			case 4:
				analog0In = analogRead(context, n, 0) > 0.5;
				analogWriteOnce(context, n, analogOut, writePattern[outPointer]);
				break;
			case 2:
				analog0In = analogRead(context, n * 2 + 1, 0) > 0.5;
				analogWriteOnce(context, 2 * n, analogOut, writePattern[outPointer]);
				analogWriteOnce(context, 2 * n + 1, analogOut, writePattern[outPointer]);
				break;
			}
			gAnalogOutLoopDelay--;
			outPointer++;
			if(gAnalogOutLoopDelay <= 0){
				if(++inPointer == patternLength){
					inPointer = 0;
				}
			}
		}
		bool expectedIn = writePattern[inPointer];
		if(gAnalogOutLoopDelay <= 0 && doReadWrite == true){
			if(analog0In != expectedIn || digitalAIn != expectedIn){
				rt_printf("expected: %d, received: %d %d, pointer: %d, delay: %d, count: %d\n",
					expectedIn, analog0In, digitalAIn, inPointer, gAnalogOutLoopDelay, count);
				anaErrorCount++;
			}
		}
		count++;
		if(analog0In != digitalAIn){ // at any time the analog and digital in should be the same
			rt_printf("ana %d_%d %d,\n", analog0In, digitalAIn, n);
		}
		if(outPointer == patternLength){
			outPointer = 0;
		}
	}
	if(1)
	for(unsigned int n = 0; n < context->audioFrames; n++){
		static int count = 0;
		static bool analog1In = false;
		static bool digitalDIn = false;
/* we need to remember the pastAnalog1In because
 *  reading GPIO takes place before writing to it, therefore
 *  when reading a GPIOout, the GPIOin samples will always be one sample late
 */
		bool doReadWrite = false;
		static bool pastAnalog1In = false;
		digitalWriteOnce(context, n, gDigitalOutCh,  writePattern[digitalOutPointer]);
		if(context->analogInChannels == 8){
			if((n&1) == 0){ //do it every other sample
				pastAnalog1In = analogRead(context, n/2, 1) > 0.5;
				digitalDIn = digitalRead(context, n, gDigitalInDCh);
				doReadWrite = true;
			}
		}
		if(context->analogInChannels == 4){
			pastAnalog1In = analogRead(context, n, 1) > 0.5;
			digitalDIn = digitalRead(context, n, gDigitalInDCh);
			digitalWriteOnce(context, n, gDigitalOutCh,  writePattern[digitalOutPointer]);
			doReadWrite = true;
		}
		if(context->analogInChannels == 2){
			pastAnalog1In = analogRead(context, n * 2, 1) > 0.5;
			digitalDIn = digitalRead(context, n, gDigitalInDCh);
			digitalWriteOnce(context, n, gDigitalOutCh,  writePattern[digitalOutPointer]);
			doReadWrite = true;
		}
		bool expectedDigitalIn = writePattern[digitalInPointer];
		if(doReadWrite == true){
			gDigitalOutLoopDelay--;
			if(gDigitalOutLoopDelay <= 0){
				if(expectedDigitalIn != pastAnalog1In || expectedDigitalIn != digitalDIn){
					rt_printf("D expected: %d, received: %d %d, pointer: %d, delay: %d, count: %d\n",
						expectedDigitalIn, pastAnalog1In, digitalDIn, inPointer, gDigitalOutLoopDelay, count);
					digErrorCount++;
				}
				if(++digitalInPointer == patternLength){
					digitalInPointer = 0;
				}
			}
			pastAnalog1In = analog1In;
			if(++digitalOutPointer == patternLength){
				digitalOutPointer = 0;
			}
		}
		count++;
	}
	if(context->audioFramesElapsed > 30000){
		gShouldStop = true;
	}
}


void cleanup(BelaContext *context, void *userData)
{
	if(anaErrorCount == 0 && digErrorCount == 0){
		rt_printf("Test was succesful with %d analog channels and a buffer size of %d\n", context->analogInChannels, context->audioFrames);
	} else {
		rt_printf("------------------------\n%danalog %ddigital errors over %dsamples while running test with ",
				anaErrorCount, digErrorCount, context->audioFramesElapsed);
		rt_printf("%d analog channels and a buffer size of %d \n\n\n",
				context->analogInChannels, context->audioFrames);
		exit(1);
	}
}
