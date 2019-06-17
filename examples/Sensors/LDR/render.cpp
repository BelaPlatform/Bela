/*
 ____  _____ _        _    
| __ )| ____| |      / \   
|  _ \|  _| | |     / _ \  
| |_) | |___| |___ / ___ \ 
|____/|_____|_____/_/   \_\

The platform for ultra-low latency audio and sensor processing

http://bela.io

A project of the Augmented Instruments Laboratory within the
Centre for Digital Music at Queen Mary University of London.
http://www.eecs.qmul.ac.uk/~andrewm

(c) 2016 Augmented Instruments Laboratory: Andrew McPherson,
  Astrid Bin, Liam Donovan, Christian Heinrichs, Robert Jack,
  Giulio Moro, Laurel Pardue, Victor Zappi. All rights reserved.

The Bela software is distributed under the GNU Lesser General Public License
(LGPL 3.0), available here: https://www.gnu.org/licenses/lgpl-3.0.txt
*/

#include <Bela.h>
#include <stdlib.h>

float gLDR;
float gNoise;

// replace these values with thresholds for dark and light
float gDark = 0.0;
float gLight = 1.0;

// sample counter to print current LDR reading
int gSampleCount = 0;
int gAudioFramesPerAnalogFrame = 0;

bool setup(BelaContext *context, void *userData)
{
	if(!context->analogInChannels)
	{
		fprintf(stderr, "Error: This example requires analog inputs to be enabled");
		return false;
	}
	if(context->analogSampleRate > context->audioSampleRate)
	{
		fprintf(stderr, "Error: for this project the sampling rate of the analog inputs has to be <= the audio sample rate\n");
		return false;
	}
	if(context->analogFrames)
		gAudioFramesPerAnalogFrame = context->audioFrames / context->analogFrames;

	return true;
}

void render(BelaContext *context, void *userData)
{
   
    for(unsigned int n = 0; n < context->audioFrames; n++) {

        if(gAudioFramesPerAnalogFrame && !(n % gAudioFramesPerAnalogFrame)) {
            // read and map the LDR
            gLDR = map(analogRead(context, n, 1), gDark, gLight, 0.0, 0.5);
        }
        
        /*
        // Uncomment the below code to print the LDR reading to the console
        // to set the thresholds
        if(!n%2){
            if(gSampleCount >= 44100) {
                rt_printf("%f\n", analogRead(context, n, 1));
                gSampleCount = 0;
            }
        }
        gSampleCount++;
        */
        
        // generate some noise with random number generator
        gNoise = 0.1f * ( rand() / (float)RAND_MAX * 2.f - 1.f);
        
        for(unsigned int channel = 0; channel < context->audioOutChannels; channel++) {
             // output the noise multiplied by the LDR reading
             audioWrite(context, n, channel, gNoise*gLDR);
        }
        
    }

}

void cleanup(BelaContext *context, void *userData)
{

}

/**
\example LDR/render.cpp

Using light as a controller
----------------------------------------

This example demonstrates how to hook up a Light Dependent Resistor
(LDR), also know as a photo-resistor, and use it to control the 
volume of white noise. If you run this project straight away 
after connecting up the LDR you will notice that the LDR reacts 
to changes in the light condition but in a pretty unsatisfying way. 
This is because we need to set the thresholds of the `map()` function 
based on the ambient light condition.

To begin let's connect the LDR.

- connect one leg of the LDR to 3.3V
- connect the other leg of the LDR to analog input 1
- connect one leg of a 10KOhm resistor to this leg of the LDR as well
- connect the other leg of the resistor to ground
  
The resistance of the LDR changes depending on the amount of light
it receives (more light -> less resistance). To measure this change in
resistance we need a fixed value resistor (10kOhms in this example) to 
compare the reading with. This is know as a voltage divider circuit.
The 3.3V will be shared between the two resistors: how much of a share 
of voltage each of the resistors take is proportional to their 
resistances. As the resistance of the LDR changes the amount of voltage 
on each resistor changes and we can measure this change to tell how 
much light the LDR is receiving.

In order to use the LDR as a volume control we need to set the thresholds
for ambient light and for when it has a bright light shone close to it.
To do this comment out this section of code in `render()`:

````
if(!n%2){
    if(gSampleCount >= 44100) {
        rt_printf("%f\n", analogRead(context, n, 1));
        gSampleCount = 0;
    }
}
gSampleCount++;
````

This prints the value of the LDR reading to the console once a second.
Now you can set the variables `gDark` and `gLight` with the reading 
of ambient light in the room and with the reading when a torch is
shone directly at the LDR. Update the variables, re-comment out the code and
run the example. Now you should be able to bring the white noise from
silence to full volume depending on the amount light.

Note that when you cover the LDR you should also hear an increase in
volume of the white noise. This is because the `map()` function is not
constrained which means that it outputs negative number when it gets
darker than the threshold set in `gDark`. To stop this behaviour you
can use the `constrain()` function to force the LDR readings to remain
within a certain range (for example `gDark` to `gLight`).
*/
