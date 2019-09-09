/*
 *  RTAudio.cpp
 *
 *  Central control code for hard real-time audio on BeagleBone Black
 *  using PRU and Xenomai Linux extensions. This code began as part
 *  of the Hackable Instruments project (EPSRC) at Queen Mary University
 *  of London, 2013-14.
 *
 *  (c) 2014 Victor Zappi and Andrew McPherson
 *  Queen Mary University of London
 */


#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <math.h>
#include <iostream>
#include <signal.h>		// interrupt handler
#include <assert.h>
#include <vector>
#include <dirent.h>		// to handle files in dirs
#include <mntent.h>		// to check if device is mounted
#include <sys/mount.h>	// mount()
#include <sys/time.h>	// elapsed time
#include <libraries/ne10/NE10.h>	// neon library
#include <algorithm>    // std::sort

// thread priority
#include <pthread.h>
#include <sched.h>

// get_opt_long
#include <getopt.h>

#include <Bela.h>
#include "config.h"
#include "sensors.h"
#include "DboxOscillatorBank.h"
#include "StatusLED.h"
#include "logger.h"

using namespace std;

//----------------------------------------
// main variables
//----------------------------------------
vector<DboxOscillatorBank*> gOscBanks;
int gCurrentOscBank = 0;
int gNextOscBank = 0;
int oscBnkOversampling 				 = 1;	// oscillator bank frame oversampling

const int kStatusLEDPin 	 = 30;	// P9-11 controls status LED
StatusLED gStatusLED;

pthread_t keyboardThread;
pthread_t logThread;

// general settings
int gVerbose		= 0;        			// verbose flag
bool forceKeyboard 	= false;				// activate/deactivate keyboard control
bool forceSensors	= true;		    		// activate/deactivate sensor control
bool forceLog		= false;				// activate/deactivate log on boot partition
bool useSD   		= false;    			// activate/deactivate file loading from SD [as opposed to emmc]
bool useAudioTest   = false;    			// activate/deactivate sensors and test audio only

// audio settings
unsigned int gPeriodSize = 8;				// period size for audio
char* gPartialFilename = 0;					// name of the partials file to load
bool gAudioIn = true;						// stereo audio in status

int touchSensor0Address = 0x18;				// I2C addresses of touch sensors
int touchSensor1Address = 0x19;
int sensorType = 2;

char sdPath[256]			= "/dev/mmcblk0p2";			// system path of the SD, partition 2
char mountPath[256]			= "/root/d-box/usersounds";	// mount point of SD partition 2 [where user files are]
char gUserDirName[256] 		= "usersounds";				// Directory in which user analysis files can be found [dir of mountPath]
char gDefaultDirName[256] 	= ".";		// Directory in which built in analysis files can be found
char *gDirName;
bool gIsLoading 			= false;
int fileCnt 				= 0;
std::vector <std::string> files;

char gId	= 'f';	// from 0 to 14, hexadecimal [0-d]! f means not set
char gGroup	= '2';	// 0 is no info, 1 info.   2 is not set

// audio in filter
extern ne10_float32_t *filterState[2];
extern ne10_float32_t *filterIn[2];
extern ne10_float32_t *filterOut[2];

struct arg_data
{
   int  argc;
   char **argv;
};

arg_data args;


int readFiles()
{
	if(useSD)
		gDirName = gUserDirName;
	else
		gDirName = gDefaultDirName;
	DIR *dir;
	struct dirent *ent;

	// From http://stackoverflow.com/questions/612097/how-can-i-get-a-list-of-files-in-a-directory-using-c-or-c
	if ((dir = opendir (gDirName)) != NULL) {
		/* print all the files and directories within directory */
		while ((ent = readdir (dir)) != NULL) {
			// Ignore dotfiles and . and .. paths
			if(!strncmp(ent->d_name, ".", 1))
				continue;

			//printf("%s\n", ent->d_name);

			// take only .dbx and .txt files
			string name = string(ent->d_name);
			int len		= name.length();

			bool dboxFile = false;

			if( (name[len-4]=='.') && (name[len-3]=='d') && (name[len-2]=='b') && (name[len-1]=='x') )
				dboxFile = true;
			if( (name[len-4]=='.') && (name[len-3]=='t') && (name[len-2]=='x') && (name[len-1]=='t') )
				dboxFile = true;

			if(dboxFile)
			{
				fileCnt++;
				//printf("%s\n", ent->d_name);
				files.push_back( std::string( ent->d_name ) );
			}
		}
		closedir (dir);
	} else {
		/* could not open directory */
		fprintf(stderr, "Could not open directory %s\n", gDirName);
		return 1;
	}

	// order by name
	std::sort( files.begin(), files.end() );

	if(fileCnt==0)
	{
		fprintf(stderr, "No .dbx or .txt files in %s!\n", gDirName);
		return 1;
	}

	return 0;
}

