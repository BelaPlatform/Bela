#include <stdio.h>
#include <string.h>
#include "../include/Bela.h"

#define EEPROM_NUMCHARS 30
char eeprom_str[EEPROM_NUMCHARS];

static void read_eeprom(){
	FILE* fp;
	fp = fopen("/sys/devices/platform/ocp/44e0b000.i2c/i2c-0/0-0050/eeprom", "r");
	if (fp == NULL){
		fprintf(stderr, "could not open EEPROM for reading\n");
		return;
	}
	int ret = fread(eeprom_str, sizeof(char), EEPROM_NUMCHARS, fp);
	if (ret != EEPROM_NUMCHARS){
		fprintf(stderr, "could not read EEPROM\n");
	}
	fclose(fp);
}

static int is_belamini(){
	read_eeprom();
	if (strstr(eeprom_str, "A335PBGL") != NULL){
		return 1;
	}
	return 0;
}

BelaHw Bela_detectHw()
{
#ifdef CTAG_FACE_8CH
	return BelaHw_CtagFace;
#elif defined(CTAG_BEAST_16CH)
	return BelaHw_CtagBeast;
#endif
	if(is_belamini())
		return BelaHw_BelaMiniCape;
	return BelaHw_BelaCape;
}

