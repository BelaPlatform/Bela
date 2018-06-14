#include <stdio.h>
#include <string.h>
#include "../include/Bela.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>

static const int EEPROM_NUMCHARS = 30;
static char eeprom_str[EEPROM_NUMCHARS];
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

std::vector<std::string> split(const std::string& s, char delimiter)
{
	std::vector<std::string> tokens;
	std::string token;
	std::istringstream tokenStream(s);
	while (std::getline(tokenStream, token, delimiter))
	{
		tokens.push_back(token);
	}
	return tokens;
}

std::string trim(std::string const& str)
{
    if(str.empty())
        return str;

    std::size_t firstScan = str.find_first_not_of(' ');
    std::size_t first     = firstScan == std::string::npos ? str.length() : firstScan;
    std::size_t last      = str.find_last_not_of(' ');
    return str.substr(first, last - first + 1);
}


static BelaHw parse_belaconfig() {
	char path[] = "/root/.bela/belaconfig";
	std::ifstream inputFile;
	std::string line;
	try
	{
		inputFile.open(path);
		if(inputFile.fail())
		{
			return BelaHw_NoHw;
		}
		while (std::getline(inputFile, line))
		{
			auto vec = split(line, '=');
			if(vec.size() != 2)
				continue;
			if(trim(vec[0]) == "BOARD")
			{
				std::string board = trim(vec[1]);
				if(board == "Bela") {
						return BelaHw_Bela;
				} else if(board == "BelaMini") {
						return BelaHw_BelaMini;
				} else if(board == "Salt") {
						return BelaHw_Salt;
				} else {
					fprintf(stderr, "Unknown BOARD= in %s: %s. Ignoring.\n", path, board.c_str());
				}
			}
		}
	}
	catch(...)
	{
		return BelaHw_NoHw;
	}
	return BelaHw_NoHw;
}

BelaHw Bela_detectHw()
{
	BelaHw hw = parse_belaconfig();
	if(hw != BelaHw_NoHw)
		return hw;
#ifdef CTAG_FACE_8CH
	return BelaHw_CtagFace;
#elif defined(CTAG_BEAST_16CH)
	return BelaHw_CtagBeast;
#endif
	if(is_belamini())
		return BelaHw_BelaMini;
	return BelaHw_Bela;
}

