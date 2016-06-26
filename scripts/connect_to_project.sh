#!/bin/sh
#

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

usage(){
echo "Usage: $THIS_SCRIPT
	This script brings to the foreground a Bela program that is running in the
	background, so that you can see its output."
}
while [ -n "$1" ]
do
	case $1 in 
	--help|-h|-\?)
		usage
		exit
	;;
	*)
		echo "errr$1___"
		echo "Error: unknown option $1" 
		usage
		exit 1
	;;
	esac
done
ssh -t $BBB_ADDRESS "make -C "$BBB_BELA_HOME" connect"
