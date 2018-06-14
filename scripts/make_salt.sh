#!/bin/bash
set -e

EXAMPLE_FOLDER=13-Salt
BELA_CONFIG=~/.bela/belaconfig
TMP_BELA_CONFIG=/tmp/belaconfig

uname -a 2>/dev/null | grep -q bela || {
	echo "Error: this script must be run on the Bela board" >&2
	exit 1;
}

cp -r resources/salt/rootfs/* /

mkdir -p `dirname $BELA_CONFIG`
touch $BELA_CONFIG
grep -v "\s*BOARD=" $BELA_CONFIG > $TMP_BELA_CONFIG || true
echo "BOARD=Salt"  >> $TMP_BELA_CONFIG
mv $TMP_BELA_CONFIG $BELA_CONFIG

if [ "$1" = "--examples" ]
then
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
fi

