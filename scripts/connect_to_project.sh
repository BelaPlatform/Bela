#!/bin/bash
#

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

usage(){
echo "Usage: $THIS_SCRIPT
	This script brings to the foreground a Bela program that is running in
	the background, so that you can see its output."
}
check_for_help $1
ssh -t $BBB_ADDRESS "make --no-print-directory -C "$BBB_BELA_HOME" connect"
