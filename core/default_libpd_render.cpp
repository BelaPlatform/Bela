#include <Bela.h>
#include <libraries/BelaLibpd/BelaLibpd.h>

void Bela_userSettings(BelaInitSettings *settings)
{
	settings->uniformSampleRate = 1;
	settings->interleave = 0;
	settings->analogOutputsPersist = 0;
}

bool setup(BelaContext *context, void *userData)
{
	return BelaLibpd_setup(context, userData, {});
}

void render(BelaContext *context, void *userData)
{
	BelaLibpd_render(context, userData);
}

void cleanup(BelaContext *context, void *userData)
{
	BelaLibpd_cleanup(context, userData);
}
