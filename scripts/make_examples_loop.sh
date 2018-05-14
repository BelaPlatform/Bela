#!/bin/bash -e

EXAMPLE_FOLDER=13-Salt

for e in `cd examples/$EXAMPLE_FOLDER/ && ls`
do
	if [ "$e" != salt-demo ]
	then
		PROJECTNAME=loop_$e
		echo Building project $PROJECTNAME
		make EXAMPLE=$EXAMPLE_FOLDER/$e PROJECT=$PROJECTNAME
	fi
done
make -C ~/Bela startuploop

