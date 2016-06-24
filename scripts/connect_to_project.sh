#!/bin/sh
#
# This script brings an already running Bela program to the foreground 
# in the terminal, so it can be run interactively.

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

ssh -t $BBB_ADDRESS "make -C "$BBB_BELA_HOME" connect"
