#pragma once
#include <Bela.h>
#include <vector>
#include <string>
#include <libraries/libpd/libpd.h>

struct BelaLibpdSettings {
	size_t scopeChannels = 4;
	bool useGui = true;
	bool useIoThreaded = true;
	std::vector<std::string> bindSymbols;
	// These callbacks should return 0 if no further processing is needed
	int(*messageHook)(const char *source, const char *symbol, int argc, t_atom *argv) = nullptr;
	int(*floatHook)(const char *source, float value) = nullptr;
	int(*listHook)(const char *source, int argc, t_atom *argv) = nullptr;
};
bool BelaLibpd_setup(BelaContext *context, void *userData, const BelaLibpdSettings& settings);
void BelaLibpd_render(BelaContext *context, void *userData);
void BelaLibpd_cleanup(BelaContext *context, void *userData);
