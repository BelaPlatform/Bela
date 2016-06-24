/*
 * StatusLED.cpp
 *
 * Routines for manipulating the status LED
 *
 * (c) 2014 Andrew McPherson and Victor Zappi
 * QMUL, Centre for Digital Music
 */

#include <iostream>
#include "StatusLED.h"
#include <GPIOcontrol.h>

extern int gShouldStop;
extern int gVerbose;

using namespace std;

StatusLED::StatusLED() {
	gpio_number = -1;
	milliseconds_on = 0;
	milliseconds_off = 100;
	blink_thread = -1;
}

StatusLED::~StatusLED() {
	if(gpio_number >= 0) {
		this_should_stop = true;
		pthread_join(blink_thread, NULL);
		gpio_unexport(gpio_number);
	}
}

bool StatusLED::init(int gpio_pin) {
	gpio_number = gpio_pin;
	this_should_stop = false;

	if(gpio_export(gpio_number)) {
		if(gVerbose)
			cout << "Warning: couldn't export status LED pin\n";
	}
	if(gpio_set_dir(gpio_number, OUTPUT_PIN)) {
		if(gVerbose)
			cout << "Couldn't set direction on status LED pin\n";
		return false;
	}
	if(gpio_set_value(gpio_number, LOW)) {
		if(gVerbose)
			cout << "Couldn't set value on status LED pin\n";
		return false;
	}


	if ( pthread_create(&blink_thread, NULL, static_blink_loop, this) )
	{
		cout << "Error:unable to create status LED thread" << endl;
		return false;
	}

	return true;
}

void StatusLED::on() {
	milliseconds_on = 100;
	milliseconds_off = 0;
}

void StatusLED::off() {
	milliseconds_on = 0;
	milliseconds_off = 100;
}

void StatusLED::blink(int ms_on, int ms_off) {
	milliseconds_on = ms_on;
	milliseconds_off = ms_off;
}

void* StatusLED::blink_loop(void *) {
	while(!gShouldStop && !this_should_stop) {
		if(milliseconds_on != 0)
			gpio_set_value(gpio_number, HIGH);
		usleep(1000 * milliseconds_on);
		if(gShouldStop)
			break;
		if(milliseconds_off != 0)
			gpio_set_value(gpio_number, LOW);
		usleep(1000 * milliseconds_off);
	}
	pthread_exit(NULL);
}
