#include "../include/MiscUtilities.h"
#include <iostream>
#include <fstream>
#include <sstream>

std::vector<std::string> StringUtils::split(const std::string& s, char delimiter)
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

std::string StringUtils::trim(std::string const& str)
{
	if(str.empty())
		return str;

	std::size_t firstScan = str.find_first_not_of(' ');
	std::size_t first = firstScan == std::string::npos ? str.length() : firstScan;
	std::size_t last = str.find_last_not_of(' ');
	return str.substr(first, last - first + 1);
}

int IoUtils::writeTextFile(const std::string& path, const std::string& content, Mode mode)
{
	std::ofstream outputFile;
	system(("bash -c \"mkdir -p `dirname "+path+"`\"").c_str());
	std::ios_base::openmode openmode;
	switch(mode) {
		case APPEND:
			openmode = std::ios_base::app;
			break;
		case TRUNCATE:
			openmode = std::ios_base::trunc;
			break;
	}
	outputFile.open(path.c_str(), openmode);
	if(outputFile.is_open())
	{
		outputFile << content;
		outputFile.close();
		return 0;
	}
	fprintf(stderr, "File %s could not be opened\n.", path.c_str());
	return -1;
}

std::string IoUtils::ConfigFile::readValue(const std::string& path, const std::string& searchStr)
{
	std::ifstream inputFile;
	std::string line;
	inputFile.open(path.c_str());
	if(!inputFile.fail())
	{
		while (std::getline(inputFile, line))
		{
			auto vec = StringUtils::split(line, '=');
			if(vec.size() != 2)
				continue;
			if(StringUtils::trim(vec[0]) == searchStr)
				return StringUtils::trim(vec[1]);
		}
		inputFile.close();
	}
	return "";
}

int IoUtils::ConfigFile::writeValue(const std::string& path, const std::string& key, const std::string& value, Mode mode)
{
	return writeTextFile(path, key + "=" + value + "\n", mode);
}
