#!/bin/bash
#this file is executed when the button on the Bela cape is pressed for less than 2 seconds.
BELA_AUDIO_THREAD_NAME=bela-audio
PID=`grep $BELA_AUDIO_THREAD_NAME /proc/xenomai/stat | cut -d " " -f 5 | sed s/\s//g`; if [ -z $PID ]; then echo "No process to kill"; else echo "Killing old Bela process $PID"; kill -2 $PID; sleep 0.2; kill -9 $PID 2> /dev/null; fi; 
killall scsynth 2>/dev/null& killall sclang 2>/dev/null&