/* Load sounds from the directory */
void loadAudioFiles(bool loadFirstFile)
{
	char fullFileName[256];

	if(loadFirstFile) {
		strcpy(fullFileName, gDirName);
		strcat(fullFileName, "/");
		strncat(fullFileName, files[0].c_str(), 255 - strlen(gDirName));
		printf("Loading first file %s...\n", fullFileName);
		DboxOscillatorBank *bank = new DboxOscillatorBank(fullFileName);
		if(bank->initBank(oscBnkOversampling)) {
			bank->setLoopHops(100, bank->getLastHop());
			gOscBanks.push_back(bank);
		}
	}

	else {
		for(int i=1; i<fileCnt; i++){
			strcpy(fullFileName, gDirName);
			strcat(fullFileName, "/");
			strncat(fullFileName, files[i].c_str(), 255 - strlen(gDirName));
			printf("Loading file %s...\n", fullFileName);
			DboxOscillatorBank *bank = new DboxOscillatorBank(fullFileName);
			if(bank->initBank(oscBnkOversampling)) {
				bank->setLoopHops(100, bank->getLastHop());
				gOscBanks.push_back(bank);
			}
		}
	}
}

// adapted from http://program-nix.blogspot.co.uk/2008/08/c-language-check-filesystem-is-mounted.html
int checkIfMounted (char * dev_path)
{
	FILE * mtab				= NULL;
	struct mntent * part	= NULL;
	int is_mounted			= 0;

	if ( ( mtab = setmntent ("/etc/mtab", "r") ) != NULL)
	{
		while ( ( part = getmntent ( mtab) ) != NULL)
		{
			if ( ( part->mnt_fsname != NULL ) && ( strcmp ( part->mnt_fsname, dev_path ) ) == 0 )
			   is_mounted = 1;
		}
	endmntent(mtab);
	}
	return is_mounted;
}

int mountSDuserPartition()
{
	if(checkIfMounted(sdPath))
	{
		printf("device %s already mounted, fair enough, let's move on\n", sdPath);
		return 0;
	}
	// if mount rootfs from SD [rootfs eMMC not used] or from eMMC via properly formatted SD [SD rootfs used as storage volume]
	// we always use rootfs on SD as storage volume ----> "/dev/mmcblk0p2"
	int ret = mount(sdPath, "/root/d-box/usersounds", "vfat",  0, NULL);
	if (ret!=0)
	{
			printf("Error in mount...%s\n", strerror(ret));
			return 1;
	}
	return 0;
}

int initSoundFiles()
{
	if(gVerbose==1)
		cout << "---------------->Init Audio Thread" << endl;

	if(useSD)
	{
		// mount the SD partition where user sounds are located
		// [this is p2, p1 is already mounted and we will log data there]
		if(mountSDuserPartition()!=0)
			return -1;
	}

	gIsLoading = true;

	// read files from SD and order them alphabetically
	if(readFiles()!=0)
		return 1;

	// load first file into oscBank
	loadAudioFiles(true);

	return 0;
}

//---------------------------------------------------------------------------------------------------------

// Handle Ctrl-C
void interrupt_handler(int var)
{
	// kill keyboard thread mercilessly
	if(forceKeyboard)
		pthread_cancel(keyboardThread);

	gShouldStop = true;
}


void parseArguments(arg_data args, BelaInitSettings *settings)
{
	// Default filename;
	gPartialFilename = strdup("D-Box_sound_250_60_40_h88_2.txt");

	const int kOptionAudioTest = 1000;

	// TODO: complete this
	struct option long_option[] =
	{
		{"help", 0, NULL, 'h'},
		{"audioin", 1, NULL, 'i'},
		{"file", 1, NULL, 'f'},
		{"keyboard", 1, NULL, 'k'},
		{"audio-test", 0, NULL, kOptionAudioTest},
		{"sensor-type", 1, NULL, 't'},
		{"sensor0", 1, NULL, 'q'},
		{"sensor1", 1, NULL, 'r'},
		{"log", 1, NULL, 'l'},
		{"usesd", 1, NULL, 'u'},
		{"oversamp", 1, NULL, 'o'},
		{"boxnumber", 1, NULL, 'n'},
		{"group", 1, NULL, 'g'},
		{NULL, 0, NULL, 0},
	};
	int morehelp = 0;
	int tmp = -1;

	Bela_defaultSettings(settings);
	settings->setup = setup;
	settings->render = render;
	settings->cleanup = cleanup;

	while (1)
	{
		int c = Bela_getopt_long(args.argc, args.argv, "hf:ki:sq:r:t:l:u:o:n:g:", long_option, settings);
		if (c < 0)
			break;
		switch (c)
		{
			case 'h':
				morehelp++;
				break;
			case 'f':
				free(gPartialFilename);
				gPartialFilename = strdup(optarg);
				break;
			case 'k':
				forceKeyboard = true;
				break;
			case 'i':
				gAudioIn = (atoi(optarg)==0) ? false : true;
				break;
			case 's':
				forceSensors = true;
				break;
			case kOptionAudioTest:
				useAudioTest = true;
				break;
			case 't':
				sensorType = atoi(optarg);
				break;
			case 'q':
				touchSensor0Address = atoi(optarg);
				break;
			case 'r':
				touchSensor1Address = atoi(optarg);
				break;
			case 'l':
				tmp = atoi(optarg);
				if(tmp==0)
					forceLog = false;
				else if(tmp>0)
					forceLog = true;
				break;
			case 'u':
				tmp = atoi(optarg);
				if(tmp==0)
					useSD = false;
				else if(tmp>0)
					useSD = true;
				break;
			case 'o':
				oscBnkOversampling = atoi(optarg);
				break;
			case 'n':
				gId = *optarg;
				cout << "-set box number to: " << gId << endl;
				break;
			case 'g':
				gGroup = *optarg;
				cout << "-set group to: " << gId << endl;
				break;
			default:
				break;
		}
	}

	gPeriodSize = settings->periodSize;
	gVerbose = settings->verbose;
}

