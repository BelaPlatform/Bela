#include "../include/MiscUtilities.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <sys/stat.h> // mkdir, stat

using namespace StringUtils;
using namespace IoUtils;
using namespace ConfigFileUtils;
namespace StringUtils
{
std::vector<std::string> split(const std::string& s, char delimiter, bool removeEmpty, unsigned int limit)
{
	std::vector<std::string> tokens;
	std::string token;
	std::istringstream tokenStream(s);
	while (std::getline(tokenStream, token, delimiter))
	{
		if(removeEmpty && "" == token)
			continue;
		tokens.push_back(token);
		if(limit && tokens.size() == limit - 1)
		{
			// if we reached the limit, put everything that's left
			// in the final token
			std::stringstream left;
			left << tokenStream.rdbuf();
			tokens.push_back(left.str());
			break;
		}
	}
	return tokens;
}

std::string trim(std::string const& str)
{
	if(str.empty())
		return str;

	char spaces[] = " \n\r\t\0";
	std::size_t firstScan = str.find_first_not_of(spaces);
	std::size_t first = firstScan == std::string::npos ? str.length() : firstScan;
	std::size_t last = str.find_last_not_of(spaces);
	return str.substr(first, last - first + 1);
}


long long int parseAsInt(std::string const& str)
{
	std::string st = trim(str);
	int base = 10;
	unsigned int offset = 0;
	if(st.size() >= 2 && '0' == st[0] && 'x' == st[1])
	{
		offset = 2;
		base = 16;
	}
	return strtoll(st.c_str(), NULL, base);
}

std::vector<char*> makeArgv(std::vector<std::string>& strings)
{
	std::vector<char*> out;
	out.push_back(nullptr);
	for(auto& s : strings) {
		out.push_back(&s[0]);
	}
	return out;
}
} // StringUtils

namespace IoUtils
{

bool pathExists(const std::string& path)
{
	// https://www.systutorials.com/how-to-test-a-file-or-directory-exists-in-c/
	struct stat buffer;
	return (stat (path.c_str(), &buffer) == 0);
}

std::ofstream openOutput(const std::string& path, Mode mode)
{
	std::ofstream outputFile;
	std::vector<std::string> tokens = split(path, '/');
	std::string dir = "";
	for(size_t n = 0; n < tokens.size() - 1; ++n) // all but the last one
		dir += tokens[n] + "/";
	if(dir.size() && !pathExists(dir)) {
		if(mkdir(dir.c_str(), 0777)) // First use of octal in C!
			return std::ofstream(); // or throw?
	}
	std::ios_base::openmode openmode;
	switch(mode) {
		case APPEND:
			openmode = std::ios_base::app;
			break;
		case TRUNCATE:
		default:
			openmode = std::ios_base::trunc;
			break;
	}
	outputFile.open(path.c_str(), openmode);
	return outputFile;
}

int writeTextFile(const std::string& path, const std::string& content, Mode mode)
{
	std::ofstream outputFile = openOutput(path, mode);
	if(outputFile.is_open())
	{
		outputFile << content;
		return 0;
	}
	fprintf(stderr, "File %s could not be opened\n.", path.c_str());
	return -1;
}

std::string readTextFile(const std::string& path)
{
	// https://stackoverflow.com/a/57973715/2958741
	std::ifstream in;
	try
	{
		// Set to throw on failure
		in.exceptions(std::fstream::failbit | std::fstream::badbit);
		in.open(path);
	}
	catch (std::exception&)
	{
		return "";
	}

	std::stringstream out;
	out << in.rdbuf();
	return out.str();
}

} // IoUtils

namespace ConfigFileUtils
{

static std::string readValueFromLine(const std::string& line, const std::string& key)
{
	auto vec = split(line, '=', false, 2);
	if(vec.size() == 2 && trim(vec[0]) == key)
		return trim(vec[1]);
	return "";
}

std::string readValue(const std::string& path, const std::string& key)
{
	std::ifstream inputFile;
	std::string line;
	inputFile.open(path.c_str());
	std::string found;
	if(!inputFile.fail())
	{
		while (std::getline(inputFile, line))
		{
			std::string ret = readValueFromLine(line, key);
			if("" != ret)
				found = ret;
		}
		inputFile.close();
	}
	return found;
}

std::string readValueFromString(const std::string& str, const std::string& key)
{
	std::vector<std::string> lines = split(str, '\n');
	std::string found;
	for(auto& line : lines) {
		std::string ret = readValueFromLine(line, key);
		if("" != ret)
			found = ret;
	}
	return found;
}

int writeValue(const std::string& path, const std::string& key, const std::string& value, Mode mode)
{
	return writeTextFile(path, key + "=" + value + "\n", mode);
}

} // ConfigFileUtils

namespace PinmuxUtils
{
	static std::string makePath(const std::string& pin)
	{
		return "/sys/devices/platform/ocp/ocp:" + pin + "_pinmux/state";
	}

	bool check(const std::string& pin, const std::string& desiredState)
	{
		return get(pin) == StringUtils::trim(desiredState);
	}

	std::string get(const std::string& pin)
	{
		return StringUtils::trim(IoUtils::readTextFile(makePath(pin)));
	}

	void set(const std::string& pin, const std::string& desiredState)
	{
		// echo $MODE > /sys/devices/platform/ocp/ocp:$PIN_pinmux/state
		IoUtils::writeTextFile(makePath(pin), desiredState);
	}
}; // PinmuxUtils
