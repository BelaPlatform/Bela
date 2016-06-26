#!/bin/bash
#
# This script halts the BeagleBone Black.

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

usage(){
	echo "\
	Usage: $THIS_SCRIPT
	Shuts down the board gracefully.
	"
}
check_for_help $1
echo "Shutting down the BeagleBone Black..."
ssh $BBB_ADDRESS "halt"