int main(int argc, char *argv[])
{
	BelaInitSettings* settings = Bela_InitSettings_alloc();	// Standard audio settings
	AuxiliaryTask rtSensorThread;
	const char rtSensorThreadName[] = "dbox-sensor";
	int oscBankHopSize;

	// Parse command-line arguments
	args.argc = argc;
	args.argv = argv;
	parseArguments(args, settings);

	Bela_setVerboseLevel(gVerbose);
	if(gVerbose == 1 && useAudioTest)
		cout << "main() : running in audio test mode" << endl;

	// Load sound files from directory
	if(initSoundFiles() != 0)
		return 1;

	oscBankHopSize = gOscBanks[gCurrentOscBank]->getHopSize()/gOscBanks[gCurrentOscBank]->getMinSpeed();

	// Initialise the audio device
	if(Bela_initAudio(settings, &oscBankHopSize) != 0) {
		Bela_InitSettings_free(settings);
		return 1;
	}
	Bela_InitSettings_free(settings);
	
	// Initialise the status LED
	if(!gStatusLED.init(kStatusLEDPin)) {
		if(gVerbose)
			cout << "Couldn't initialise status LED pin\n";
	}

	// Free file name string which is no longer needed
	if(gPartialFilename != 0)
		free(gPartialFilename);

	if(!useAudioTest) {
		if(initSensorLoop(touchSensor0Address, touchSensor1Address, sensorType) != 0)
			return 1;
	}

	if(gVerbose == 1)
		cout << "main() : creating audio thread" << endl;

	if(Bela_startAudio()) {
		cout << "Error: unable to start real-time audio" << endl;
		return 1;
	}

	// LED on...
	gStatusLED.on();

	if(forceSensors && !useAudioTest) {
		if(gVerbose==1)
			cout << "main() : creating control thread" << endl;

		rtSensorThread = Bela_createAuxiliaryTask(&sensorLoop, BELA_AUDIO_PRIORITY - 5, rtSensorThreadName, NULL);
		if(rtSensorThread  == 0)
		{
			  cout << "Error:unable to create Xenomai control thread" << endl;
			  return 1;
		}

		Bela_scheduleAuxiliaryTask(rtSensorThread);
	}

	if(forceKeyboard) {
		if(gVerbose==1)
			cout << "main() : creating keyboard thread" << endl;

		if ( pthread_create(&keyboardThread, NULL, keyboardLoop, NULL) ) {
		  cout << "Error:unable to create keyboard thread" << endl;
		  return 1;
		}
	}

	if(forceLog) {
		if(gVerbose==1)
			cout << "main() : creating log thread" << endl;

		if(initLogLoop()!=0) {
			cout << "Error:unable to create log thread" << endl;
			return 1;
		}

		if ( pthread_create(&logThread, NULL, logLoop, NULL) ) {
		  cout << "Error:unable to create keyboard thread" << endl;
		  return 1;
		}
	}

	// Set up interrupt handler to catch Control-C and SIGTERM
	signal(SIGINT, interrupt_handler);
	signal(SIGTERM, interrupt_handler);

	// load all other files into oscBanks
	loadAudioFiles(false);
	cout << "Finished loading analysis files\n";
	gIsLoading = false;

	// Run until told to stop
	while(!gShouldStop) {
		usleep(100000);
	}

	Bela_stopAudio();

	Bela_cleanupAudio();

	pthread_join( keyboardThread, NULL);
	pthread_join( logThread, NULL);

	for(unsigned int i = 0; i < gOscBanks.size(); i++)
		delete gOscBanks[i];

	NE10_FREE(filterState[0]);
	NE10_FREE(filterState[1]);
	NE10_FREE(filterIn[0]);
	NE10_FREE(filterIn[1]);
	NE10_FREE(filterOut[0]);
	NE10_FREE(filterOut[1]);

	printf("Program ended\nBye bye\n");
	return 0;
}
