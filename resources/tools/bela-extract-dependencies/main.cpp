#include <MiscUtilities.h>
#include <stdio.h>
#include <set>

static std::vector<std::string> getLibraryDependencies(const std::string& belaHome, const std::string& library)
{
	std::string path = belaHome + "/libraries/" + library + "/lib.metadata";
	std::string val = ConfigFileUtils::readValue(path, "dependencies");
	// printf("For %s found: %s\n", path.c_str(), val.c_str());
	return StringUtils::split(val, ' ', true);
}

static void usage(char** argv)
{
	fprintf(stderr, "Usage: %s <Bela-root> <libraries...>\n", argv[0]);
}

int main(int argc, char** argv)
{
	if(argc < 2)
	{
		usage(argv);
		return 1;
	}
	if(argc < 3) // no libraries
		return 0;
	std::string belaHome = argv[1];
	if(!IoUtils::pathExists(belaHome))
	{
		fprintf(stderr, "Invalid <Bela-root>\n");
		usage(argv);
		return 1;
	}
	std::set<std::string> libs;
	for(int n = 2; n < argc; ++n)
		libs.insert(StringUtils::trim(argv[n]));
	std::set<std::string> checkedLibs;
	do {
		std::string library;
		// at every iteration we look for a library that we haven't yet checked.
		// Not the most elegant, but better than recursive.
		for(auto& l : libs)
		{
			if(0 == checkedLibs.count(l))
				library = l;
		}
		if("" == library)
			break;
		checkedLibs.insert(library);
		auto deps = getLibraryDependencies(belaHome, library);
		for(auto& d : deps)
			libs.insert(d);
	} while (libs != checkedLibs);
	for(auto& l : libs)
		printf("%s\n", l.c_str());
	return 0;
}

