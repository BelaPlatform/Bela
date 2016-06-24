/*
 * sensors.cpp
 *
 *  Created on: May 28, 2014
 *      Author: Victor Zappi
 */

#include <stdio.h>
#include <pthread.h>
#include <unistd.h>
#include <math.h>
#include <vector>
#include "prio.h"
#include "sensors.h"
#include "OscillatorBank.h"
#include "DboxSensors.h"


//----------------------------------------
// main extern variables
//----------------------------------------
extern vector<OscillatorBank*> gOscBanks;
extern int gCurrentOscBank;
extern int gNextOscBank;
extern int gShouldStop;
extern int gVerbose;

float gSensor0LatestTouchPos = 0;	// most recent pitch touch location [0-1] on sensor 0, used by render.cpp
int gSensor0LatestTouchNum	 = 0;	// most recent num of touches on sensor 0, used by render.cpp
float gSensor1LatestTouchPos[5];	// most recent touche locations on sensor 1, used by render.cpp
//float gSensor1LatestTouchSizes[5];
int gSensor1LatestTouchCount;		// most recent number touches on sensor 1, used by render.cpp
int gSensor1LatestTouchIndex = 0;	// index of last touch in gSensor1LatestTouchPos[5], used by render.cpp
int gLastFSRValue = 1799;			// most recent fsr value, used by render.cpp


DboxSensors Sensors;


//----------------------------------------
// var shared with logger
//----------------------------------------
int s0TouchNum	 	= 0;
float s0Touches_[MAX_TOUCHES];
float s0Size_[MAX_TOUCHES];
int s0LastIndex;

int s1TouchNum	 	= 0;
float s1Touches_[MAX_TOUCHES];
float s1Size_[MAX_TOUCHES];
int s1LastIndex;

int fsr				= 1799;



using namespace std;

int initSensorLoop(int sensorAddress0, int sensorAddress1, int sensorType)
{
	int tk0_bus			= 1;
	int tk0_address		= sensorAddress0;
	int tk1_bus			= 1;
	int tk1_address		= sensorAddress1;
	int tk_file			= 0;
	int fsr_max			= 1799;
	int fsr_pinNum		= 4;

	if(gVerbose==1)
		cout << "---------------->Init Control Thread" << endl;

	if(Sensors.initSensors(tk0_bus, tk0_address, tk1_bus, tk1_address, tk_file, fsr_pinNum, fsr_max, sensorType)>0)
	{
		gShouldStop = 1;
		cout << "control cannot start" << endl;
		return -1;
	}

	for(int i=0; i<MAX_TOUCHES; i++)
	{
		s0Touches_[i]	= 0.0;
		s0Size_[i]		= 0.0;

		s1Touches_[i]	= 0.0;
		s1Size_[i]	= 0.0;
	}

	return 0;
}

