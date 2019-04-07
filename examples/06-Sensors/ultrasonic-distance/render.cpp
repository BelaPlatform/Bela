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
#include <libraries/Scope/Scope.h>
#include <libraries/PulseIn/PulseIn.h>

PulseIn pulseIn;
Scope scope;
int gTriggerInterval = 2646; // how often to send out a trigger. 2646 samples are 60ms 
int gMinPulseLength = 7; //to avoid spurious readings
float gRescale = 58; // taken from the datasheet
unsigned int gTriggerAnalogOutChannel = 0; //channel to be connected to the module's TRIGGER pin - check the pin diagram in the IDE
unsigned int gEchoDigitalInPin = 1; //channel to be connected to the modules's ECHO pin (digital pin 1) - check the pin diagram in the IDE
int gTriggerCount = 0;
int gPrintfCount = 0;

bool setup(BelaContext *context, void *userData)
{
    // Set the mode of digital pins
    pinMode(context, 0, gEchoDigitalInPin, INPUT); // receiving from ECHO PIN
    pulseIn.setup(context, gEchoDigitalInPin, HIGH); //detect HIGH pulses on this pin
    scope.setup(2, 44100);
    if(context->analogInChannels != 8){
        fprintf(stderr, "This project has to be run with 8 analog channels\n");
        return false;
    }
    return true;
}

void render(BelaContext *context, void *userData)
{
    for(unsigned int n = 0; n<context->digitalFrames; n++){
        gTriggerCount++;
        if(gTriggerCount == gTriggerInterval){
            gTriggerCount = 0;
            analogWriteOnce(context, n / 2, gTriggerAnalogOutChannel, HIGH); //write the status to the trig pin
        } else {
            analogWriteOnce(context, n / 2, gTriggerAnalogOutChannel, LOW); //write the status to the trig pin
        }
        int pulseLength = pulseIn.hasPulsed(context, n); // will return the pulse duration(in samples) if a pulse just ended 
        float duration = 1e6 * pulseLength / context->digitalSampleRate; // pulse duration in microseconds
        static float distance = 0;
        if(pulseLength >= gMinPulseLength){
            static int count = 0;
            // rescaling according to the datasheet
            distance = duration / gRescale;
            if(count > 5000){ // we do not want to print the value every time we read it
                rt_printf("pulseLength: %d, distance: %fcm\n", pulseLength, distance);
                count -= 5000;
            }
            ++count;
        }
        // Logging to the scope the pulse inputs (gEchoDigitalInPin) and the distance
        scope.log(digitalRead(context, n, gEchoDigitalInPin), distance/100);
    }
}


void cleanup(BelaContext *context, void *userData)
{
}


/**
\example ultrasonic-distance/render.cpp

Measuring distances with ultrasonic sensors
---------------------------

Ultrasonic sensors can detect distances to a high degree of accuracy, even
in many conditions where infrared sensors would not be suitable (e.g.: when natural
light is a problem.
For this example we used the [HC-SR04](http://www.micropik.com/PDF/HCSR04.pdf).

After it receives a short pulse (> 10us) at its TRIGGER input, the module outputs from the
ECHO output a pulse of length proportional to the distance of the object that is in 
front of the sensor.
According to the datasheet, the following relation stands:
  time[us] / 58 = distance[cm]
The dataseheet recommends a minimum interval of 60ms between triggers, in order to be able to 
read the result appropriately.

Bela sends out the TRIGGER event every 2646 samples(60ms) and then waits for a pulse to come 
in on the ECHO pin.
The PulseIn class is used here to monitor a digital pin for an HIGH 
pulse and once the pulse termiantes, it returnes the duration ( in samples ) of the pulse.

The module requires a 5V power supply and its digital inputs and outputs are low at 0V and
HIGH at 5V. Check the pin diagram in the IDE to see where to find the pins you need.
It is important that the 5V ECHO output from the module *is not* connected 
straight to Bela's digital inputs, as that would most likely kill the BeagleBone Black
(digital I/Os are 3.3V tolerant). You will need to use a passive resistor divider from the 
HC-SR04's ECHO output to scale down the voltage before connecting it to the digital input 
on gEchoDigitalInPin.

Bela's digital outputs are 3.3V and this does not guarantee that they would work when 
connected to the module's TRIGGER input, so we use here one of the analog outputs (which
can output up to 5V) instead. In practice, we found that the 3.3V was good enough for 
this application.

On the scope you should see the pulses coming in from the trigger and the distance. The closer
the object, the shorter the pulses. Make sure you set the trigger to "channel 1" (the pulse) and
you set the horizontal zoom appropriately.

*/
