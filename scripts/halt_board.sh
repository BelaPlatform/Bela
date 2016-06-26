#!/bin/sh
#
# This script halts the BeagleBone Black.

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

check_for_help
echo "Shutting down the BeagleBone Black..."
ssh $BBB_ADDRESS "halt"
