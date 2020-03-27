#include <stdio.h>
#include <string.h>
#include "../include/Bela.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <map>
#include "../include/I2c_Codec.h"
#include "../include/Spi_Codec.h"
#include "../include/bela_hw_settings.h"
#include "../include/board_detect.h"

static const std::map<std::string,BelaHw> belaHwMap = {
        {"NoHardware", BelaHw_NoHw},
        {"Bela", BelaHw_Bela},
        {"BelaMini", BelaHw_BelaMini},
        {"Salt", BelaHw_Salt},
        {"CtagFace", BelaHw_CtagFace},
        {"CtagBeast", BelaHw_CtagBeast},
        {"CtagFaceBela", BelaHw_CtagFaceBela},
        {"CtagBeastBela", BelaHw_CtagBeastBela},
        {"BelaMiniMultiAudio", BelaHw_BelaMiniMultiAudio},
        {"BelaMiniMultiTdm", BelaHw_BelaMiniMultiTdm},
};

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
static bool detectTlv32(int bus, int address)
{
	I2c_Codec codec(bus, address, I2c_Codec::TLV320AIC3104);
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
        try {
                return belaHwMap.at(board);
        } catch (std::exception e) {
                return BelaHw_NoHw;
        }
}

std::string getBelaHwName(const BelaHw hardware)
{
        std::string noHw;
        for(const auto & hw : belaHwMap) {
                if(hw.second == hardware)
                        return hw.first;
                else if (BelaHw_NoHw == hw.second)
                        noHw = hw.first;
        }
        return noHw;
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
					fprintf(stderr, "Unknown setting %s= in %s: %s. Ignoring.\n", searchStr.c_str(), path.c_str(), board.c_str());
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

BelaHw Bela_detectHw(const BelaHwDetectMode mode)
{
	if(BelaHwDetectMode_User == mode || BelaHwDetectMode_UserOnly == mode)
	{
		std::string configPath = "/root/.bela/belaconfig";
		BelaHw hw = parse_config_file(configPath, "BOARD");
		if(hw != BelaHw_NoHw)
			return hw;
		if(BelaHwDetectMode_UserOnly == mode)
			return BelaHw_NoHw;
		else
			return Bela_detectHw(BelaHwDetectMode_Cache);
	}

	std::string configPath = "/run/bela/belaconfig";
	if(BelaHwDetectMode_Cache == mode || BelaHwDetectMode_CacheOnly == mode)
	{
		BelaHw hw = parse_config_file(configPath, "HARDWARE");
		if(hw != BelaHw_NoHw)
			return hw;
		if(BelaHwDetectMode_CacheOnly == mode)
			return BelaHw_NoHw;
		else
			return Bela_detectHw(BelaHwDetectMode_Scan);
	}

	BelaHw hw = BelaHw_NoHw;
	if(is_belamini())
	{
		bool hasTlv32[4]; 
		
		for(int i = 0; i < 4; i++) {
			hasTlv32[i] = detectTlv32(codecI2cBus, codecI2cAddress + i);
		}
		
		if(hasTlv32[1] || hasTlv32[2] || hasTlv32[3])
			hw = BelaHw_BelaMiniMultiAudio;
		else if(hasTlv32[0])
			hw = BelaHw_BelaMini;
	}
	else
	{
		int ctag = detectCtag();
		bool hasTlv32 = detectTlv32(codecI2cBus, codecI2cAddress);
		
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

using namespace BelaHwComponent;
/// can I run userHw when I actually have detectedHw?
bool Bela_checkHwCompatibility(BelaHw userHw, BelaHw detectedHw)
{
	if(userHw == BelaHw_Bela && Bela_hwContains(detectedHw, BelaCape))
		return true;
	else if(userHw == BelaHw_CtagFace && Bela_hwContains(detectedHw, CtagCape))
		return true;
	else if(userHw == BelaHw_CtagBeast && 2 == Bela_hwContains(detectedHw, CtagCape))
		return true;
	else if(userHw == BelaHw_Salt && Bela_hwContains(detectedHw, BelaCape))
		return true;
	else if (userHw == BelaHw_BelaMini && Bela_hwContains(detectedHw, BelaMiniCape))
		return true;
	else if (userHw == BelaHw_BelaMiniMultiAudio && Bela_hwContains(detectedHw, BelaMiniCape))
		return true;
	else if (userHw == BelaHw_BelaMiniMultiTdm && Bela_hwContains(detectedHw, BelaMiniCape))
		return true;
	return false;
}

unsigned int Bela_hwContains(const BelaHw hw, const BelaHwComponent::Component component)
{
	switch(component) {
		case BelaCape:
			switch(hw) {
				case BelaHw_Bela:
				case BelaHw_Salt:
				case BelaHw_CtagFaceBela:
				case BelaHw_CtagBeastBela:
					return 1;
				default:
					return 0;
			}
			break;
		case BelaMiniCape:
			switch(hw) {
				case BelaHw_BelaMini:
				case BelaHw_BelaMiniMultiAudio:
				case BelaHw_BelaMiniMultiTdm:
					return 1;
				default:
					return 0;
			}
			break;
		case CtagCape:
			switch(hw) {
				case BelaHw_CtagFace:
				case BelaHw_CtagFaceBela:
					return 1;
				case BelaHw_CtagBeastBela:
				case BelaHw_CtagBeast:
					return 2;
				default:
					return 0;
			}
			break;
		case PocketBeagle:
			return Bela_hwContains(hw, BelaMiniCape);
			break;
		case BeagleBoneBlack:
			return Bela_hwContains(hw, BelaCape) || Bela_hwContains(hw, CtagCape);
			break;
		case Tlv320aic3104:
			return Bela_hwContains(hw, BelaCape) || Bela_hwContains(hw, BelaMiniCape);
			break;
	}
}
