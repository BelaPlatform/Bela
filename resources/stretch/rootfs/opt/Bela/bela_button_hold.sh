#!/bin/bash
#this file is executed when the button on the Bela cape is held down for more than 2 seconds.

CUSTOM_FILE=/opt/Bela/local/`basename $0`
[ -f $CUSTOM_FILE ] &&\
{
	echo "Bela button held, running $CUSTOM_FILE"
	$CUSTOM_FILE
	exit
}
echo Bela button held, shutting down | wall
shutdown -h now

