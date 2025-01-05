#include "../include/MiscUtilities.h"
#include <array>
#include <iostream>
#include <fstream>
#include <sstream>
#include <sys/stat.h>
#include <glob.h>
#include <string.h>

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
			if(left.str().size())
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
	if(st.size() >= 2 && '0' == st[0] && 'x' == st[1])
		base = 16;
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
	if("" == StringUtils::trim(path))
		return -2;
	std::ofstream outputFile = openOutput(path, mode);
	if(outputFile.is_open())
	{
		outputFile << content;
		if(!outputFile.good())
		{
			fprintf(stderr, "File %s is no longer good after writing to it\n.", path.c_str());
			return -1;
		}
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

std::vector<std::string> glob(const std::string& pattern)
{
	// see https://stackoverflow.com/a/8615450/2958741
	glob_t glob_result = {0};
	int return_value = glob(pattern.c_str(), GLOB_TILDE, NULL, &glob_result);
	if(return_value != 0) {
		globfree(&glob_result);
		return {};
	}
	std::vector<std::string> filenames;
	size_t numPaths = glob_result.gl_pathc;
	filenames.reserve(numPaths);
	for(size_t i = 0; i < numPaths; ++i) {
		filenames.push_back(glob_result.gl_pathv[i]);
	}
	globfree(&glob_result);
	return filenames;
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

#include <execinfo.h>
#include <unistd.h>
#include <regex>
#include <limits.h>

namespace ProcessUtils
{

int runCmd(std::string cmd, std::string& out)
{
	std::array<char,512> buffer;
	out = "";
	FILE* pipe = popen(cmd.c_str(), "r");
	if(!pipe)
	{
		fprintf(stderr, "popen(%s, %s) failed\n", cmd.c_str(), "r");
		return -2;
	}
	while(!feof(pipe))
	{
		if(fgets(buffer.data(), buffer.size(), pipe) != nullptr)
			out += buffer.data();
	}
	return pclose(pipe);
}

std::string getExecPath()
{
	char result[PATH_MAX];
	ssize_t count = readlink("/proc/self/exe", result, PATH_MAX);
	if(count <= 0)
		return "";
	return std::string(result, (count > 0) ? count : 0);
}

// From https://stackoverflow.com/a/51890324/2958741
std::string getBacktrace(unsigned int ignore)
{
	void* bt[1024];
	int bt_size = backtrace(bt, sizeof(bt));
	char** bt_syms = backtrace_symbols(bt, bt_size);
	std::regex re("\\[(.+)\\]");
	std::string exec_path = getExecPath();
	// start and end offsets in the loop below
	// are to get rid of seemingly spurious entries
	std::string cmd = "addr2line -e " + exec_path + " -i -s -p -f -C";
	for(int i = 1 + ignore; i < bt_size - 1; i++)
	{
		std::string sym = bt_syms[i];
		std::smatch ms;
		if(std::regex_search(sym, ms, re)) {
			std::string addr = ms[1];
			cmd += " " + addr;
		}
	}
	// execute command and get its output
	std::string r;
	int ret = runCmd(cmd, r);
	if(ret)
		return "";
	r = std::regex_replace(r, std::regex("\\n$"), "");
	r = std::regex_replace(r, std::regex("^"), "  ");
	r = std::regex_replace(r, std::regex("\\n"), "\n  ");
	r = std::regex_replace(r, std::regex("\\(discriminator [0-9]+\\)"), "");
	free(bt_syms);
	return r;
}

} // ProcessUtils

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
