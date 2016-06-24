#!/bin/sh
#
# This script enables or disables running Bela when the board starts
# up.

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

ENABLE_STARTUP=1
RUN_IN_LOOP=1

# This path is hard-coded in the Bela image at present.

usage()
{
    THIS_SCRIPT=`basename "$0"`
    echo "Usage: $THIS_SCRIPT [-b path-on-beaglebone] [-c command-line-args] [-n] [-s]"

    echo "
    This script enables (by default) or disables running the Bela
    project at startup. The -n option disables auto-startup, otherwise
    auto-startup is enabled. The -b option changes the name of the project to
    set on startup, which is otherwise $BBB_DEFAULT_PROJECT_NAME. The -c option 
    passes command-line arguments to the Bela program; enclose the argument 
    string in quotes.
    The -s option runs the Bela program in single-shot mode.
    By default, instead, the program is restarted  automatically in the event of a crash."
}

OPTIND=1

while getopts "b:c:nhs" opt; do
    case $opt in
        b)            BBB_PROJECT_NAME=$OPTARG
                      ;;
        c)            COMMAND_ARGS=$OPTARG
                      ;;
        n)            ENABLE_STARTUP=0
                      ;;
        s)            RUN_IN_LOOP=0
                      ;;
        h|\?)         usage
                      exit 1
    esac
done

shift $((OPTIND-1))

MAKE_COMMAND="make --no-print-directory -C $BBB_BELA_HOME PROJECT=$BBB_PROJECT_NAME CL=\"$OPTARG\""
if [ $ENABLE_STARTUP -eq 0 ]
then
    ssh $BBB_ADDRESS "$MAKE_COMMAND nostartup"
elif [ $RUN_IN_LOOP -eq 1 ]
then    
    ssh $BBB_ADDRESS "$MAKE_COMMAND startuploop" 
else 
    ssh $BBB_ADDRESS "$MAKE_COMMAND startup" 
fi
