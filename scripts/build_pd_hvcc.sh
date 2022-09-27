#!/bin/bash
set -eo pipefail
HVCC_PATHS=
while [ -n "$1" ]
do
	case $1 in
		-p)
			shift;
			HVCC_PATHS="$HVCC_PATHS $1"
		;;
		*)
			break
		;;
	esac
	shift
done

SOURCE=$1
shift
[ -z "$SOURCE" -o "--help" == "$SOURCE" -o "-h" == "$SOURCE" ] && {
	echo "Usage: \`$0 [-p path/to/abstractions] path/to/project [ options to build_project.sh ]'" >&2
	exit 1;
}
[ -d $SOURCE ] && {
	SOURCE=$SOURCE/_main.pd
}
[ -z $PROJECT_NAME ] && PROJECT_NAME=$(basename $(dirname $SOURCE))

SCRIPTDIR=$(dirname "$0")
[ -z "$SCRIPTDIR" ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/
[ -z "$tmppath" ] && tmppath="$SCRIPTDIR/../tmp/heavy/hvtemp/"
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }
set -u

if [ -n "$HVCC_PATHS" ]
then
	HVCC_PATHS_CL="-p $HVCC_PATHS"
else
	HVCC_PATHS_CL=
fi

hvcc $SOURCE -o $tmppath -n bela -g c $HVCC_PATHS_CL
rsync -aq $SCRIPTDIR/hvresources/render.cpp $tmppath/c
$SCRIPTDIR/build_project.sh $tmppath/c/ -p $PROJECT_NAME -m "CPPFLAGS=-Wno-unused-private-field" "$@"