void sensorLoop(void *)
{
	timeval start, end;
	unsigned long elapsedTime;
	//float touchSize		= 0;	// once used for timbre



	float *s0Touches;
	float *s0Size;
	int s0PrevTouchNum 	= 0;
	int s0SortedTouchIndices[MAX_TOUCHES];
	float s0SortedTouches[MAX_TOUCHES];
	float s0PrevSortedTouches[MAX_TOUCHES];

	float *s1Touches;
	float *s1Size;
	int s1PrevTouchNum 	= 0;
	int s1SortedTouchIndices[MAX_TOUCHES];
	float s1SortedTouches[MAX_TOUCHES];
	float s1PrevSortedTouches[MAX_TOUCHES];

	float freqScaler	= 0;
	int fsrMin			= 0;//50; // was 200
	int fsrMax			= 1799;//1300; // was 800
	float vel			= 0;
	float prevVel		= 0;
	float filterMaxF	= 0;
	if(gVerbose==1)
		dbox_printf("__________set Control Thread priority\n");

	if(gVerbose==1)
		dbox_printf("_________________Control Thread!\n");

	// get freq scaler, cos freqs must be scaled according to the wavetable used in the oscillator bank
	freqScaler 		= gOscBanks[gCurrentOscBank]->getFrequencyScaler();
	filterMaxF		= gOscBanks[gCurrentOscBank]->filterMaxF;

	// init time vals
	gettimeofday(&start, NULL);

	// here we go, sensor loop until the end of the application
	while(!gShouldStop)
	{
		gettimeofday(&end, NULL);
		elapsedTime = ( (end.tv_sec*1000000+end.tv_usec) - (start.tv_sec*1000000+start.tv_usec) );
		if( elapsedTime<4000 )
			usleep(4000-elapsedTime);
		else
			dbox_printf("%d\n", (int)elapsedTime); // this print happens when something's gone bad...

		if(Sensors.readSensors()==0)
		{
			s0TouchNum	= Sensors.getTKTouchCount(0);
			s0Touches	= Sensors.getTKXPositions(0);
			s0Size 		= Sensors.getTKTouchSize(0);

			s1TouchNum	= Sensors.getTKTouchCount(1);
			s1Touches	= Sensors.getTKXPositions(1);
			s1Size 		= Sensors.getTKTouchSize(1);

			for(int i=0; i<MAX_TOUCHES; i++)
			{
				s0Touches_[i]	= s0Touches[i];
				s0Size_[i]		= s0Size[i];

				s1Touches_[i]	= s1Touches[i];
				s1Size_[i]		= s1Size[i];
			}

			gSensor0LatestTouchNum	= s0TouchNum;
			if(s0TouchNum > 0)
			{
				//-----------------------------------------------------------------------------------
				// timbre, speed and  pitch
				//touchSize	 = 0;	\\ once used for timbre

				// if we have a number of touches different from previous round, track their order of arrival [calculated using distance comparison]
				if(s0PrevTouchNum!=s0TouchNum)
				{
					float distances[MAX_TOUCHES*(MAX_TOUCHES-1)]; // maximum number of current+previous touches between rounds with different num of touches
					int ids[MAX_TOUCHES*(MAX_TOUCHES-1)];
					// calculate all distance permutations between previous and current touches
					for(int i=0; i<s0TouchNum; i++)
					{
						for(int p=0; p<s0PrevTouchNum; p++)
						{
							int index			= i*s0PrevTouchNum+p;	// permutation id [says between which touches we are calculating distance]
							distances[index]	= fabs(s0Touches[i]-s0PrevSortedTouches[p]);
							ids[index]			= index;
							if(index>0)
							{
								// sort, from min to max distance
								float tmp;
								while(distances[index]<distances[index-1])
								{
									tmp				= ids[index-1];
									ids[index-1]	= ids[index];
									ids[index]		= tmp;

									tmp				= distances[index-1];
									distances[index-1] = distances[index];
									distances[index] = tmp;

									index--;

									if(index == 0)
										break;
								}
							}
						}
					}

					int sorted = 0;
					bool currAssigned[MAX_TOUCHES] = {false};
					bool prevAssigned[MAX_TOUCHES] = {false};

					// track touches assigning index according to shortest distance
					for(int i=0; i<s0TouchNum*s0PrevTouchNum; i++)
					{
						int currentIndex	= ids[i]/s0PrevTouchNum;
						int prevIndex		= ids[i]%s0PrevTouchNum;
						// avoid double assignment
						if(!currAssigned[currentIndex] && !prevAssigned[prevIndex])
						{
							currAssigned[currentIndex]	= true;
							prevAssigned[prevIndex]		= true;
							s0SortedTouchIndices[currentIndex] = prevIndex;
							sorted++;
						}
					}
					// we still have to assign a free index to new touches
					if(s0PrevTouchNum<s0TouchNum)
					{
						for(int i=0; i<s0TouchNum; i++)
						{
							if(!currAssigned[i])
								s0SortedTouchIndices[i] = sorted++; // assign next free index

							// update tracked value
							s0SortedTouches[s0SortedTouchIndices[i]] = s0Touches[i];
							s0PrevSortedTouches[i]			         = s0SortedTouches[i];
							if(s0SortedTouchIndices[i]==s0TouchNum-1)
								s0LastIndex = i;

							// accumulate sizes for timbre
							//touchSize += s0Size[i];
						}
					}
					else // some touches have disappeared...
					{
						// ...we have to shift all indices...
						for(int i=s0PrevTouchNum-1; i>=0; i--)
						{
							if(!prevAssigned[i])
							{
								for(int j=0; j<s0TouchNum; j++)
								{
									// ...only if touches that disappeared were before the current one
									if(s0SortedTouchIndices[j]>i)
										s0SortedTouchIndices[j]--;
								}
							}
						}
						// done! now update
						for(int i=0; i<s0TouchNum; i++)
						{
							// update tracked value
							s0SortedTouches[s0SortedTouchIndices[i]] = s0Touches[i];
							s0PrevSortedTouches[i]			         = s0SortedTouches[i];
							if(s0SortedTouchIndices[i]==s0TouchNum-1)
								s0LastIndex = i;

							// accumulate sizes for timbre
							//touchSize += s0Size[i];
						}
					}
				}
				else // nothing's changed since last round
				{
					for(int i=0; i<s0TouchNum; i++)
					{
						// update tracked value
						s0SortedTouches[s0SortedTouchIndices[i]] = s0Touches[i];
						s0PrevSortedTouches[i]			         = s0SortedTouches[i];

						// accumulate sizes for timbre
						//touchSize += s0Size[i];
					}
				}

				if(s0TouchNum == 0)
					s0LastIndex = -1;

				// timbre
				//touchSize = (touchSize > 0.7) ? 1 : touchSize/0.7;
				//gOscBanks[gCurrentOscBank]->hopNumTh = log((1-touchSize)+1)/log(2)*20000;
				//gOscBanks[gCurrentOscBank]->hopNumTh = 0;


				// pitch, controlled by last touch
				//prevTouchPos 				= touch[touchIndex];
				//touchPos	 			 	= (s0SortedTouches[s0TouchNum-1]-0.5)/0.5;	// from [0,1] to [-1,1]
				gSensor0LatestTouchPos      = s0SortedTouches[s0TouchNum-1];
				//touchPos					= s0Touches[0];
				//gOscBanks[gCurrentOscBank]->pitchMultiplier 	= pow(2, touchPos);
				//-----------------------------------------------------------------------------------



				//-----------------------------------------------------------------------------------
				// note on
				//if(s0PrevTouchNum == 0)
				//	gOscBanks[gCurrentOscBank]->play();
				// fsr = Sensors.getFSRVAlue();
				fsr = gLastFSRValue;
				//dbox_printf("fsr: %d\n", fsr);
				if(!gOscBanks[gCurrentOscBank]->note)
				{
					vel = fsr;
					vel /= (float)(fsrMax-fsrMin);

					vel = 1-vel;
					dbox_printf("Attack vel: %f\n", vel);
					gOscBanks[gCurrentOscBank]->play(vel);
					prevVel = vel;
				}
				else if(gOscBanks[gCurrentOscBank]->getEnvelopeState() != env_release)
				{
					fsr = (fsr > fsrMax) ? fsrMax : fsr;
					vel = (fsr < fsrMin) ? fsrMin : fsr;
					vel -= fsrMin;
					vel /= (float)(fsrMax-fsrMin);
					vel = 1-vel;
					if(vel > prevVel)
					{
						gOscBanks[gCurrentOscBank]->afterTouch(vel);
						prevVel = vel;
					}
				}
				//-----------------------------------------------------------------------------------
			}
			else
			{
				//prevFsr = 1799;
				//prevTouchPos = -1;
				//-----------------------------------------------------------------------------------
				// note off
				if(s0PrevTouchNum > 0)
				{
					if(gOscBanks[gCurrentOscBank]->state==bank_playing)
						gOscBanks[gCurrentOscBank]->stop();
				}
				//-----------------------------------------------------------------------------------
			}



			// sensor 2
			//-----------------------------------------------------------------------------------
			//filter - calculated even when no touches on first sensor, to filter also release tail
			gOscBanks[gCurrentOscBank]->filterNum	= s1TouchNum;

			gSensor1LatestTouchCount = gOscBanks[gCurrentOscBank]->filterNum;
			for(int i = 0; i < gSensor1LatestTouchCount; i++) {
				gSensor1LatestTouchPos[i] = s1Touches[i];
				//gSensor1LatestTouchSizes[i] = s1Size[i];
			}

/*			for(int i=0; i<gOscBanks[gCurrentOscBank]->filterNum; i++)
			{
				// touch pos is linear but freqs are log
				gOscBanks[gCurrentOscBank]->filterFreqs[i] = ((exp(s0Touches[i]*4)-1)/(exp(4)-1))*filterMaxF*freqScaler;
				//gOscBanks[gCurrentOscBank]->filterQ[i] = size[i]*5*(1+touch[i]*1000)*freqScaler;
				gOscBanks[gCurrentOscBank]->filterQ[i] = s0Size[i];
				if(gOscBanks[gCurrentOscBank]->filterFreqs[i]>500*freqScaler)
					gOscBanks[gCurrentOscBank]->filterPadding[i] = 1+100000*( (gOscBanks[gCurrentOscBank]->filterFreqs[i]-500*freqScaler)/(filterMaxF-500)*freqScaler );
				else
					gOscBanks[gCurrentOscBank]->filterPadding[i] = 1;
			}*/

			// each touch on sensor 2 is a notch filter, whose Q is determined by touch size
			for(int i=0; i<gOscBanks[gCurrentOscBank]->filterNum; i++)
			{
				// map touch pos [which is linear] on freqs exponentially
				float freq = ((exp(s1Touches[i]*4)-1)/EXP_DENOM)*filterMaxF;
				gOscBanks[gCurrentOscBank]->filterFreqs[i] = freq*freqScaler;
				// also size is mapped exponentially on Q
				float siz = (exp(s1Size[i])-1)/1.71828;
				gOscBanks[gCurrentOscBank]->filterQ[i] = siz*( (filterMaxF-freq)/filterMaxF * 0.9 + 0.1 );	// size weight on Q decreases with frequency
			}
			//-----------------------------------------------------------------------------------



			//-----------------------------------------------------------------------------------
			// sort touches on sensor 2
			if(s1TouchNum > 0)
			{
				// if we have a number of touches different from previous round, track their order of arrival [calculated using distance comparison]
				if(s1PrevTouchNum!=s1TouchNum)
				{
					float distances[MAX_TOUCHES*(MAX_TOUCHES-1)]; // maximum number of current+previous touches between rounds with different num of touches
					int ids[MAX_TOUCHES*(MAX_TOUCHES-1)];
					// calculate all distance permutations between previous and current touches
					for(int i=0; i<s1TouchNum; i++)
					{
						for(int p=0; p<s1PrevTouchNum; p++)
						{
							int index 			= i*s1PrevTouchNum+p;	// permutation id [says between which touches we are calculating distance]
							distances[index]	= fabs(s1Touches[i]-s1PrevSortedTouches[p]);
							ids[index]			= index;
							if(index>0)
							{
								// sort, from min to max distance
								float tmp;
								while(distances[index]<distances[index-1])
								{
									tmp 				= ids[index-1];
									ids[index-1] 		= ids[index];
									ids[index] 			= tmp;

									tmp					= distances[index-1];
									distances[index-1]	= distances[index];
									distances[index] 	= tmp;

									index--;

									if(index == 0)
										break;
								}
							}
						}
					}

					int sorted = 0;
					bool currAssigned[MAX_TOUCHES] = {false};
					bool prevAssigned[MAX_TOUCHES] = {false};

					// track touches assigning index according to shortest distance
					for(int i=0; i<s1TouchNum*s1PrevTouchNum; i++)
					{
						int currentIndex	= ids[i]/s1PrevTouchNum;
						int prevIndex		= ids[i]%s1PrevTouchNum;
						// avoid double assignment
						if(!currAssigned[currentIndex] && !prevAssigned[prevIndex])
						{
							currAssigned[currentIndex]			= true;
							prevAssigned[prevIndex]				= true;
							s1SortedTouchIndices[currentIndex] = prevIndex;
							sorted++;
						}
					}
					// we still have to assign a free index to new touches
					if(s1PrevTouchNum<s1TouchNum)
					{
						for(int i=0; i<s1TouchNum; i++)
						{
							if(!currAssigned[i])
								s1SortedTouchIndices[i] = sorted++; // assign next free index

							// update tracked value
							s1SortedTouches[s1SortedTouchIndices[i]] = s1Touches[i];
							s1PrevSortedTouches[i]			       	 = s1SortedTouches[i];
							if(s1SortedTouchIndices[i]==s1TouchNum-1)
								s1LastIndex = i;
						}
					}
					else // some touches have disappeared...
					{
						// ...we have to shift all indices...
						for(int i=s1PrevTouchNum-1; i>=0; i--)
						{
							if(!prevAssigned[i])
							{
								for(int j=0; j<s1TouchNum; j++)
								{
									// ...only if touches that disappeared were before the current one
									if(s1SortedTouchIndices[j]>i)
										s1SortedTouchIndices[j]--;
								}
							}
						}
						// done! now update
						for(int i=0; i<s1TouchNum; i++)
						{
							// update tracked value
							s1SortedTouches[s1SortedTouchIndices[i]] = s1Touches[i];
							s1PrevSortedTouches[i]			       	 = s1SortedTouches[i];
							if(s1SortedTouchIndices[i]==s1TouchNum-1)
								s1LastIndex = i;
						}
					}
				}
				else // nothing's changed since last round
				{
					for(int i=0; i<s1TouchNum; i++)
					{
						// update tracked value
						s1SortedTouches[s1SortedTouchIndices[i]] = s1Touches[i];
						s1PrevSortedTouches[i]			       	 = s1SortedTouches[i];
					}
				}
			}

			if(s1TouchNum > 0)
			{
				gSensor1LatestTouchIndex = s1LastIndex;
			}
			else
				s1LastIndex = -1;

/*			dbox_printf("-----------------------------\nnum: %d, latest: %d\n", s1TouchNum, gSensor1LatestTouchIndex);
			for(int i=0; i<s1TouchNum; i++)
				dbox_printf("\t%f\n", gSensor1LatestTouchPos[i]);
			dbox_printf("------\n");
			for(int i=0; i<s1TouchNum; i++)
				dbox_printf("\t%f\n", s1SortedTouches[i]);*/



			// update variables for both sensors
			s0PrevTouchNum	= s0TouchNum;
			s1PrevTouchNum	= s1TouchNum;
		}
		else
			dbox_printf("Come on instrument!\n");	//break

		gettimeofday(&start, NULL);
	}

	dbox_printf("sensor thread ended\n");
}

