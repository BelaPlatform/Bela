#!/bin/bash
#
# This script stops the Bela program running on the BeagleBone.

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

usage(){
echo "Usage: $THIS_SCRIPT
	This script stops the Bela program which is running on the
	board regardless of how it was started."
}
check_for_help $1
ssh $BBB_ADDRESS make --no-print-directory -C $BBB_BELA_HOME stop
