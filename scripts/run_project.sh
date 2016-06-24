#!/bin/sh
#
# This script runs an already-compiled Bela project on the
# BeagleBone Black.

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

usage()
{
    THIS_SCRIPT=`basename "$0"`
    echo "Usage: $THIS_SCRIPT [-b path-on-beaglebone] [-c command-line-args] [-fF]"

    echo "
    This script runs a previously compiled Bela project on the 
    BeagleBone Black. The -c option passes command-line arguments
    to the Bela program; enclose the argument string in quotes.

    -p arg : sets the name of the project to run (default: $BBB_PROJECT_NAME ) 
	
    By default, the project runs in the foreground of the current terminal,
    within a screen session that can be detached later. The -f argument runs
    the project in the foreground of the current terminal, without screen, so
    the output can be piped to another destination. The -b argument runs it
    in a screen in the background, so no output is shown. The -m argument allows
    to pass arguments to the Makefile before the run target. For instance,
    pass -m \`"projectclean"\` or \`-m "distclean"\` to clean project-specific
    pre-built objects, or all the pre-built objects, respectively."
}

OPTIND=1

while getopts "bc:m:nfFhp:" opt; do
    case $opt in
        c)            COMMAND_ARGS=$OPTARG
                      ;;
        b)            RUN_IN_FOREGROUND=0
                      ;;
        f)            RUN_WITHOUT_SCREEN=1
                      ;;
	p)            BBB_PROJECT_NAME=$OPTARG
		      ;;	
	m)            BBB_MAKEFILE_OPTIONS=$OPTARG
	              ;;
        h|\?)         usage
                      exit 1
    esac
done

shift $((OPTIND-1))

if [ -z "$1" ]
then
    BBB_PROJECT_NAME=$BBB_DEFAULT_PROJECT_NAME
else
    BBB_PROJECT_NAME=$1
fi

MAKE_COMMAND="make --no-print-directory stop -C $BBB_BELA_HOME PROJECT='$BBB_PROJECT_NAME' CL='$COMMAND_ARGS'"
echo "Running $BBB_PROJECT_NAME..."
if [ $RUN_WITHOUT_SCREEN -eq 1 ]
then
    ssh -t $BBB_ADDRESS "$MAKE_COMMAND run"
elif [ $RUN_IN_FOREGROUND -eq 1 ]
then
    ssh -t $BBB_ADDRESS "$MAKE_COMMAND runscreenfg"
else
    ssh $BBB_ADDRESS "$MAKE_COMMAND runscreen"
fi
