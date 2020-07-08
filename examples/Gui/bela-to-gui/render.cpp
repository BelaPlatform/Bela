/*
 ____  _____ _        _
| __ )| ____| |      / \
|  _ \|  _| | |     / _ \
| |_) | |___| |___ / ___ \
|____/|_____|_____/_/   \_\
http://bela.io
*/
/**
\example Gui/bela-to-gui/render.cpp

Sending from Bela to the GUI
============================

This project is a minimal example of how to send data buffers from Bela to p5.js.
You can find a sketch.js file which is a p5.js file that is rendered
in a browser tab. Click the GUI button (next to the Scope button) in the IDE to see the rendering of this file.
The p5.js file receives a buffer from Bela and displays the received data.

This example sends a buffer of data from the Bela render to the browser via a web socket:
```
gui.sendBuffer(0, gNumber);
```
where the first argument (0) is the index of the buffer to be read in sketch.js, and second argument is the element
to be sent (in this case, just an int value).
*/

#include <Bela.h>
#include <libraries/Gui/Gui.h>



// GUI object declaration
Gui gui;

// Time period (in seconds) after which gNumber will be updated and sent
float gTimePeriod = 1;
//value to be sent in the buffer
int gNumber = 0;


bool setup(BelaContext *context, void *userData)
{
	//Setup the GUI
	gui.setup(context->projectName);

	return true;
}

void render(BelaContext *context, void *userData)
{
	//We create an auxiliary counter variable that will indicate when to send the buffer
	static unsigned int count = 0;

	for(unsigned int n = 0; n < context->audioFrames; n++) {

		//count will increase at each audio frame by one
		count++;

		//only when count reaches context->audioSampleRate (generally 44100)
		//then gNumber will be updated and sent
		if (count >= gTimePeriod*context->audioSampleRate)
		{
		    gNumber++;
			gui.sendBuffer(0, gNumber);

			//and we reset the counter
			count = 0;
		}

	}

}

void cleanup(BelaContext *context, void *userData)
{

}