void *keyboardLoop(void *)
{
	if(gVerbose==1)
		cout << "_________________Keyboard Control Thread!" << endl;

	char keyStroke = '.';
	cout << "Press q to quit." << endl;

	float speed;

	do
	{
		keyStroke =	getchar();
		while(getchar()!='\n'); // to read the first stroke

		switch (keyStroke)
		{
			//----------------------------------------------------------------------------
			case 'a':
				gOscBanks[gCurrentOscBank]->hopNumTh = 0;
				gOscBanks[gCurrentOscBank]->play(1);
				//cout << "Note on" << endl;
				break;
			case 's':
				if(gOscBanks[gCurrentOscBank]->state==bank_playing)
				{
					gOscBanks[gCurrentOscBank]->stop();
					//cout << "Note off" << endl;
				}
				break;
			//----------------------------------------------------------------------------
			case '[':
				gOscBanks[gCurrentOscBank]->freqMovement-=0.05;
				if(gOscBanks[gCurrentOscBank]->freqMovement<0)
					gOscBanks[gCurrentOscBank]->freqMovement = 0;
				//cout << "gOscBanks[gCurrentOscBank]->FreqMov: " << gOscBanks[gCurrentOscBank]->freqMovement << endl;
				break;
			case ']':
				gOscBanks[gCurrentOscBank]->freqMovement+=0.05;
				if(gOscBanks[gCurrentOscBank]->freqMovement>1)
					gOscBanks[gCurrentOscBank]->freqMovement = 1;
				//cout << "gOscBanks[gCurrentOscBank]->FreqMov: " << gOscBanks[gCurrentOscBank]->freqMovement << endl;
				break;
			//----------------------------------------------------------------------------
			case '<':
				speed = gOscBanks[gCurrentOscBank]->getSpeed() - 0.1 ;
				gOscBanks[gCurrentOscBank]->setSpeed(speed);
				dbox_printf("Speed: %f\n", speed);

				break;
			case '>':
				speed = gOscBanks[gCurrentOscBank]->getSpeed() + 0.1 ;
				gOscBanks[gCurrentOscBank]->setSpeed(speed);
				dbox_printf("Speed: %f\n", speed);
				break;
			case '0':
				speed = 0.1;
				gOscBanks[gCurrentOscBank]->setSpeed(speed);
				dbox_printf("Speed: %f\n", speed);
				break;
			case '1':
				speed = 0.5;
				gOscBanks[gCurrentOscBank]->setSpeed(speed);
				dbox_printf("Speed: %f\n", speed);
				break;
			case '2':
				speed = 1;
				gOscBanks[gCurrentOscBank]->setSpeed(speed);
				dbox_printf("Speed: %f\n", speed);
				break;
			case '3':
				speed = 2;
				gOscBanks[gCurrentOscBank]->setSpeed(speed);
				dbox_printf("Speed: %f\n", speed);
				break;
			case '4':
				speed = 3;
				gOscBanks[gCurrentOscBank]->setSpeed(speed);
				dbox_printf("Speed: %f\n", speed);
				break;
			//----------------------------------------------------------------------------
			case 'z':
				gOscBanks[gCurrentOscBank]->setJumpHop(0);
				break;
			case 'x':
				gOscBanks[gCurrentOscBank]->setJumpHop(100);
				break;
			case 'c':
				gOscBanks[gCurrentOscBank]->setJumpHop(600);
				break;
			case 'v':
				gOscBanks[gCurrentOscBank]->setJumpHop(1100);
				break;
			case 'b':
				gOscBanks[gCurrentOscBank]->setJumpHop(2000);
				break;
			case 'n':
				gOscBanks[gCurrentOscBank]->setJumpHop(gOscBanks[gCurrentOscBank]->getLastHop());
				break;
			//----------------------------------------------------------------------------
			case 'q':
				gShouldStop = true;
				break;
			case 'o':
				gNextOscBank = (gCurrentOscBank + 1) % gOscBanks.size();
				break;
			default:
				break;
			//----------------------------------------------------------------------------
		}
		usleep(1000); /* Wait 1ms to avoid checking too quickly */
	}
	while (keyStroke!='q');

	cout << "keyboard thread ended" << endl;

	return (void *)0;
}
