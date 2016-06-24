/*
 * StatusLED.h
 *
 *
 */

#ifndef STATUSLED_H_
#define STATUSLED_H_

#include <pthread.h>
#include <unistd.h>

class StatusLED
{
public:
	StatusLED();
	~StatusLED();

	bool init(int gpio_pin);

	void on();
	void off();
	void blink(int ms_on, int ms_off);

	static void *static_blink_loop(void *data) {
		((StatusLED*)data)->blink_loop(NULL);
		return 0;
	}

	void* blink_loop(void *);

private:
	int gpio_number;
	int milliseconds_on, milliseconds_off;
	bool this_should_stop;
	pthread_t blink_thread;
};

#endif // STATUSLED_H_
