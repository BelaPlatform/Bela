#include <Bela.h>
#include <libraries/Gui/Gui.h>

Gui gui;	

bool setup(BelaContext *context, void *userData)			
{
	gui.setup(context->projectName);
	return true;
}

void render(BelaContext *context, void *userData)
{	

}

void cleanup(BelaContext *context, void *userData)
{

}
