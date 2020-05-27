/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io

\example Gui/empty-project

Template Empty Project
======================

Is this project you can find a sketch.js file which is a p5.js file that is rendered
in a browser tab. Click the GUI button (next to the Scope button) in the IDE to see the rendering of this file.

This sketch provides you with the bare-bones that you need to get started with the Bela GUI.
The render function is empty so nothing is really happening in the audio thread. However, the gui has been setup and
a basic p5 sketch has been included in the project.

Run the project and open the GUI tab to see its contents.
*/

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
