#!/bin/bash
#
# shutdown_switch.sh: script for gracefully halting the BeagleBone Black
# when an onboard button is pressed. 
#
# (c) 2016 Andrew McPherson, C4DM, QMUL
# Developed for Bela: http://bela.io


# Prepare P9.27 as input (will be configured with pullup)
# via BB-BONE-PRU-BELA overlay

MONITOR_COMMAND=/usr/local/bin/bela-cape-btn
BUTTON_PIN=115
CLICK_COMMAND=/root/Bela_capeButtonClick.sh
HOLD_COMMAND=/root/Bela_capeButtonHold.sh
INITIAL_DELAY=20

ls $MONITOR_COMMAND &> /dev/null
if [ $? -eq 0 ];
then
# if the $MONITOR_COMMAND exists, run it (cheap)
	echo Using $MONITOR_COMMAND to poll
	$MONITOR_COMMAND --pin $BUTTON_PIN --hold $HOLD_COMMAND --delay $INITIAL_DELAY --monitor-click 0
else
#else, just poll the filesystem (expensive!)
	echo Polling the filesystem.
	echo $BUTTON_PIN > /sys/class/gpio/export
	echo in > /sys/class/gpio/gpio"$BUTTON_PIN"/direction

	if [ ! -r /sys/class/gpio/gpio"$BUTTON_PIN"/value ]
	then
		echo "$(basename $0): Unable to read GPIO pin $BUTTON_PIN for shutdown button."
		exit
	fi

	# First, wait for pin to go high. If it starts at 0, that's more
	# likely that the GPIO is not set correctly, so do not treat this
	# as a button press

	while [ $(cat /sys/class/gpio/gpio"$BUTTON_PIN"/value) -ne 1 ]; do
		# Keep checking pin is readable in case it gets unexported
		if [ ! -r /sys/class/gpio/gpio"$BUTTON_PIN"/value ]
		then
			echo "$(basename $0): Unable to read GPIO pin $BUTTON_PIN for shutdown button."
			exit
		fi
		sleep 0.5
	done

	# Now for button press. Make sure the button is held at least
	# 1 second before shutting down

	PRESS_COUNT=0

	while true; do
	  # Keep checking pin is readable in case it gets unexported
	  if [ ! -r /sys/class/gpio/gpio"$BUTTON_PIN"/value ]
	  then
		echo "$(basename $0): Unable to read GPIO pin $BUTTON_PIN for shutdown button."
		exit
	  fi
		
	  # Button pressed? (pressed = low)
	  if [ $(cat /sys/class/gpio/gpio"$BUTTON_PIN"/value) -eq 0 ]
	  then
		PRESS_COUNT=$((PRESS_COUNT+1))
		if [ "$PRESS_COUNT" -ge 4 ]
		then
			echo "$(basename $0): Bela button held. Halting system..."
			$HOLD_COMMAND
			exit 1
		fi
	  else
		PRESS_COUNT=0
	  fi
	  sleep 0.5
	done
fi
