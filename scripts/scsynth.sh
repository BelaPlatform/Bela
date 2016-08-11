#!/bin/bash
#

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  
   
THIS_SCRIPT=`basename "$0"`
usage_brief(){
    printf "Usage: $THIS_SCRIPT [start|stop|startup|nostartup|connect] [-c \"command-line args\" ]";
	echo
}

usage(){
	usage_brief
	echo "This program controls scsynth running on Bela.
    $THIS_SCRIPT start -- starts or restarts scsynth
    $THIS_SCRIPT stop -- stops scsynth
    $THIS_SCRIPT connect -- connects to the running scsynth
    $THIS_SCRIPT startup -- sets scsynth to start at boot
    $THIS_SCRIPT nostartup -- disables scsynth at boot
    "
}

while [ -n "$1" ]
do
	case $1 in 
		start|stop|startup|nostartup|connect)
			SCSYNTH_MAKE_TARGET=$1
		;;
		-c)
			shift;
			COMMAND_ARGS="$1";
		;;
		--help|-h|-\?)
			usage;
			exit 0;
		;;
		-*)
			echo Error: unknown option $1
			usage_brief
			exit 1;
		;;
	esac
	shift
done

[ -z "$SCSYNTH_MAKE_TARGET" ] && { usage_brief; exit 1; }

[ -z "$COMMAND_ARGS" ] && COMMAND_ARGS_STRING= || COMMAND_ARGS_STRING="SC_CL='$COMMAND_ARGS'"
[ "$SCSYNTH_MAKE_TARGET" = connect ] && DASH_T="-t" || DASH_T=
MAKE_COMMAND="make QUIET=true --no-print-directory -C $BBB_BELA_HOME scsynth$SCSYNTH_MAKE_TARGET $COMMAND_ARGS_STRING"
ssh $DASH_T $BBB_ADDRESS "$MAKE_COMMAND"
