#include <stdio.h>
#include <string.h>
#include "../include/Bela.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include "../include/I2c_Codec.h"
#include "../include/Spi_Codec.h"
#include "../include/bela_hw_settings.h"
#include "../include/board_detect.h"




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

static std::vector<std::string> split(const std::string& s, char delimiter)
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

static std::string trim(std::string const& str)
{
    if(str.empty())
        return str;

    std::size_t firstScan = str.find_first_not_of(' ');
    std::size_t first     = firstScan == std::string::npos ? str.length() : firstScan;
    std::size_t last      = str.find_last_not_of(' ');
    return str.substr(first, last - first + 1);
}

// Returns true if the Tlv32 codec is detected
// Returns false if the Tlv32 codec is not detected
static bool detectTlv32()
{
	I2c_Codec codec(codecI2cBus, codecI2cAddress);
	// I2c_Codec codec(i2cBus, i2cAddress); // get these variable from RTAudio.cpp
	int ret = codec.initCodec();
	if (ret == 0)
		return true;
	else
		return false;
	// http://www.ti.com/lit/ds/symlink/tlv320aic3104.pdf
	// return true if detected, false otherwise
}

// Returns:
//	0 if no Spi codec
//	1 if has only master
//	2 if has both master and slave
static int detectCtag()
{
	Spi_Codec codec(ctagSpidevGpioCs0, ctagSpidevGpioCs1);
	bool masterDetected = codec.masterIsDetected();
	if (masterDetected)
	{
		bool slaveDetected = codec.slaveIsDetected();
		if (slaveDetected)
			return 2; // slave detected
		else
			return 1; // slave not detected
	}
	else
	{
		return 0; // no Spi codec detected
	}
}

BelaHw getBelaHw(std::string board)
{
	BelaHw hw;
	if(board == "Bela")
		hw = BelaHw_Bela;
	else if(board == "BelaMini")
		hw = BelaHw_BelaMini;
	else if(board == "Salt")
		hw = BelaHw_Salt;
	else if(board == "CtagFace")
		hw = BelaHw_CtagFace;
	else if(board == "CtagBeast")
		hw = BelaHw_CtagBeast;
	else if(board == "CtagFaceBela")
		hw = BelaHw_CtagFaceBela;
	else if(board == "CtagBeastBela")
		hw = BelaHw_CtagBeastBela;
	else
		hw = BelaHw_NoHw;
	return hw;
}

std::string getBelaHwName(BelaHw hardware)
{
	std::string hwName;
	switch(hardware)
	{
		case BelaHw_Bela:
			hwName = "Bela";
			break;
		case BelaHw_BelaMini:
			hwName = "BelaMini";
			break;
		case BelaHw_Salt:
			hwName = "Salt";
			break;
		case BelaHw_CtagFace:
			hwName = "CtagFace";
			break;
		case BelaHw_CtagBeast:
			hwName = "CtagBeast";
			break;
		case BelaHw_CtagFaceBela:
			hwName = "CtagFaceBela";
			break;
		case BelaHw_CtagBeastBela:
			hwName = "CtagBeastBela";
			break;
		default:
			hwName = "";
			break;
	}
	return hwName;
}

static BelaHw parse_config_file(std::string path,  std::string searchStr)
{
	std::ifstream inputFile;
	std::string line;
	inputFile.open(path.c_str());
	if(!inputFile.fail())
	{
		while (std::getline(inputFile, line))
		{
			auto vec = split(line, '=');
			if(vec.size() != 2)
				continue;
			if(trim(vec[0]) == searchStr)
			{
				std::string board = trim(vec[1]);
				BelaHw hw = getBelaHw(board);
				if(hw != BelaHw_NoHw)
					return hw;
				else
					fprintf(stderr, "Unknown BOARD= in %s: %s. Ignoring.\n", path.c_str(), board.c_str());
			}
		}
		inputFile.close();
	}
	return BelaHw_NoHw;
}

static int write_config_file(std::string path, BelaHw hardware)
{
	std::ofstream outputFile;
	system(("bash -c \"mkdir -p `dirname "+path+"`\"").c_str());
	outputFile.open(path.c_str());
	if(outputFile.is_open())
	{
		outputFile << "HARDWARE=" << getBelaHwName(hardware);
		outputFile.close();
		return 0;
	}
	fprintf(stderr, "File %s could not be opened\n.", path.c_str());
	return -1;
}

BelaHw Bela_detectHw()
{
	std::string configPath = "/run/bela/belaconfig";
	BelaHw hw = parse_config_file(configPath, "HARDWARE");
	if(hw != BelaHw_NoHw)
		return hw;
	if(is_belamini())
	{
		hw =  BelaHw_BelaMini;
	}
	else
	{
		int ctag = detectCtag();
		bool hasTlv32 = detectTlv32();
		if(ctag == 1)
		{
			if(hasTlv32)
				hw = BelaHw_CtagFaceBela;
			else
				hw = BelaHw_CtagFace;
		}
		else if (ctag == 2)
		{
			if(hasTlv32)
				hw = BelaHw_CtagBeastBela;
			else
				hw = BelaHw_CtagBeast;
		}
		else{
			if(hasTlv32)
				hw = BelaHw_Bela;
		}
	}
	if(hw != BelaHw_NoHw)
		write_config_file(configPath, hw);
	return hw;
}

BelaHw Bela_detectUserHw()
{
	//TODO: Function not implemented yet.
	//This should check for command line options first and
	//check in /root/.bela/belaconfig. 
	std::string configPath = "/root/.bela/belaconfig";
	BelaHw hw = parse_config_file(configPath, "BOARD");
	if(hw != BelaHw_NoHw)
		return hw;
	return BelaHw_NoHw;
}

bool Bela_checkHwCompatibility(BelaHw userHw, BelaHw detectedHw)
{
	if(userHw == BelaHw_Bela &&
			(detectedHw == BelaHw_Bela || detectedHw == BelaHw_CtagFaceBela || detectedHw == BelaHw_CtagBeastBela))
	{
		return true;
	}
	else if(userHw == BelaHw_CtagFace &&
			(detectedHw == BelaHw_CtagBeast || detectedHw == BelaHw_CtagFaceBela|| detectedHw == BelaHw_CtagBeastBela))
	{
		return true;
	}
	else if(userHw == BelaHw_CtagBeast &&
			detectedHw == BelaHw_CtagBeastBela)
	{
		return true;
	}
	else if(userHw == BelaHw_Salt &&
			detectedHw == BelaHw_Bela)
	{
		return true;
	}
	return false;
}
