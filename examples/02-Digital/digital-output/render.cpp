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

bool setup(BelaContext *context, void *userData)
{
    pinMode(context, 0, P8_07, OUTPUT);
	return true;
}

void render(BelaContext *context, void *userData)
{
  static int count=0; //counts elapsed samples
  float interval=0.5; //how often to toggle the LED (in seconds)
  static int status=GPIO_LOW;
	for(unsigned int n=0; n<context->digitalFrames; n++){
    if(count==context->digitalSampleRate*interval){ //if enough samples have elapsed
      count=0; //reset the counter
      if(status==GPIO_LOW) { //toggle the status
          digitalWrite(context, n, P8_07, status); //write the status to the LED
          status=GPIO_HIGH;
      }
      else {
          digitalWrite(context, n, P8_07, status); //write the status to the LED
          status=GPIO_LOW;
      }
    }
    count++;
  }
}

void cleanup(BelaContext *context, void *userData)
{
	// Nothing to do here
}


/**
\example digital-output/render.cpp

Blinking an LED
---------------

This sketch shows the simplest case of digital out. 

- Connect an LED in series with a 470ohm resistor between P8_07 and ground. 

The led is blinked on and off by setting the digital pin `HIGH` and `LOW` every interval seconds which is set in 
`render()`.

In `setup()` the pin mode must be set to output mode via `pinMode()`. For example: 
`pinMode(context, 0, P8_07, OUTPUT)`. 
In `render()` the output of the digital pins is set by `digitalWrite()`. For example: 
`digitalWrite(context, n, P8_07, status)` where `status` can be equal to 
either `HIGH` or `LOW`. When set `HIGH` the pin will give 3.3V, when set to 
`LOW` 0V.

Note that there are two ways of specifying the digital pin: using the GPIO label (e.g. `P8_07`), or using the digital IO index (e.g. 0)

To keep track of elapsed time we have a sample counter count. When the count reaches 
a certain limit it switches state to either `HIGH` or `LOW` depending on its current 
value. In this case the limit is `context->digitalSampleRate*interval` which 
allows us to write the desired interval in seconds, stored in `interval`.
*/

