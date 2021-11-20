#include <Bela.h>
#include <stdio.h>
#include <string>
#include <vector>
#include "../../../include/board_detect.h"

static void printHelp(const char* command)
{
	fprintf(stderr, "Detect the board we are running on.\n"
		"Usage:\n"
		"  %s <parameter>\n"
		"Where <parameter> is one of:\n"
		"   scan\n"
		"   cache\n"
		"   cacheOnly\n"
		"   user    (default)\n"
		"   userOnly\n"
		"   all\n"
		"   help\n"
		"Each of these (except for `help' and `all') has the same role as the corresponding argument to `Bela_detectHw()' (see `Bela.h' for details). `all' performs each of the others in turn and prints all of the results in order\n", command);
}


int main(int argc, char* argv[])
{
	char* lastArg = nullptr;
	if(argc > 1)
		lastArg = argv[argc - 1];
	std::vector<BelaHwDetectMode> modes;
	if(lastArg)
	{
		std::string str(lastArg);
		if("scan" == str)
			modes.push_back(BelaHwDetectMode_Scan);
		else if("cache" == str)
			modes.push_back(BelaHwDetectMode_Cache);
		else if("cacheOnly" == str)
			modes.push_back(BelaHwDetectMode_CacheOnly);
		else if("user" == str)
			modes.push_back(BelaHwDetectMode_User);
		else if("userOnly" == str)
			modes.push_back(BelaHwDetectMode_UserOnly);
		else if("all" == str) {
			modes.push_back(BelaHwDetectMode_Scan);
			modes.push_back(BelaHwDetectMode_Cache);
			modes.push_back(BelaHwDetectMode_CacheOnly);
			modes.push_back(BelaHwDetectMode_User);
			modes.push_back(BelaHwDetectMode_UserOnly);
		} else if("help" == str || "--help" == str) {
			printHelp(argv[0]);
			return 0;
		} else {
			fprintf(stderr, "Error: parameter `%s' invalid.\n", str.c_str());
			printHelp(argv[0]);
			return 2;
		}
	}
	int ret = 0;
	if(0 == modes.size())
		modes.push_back(BelaHwDetectMode_User);
	for(auto& mode : modes)
	{
		BelaHw hw = Bela_detectHw(mode);
		printf("%s\n", getBelaHwName(hw).c_str());
		if(BelaHw_NoHw == hw)
			ret = 1;
		ret = 0;
	}
	if(modes.size() > 1)
		return 0;
	else return ret;
}

