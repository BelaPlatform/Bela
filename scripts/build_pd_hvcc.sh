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
SRC_PROJECT_FOLDER="$(dirname $SOURCE)"
[ -z $PROJECT_NAME ] && PROJECT_NAME=$(basename $SRC_PROJECT_FOLDER)

SCRIPTDIR=$(dirname "$0")
[ -z "$CUSTOM_HEAVY_SOURCE_PATH" ] && CUSTOM_HEAVY_SOURCE_PATH="$SRC_PROJECT_FOLDER/heavy/"
[ -z "$HVRESOURCES_DIR" ] && HVRESOURCES_DIR=$SCRIPTDIR/hvresources/
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

# compile pd to C
hvcc $SOURCE -o $tmppath -n bela -g c $HVCC_PATHS_CL

# provide render file
projectpath="$tmppath/c"
# check if custom CUSTOM_HEAVY_SOURCE_PATH folder is provided
if [ -e "$CUSTOM_HEAVY_SOURCE_PATH" ] && [ "$(ls $CUSTOM_HEAVY_SOURCE_PATH)" ]; then
	echo "Custom heavy folder in use: $CUSTOM_HEAVY_SOURCE_PATH, using files in there instead of the default render.cpp:"
	[ -d "$CUSTOM_HEAVY_SOURCE_PATH" ] && {
		rsync -av "$CUSTOM_HEAVY_SOURCE_PATH"/* "$projectpath/" || exit 1;
	} || { rsync -av "$CUSTOM_HEAVY_SOURCE_PATH" "$projectpath/" || exit 1; }
else
	echo "Using Heavy default render.cpp"
	rsync -av "$HVRESOURCES_DIR/render.cpp" "$projectpath/" || exit 1
fi

# build resulting project
$SCRIPTDIR/build_project.sh $tmppath/c/ -p $PROJECT_NAME -m "CPPFLAGS=-Wno-unused-private-field" "$@"
