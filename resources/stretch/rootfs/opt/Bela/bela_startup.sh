#!/bin/bash

CUSTOM_FILE=/opt/Bela/local/`basename $0`
[ -f $CUSTOM_FILE ] &&\
	{ $CUSTOM_FILE; exit $?; }
[ -z "$BELA_HOME" ] && BELA_HOME=/root/Bela
[ "$ACTIVE" -eq 0 ] && {
	echo "No Bela project set to run on boot" >& 2
	# this should not happen, and if it does, we prevent it from happening
	# again (till the next reboot!)
	make -C "$BELA_HOME" stopstartup
	exit 1
}

if [ "$PROJECT" = "" ]
then
	# run all projects called loop_* in a loop
	ls "$BELA_HOME"/projects/loop_* &>/dev/null &&\
	while sleep 0.1; do
		for PROJECT in "$BELA_HOME"/projects/loop_*; do
			echo Running $PROJECT;
			/usr/bin/make -C /root/Bela PROJECT=`basename "${PROJECT}"` CL="${ARGS}" runonly
		done
	done
else
	/usr/bin/make -C "$BELA_HOME" PROJECT="$PROJECT" runonly CL="$ARGS"
fi

