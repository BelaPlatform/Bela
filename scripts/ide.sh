#!/bin/bash
#

# set defaults unless variables are already set

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

usage()
{
    echo "Usage: $THIS_SCRIPT [start] [stop] [startup] [nostartup] "
    echo "This program controls Bela's IDE.
    $THIS_SCRIPT start -- starts or restarts the IDE
    $THIS_SCRIPT stop -- stops the IDE
    $THIS_SCRIPT startup -- sets the IDE to start at boot
    $THIS_SCRIPT nostartup -- disables the IDE at boot
    "
}

MAKE_COMMAND="make --no-print-directory -C $BBB_BELA_HOME"
while [ -n $1 ]
do
	case $1 in
	start)
		ssh $BBB_ADDRESS $MAKE_COMMAND idestart
		exit $?
	;;
	stop)
		ssh $BBB_ADDRESS $MAKE_COMMAND idestop
		exit $?
	;;
	startup)
		ssh $BBB_ADDRESS $MAKE_COMMAND idestartup
		exit $?
	;;
	nostartup)
		ssh $BBB_ADDRESS $MAKE_COMMAND idenostartup
		exit $?
	;;
	*)
		usage
		exit 1
	;;
	esac
	shift
done
