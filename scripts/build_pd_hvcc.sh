#!/bin/bash
set -eo pipefail
SOURCE=$1
shift
[ -z "$SOURCE" ] && {
	echo "Usage: \`$0 path/to/project [ options to build_project.sh ]'" >&2
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

hvcc $SOURCE -o $tmppath -n bela -g c
rsync -aq $SCRIPTDIR/hvresources/render.cpp $tmppath/c
$SCRIPTDIR/build_project.sh $tmppath/c/ -p $PROJECT_NAME "$@"
