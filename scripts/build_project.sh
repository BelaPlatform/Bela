#!/bin/sh
#
# This script compiles a Bela project on the BeagleBone Black and
# optionally runs it. Pass a directory path in the first argument. 
# The source files in this directory are copied to the board and compiled.
# set defaults unless variables are already set

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

WATCH="0"
usage()
{
	THIS_SCRIPT=`basename "$0"`
	build_script_usage_brief
	echo "

	This script copies a directory of source files to the BeagleBone, compiles
	and runs it. The Bela core files should have first been copied over
	using the \`update_board' script once.
	The source directory should contain at least one .c, .cpp, .S or .pd file.

"
	build_script_usage
}
# UNDOCUMENTED OPTION -s runs in a screen in the foreground 

RUN_MODE=foreground

# We are "whiling" $2 because the last command is going to be the path/to/project
[ $# -lt 2 ]  && {
	[ -d $1 ] || { usage; exit; }
}
while [ "$2" != "" ]; do
	case $1 in
		-c)
			shift
			COMMAND_ARGS="$1"
		;;
		-b)
			RUN_MODE=screen
		;;
		-f)
			RUN_MODE=foreground
		;;
		-s)
			RUN_MODE=screenfg
		;;
		-n)
			RUN_PROJECT=0
		;;
		-p)
			shift
			BBB_PROJECT_NAME="$1"
		;;	
		--clean)
			BBB_MAKEFILE_OPTIONS="$BBB_MAKEFILE_OPTIONS projectclean"
		;;
		-m)
			shift
			BBB_MAKEFILE_OPTIONS="$BBB_MAKEFILE_OPTIONS $1"
		;;
		--watch)
			WATCH=1
		;;
		-h|-\?)
			usage
			exit 0
		;;
		*)
			usage
			exit 1
		;;
	esac
	shift
done


# Check that we have a directory containing at least one source file
# as an argument

if [ -z "$1" ]
then
	usage
	exit 2
fi

FIND_STRING="find $* -maxdepth 10000 -type f "
EXTENSIONS_TO_FIND='\.cpp\|\.c\|\.S\|\.pd'
FOUND_FILES=$($FIND_STRING | grep "$EXTENSIONS_TO_FIND")
if [ -z "$FOUND_FILES" ]
then
	 printf "ERROR: Please provide a directory containing .c, .cpp, .S or .pd files.\n\n"
	 exit 1
fi

BBB_PROJECT_FOLDER=$BBB_PROJECT_HOME"/"$BBB_PROJECT_NAME #make sure there is no trailing slash here
BBB_NETWORK_TARGET_FOLDER=$BBB_ADDRESS:$BBB_PROJECT_FOLDER

echo "Stopping running process..."
# sets the date and stop running process
ssh $BBB_ADDRESS "date -s \"`date '+%Y%m%d %T %Z'`\" > /dev/null; mkdir -p $BBB_PROJECT_FOLDER; make QUIET=true --no-print-directory -C $BBB_BELA_HOME stop"

#concatenate arguments to form path.
HOST_SOURCE_PATH= #initially empty, will be filled with input arguments
for i in "$@" #parse input arguments
do
	HOST_SOURCE_PATH+=" $1"
	shift
	# Copy new souce files to the board
done

# This file is used to keep track of when the last upload was made,
# so to check for modifications if WATCH is active
reference_time_file="$SCRIPTDIR/../tmp/"
uploadBuildRun(){
	[ $WATCH -eq 1 ] && touch $reference_time_file
	# Copy new source files to the board
	echo "Copying new source files to BeagleBone..."
	if [ -z "`which rsync`" ];
	then
		#if rsync is not available, brutally clean the destination folder
		ssh bbb "make --no-print-directory -C $BBB_BELA_HOME sourceclean PROJECT=$BBB_PROJECT_NAME";
		#and copy over all the files again
		scp -r $HOST_SOURCE_PATH "$BBB_NETWORK_TARGET_FOLDER"
	else
		#rsync 
		# --delete makes sure it removes files that are not in the origin folder
		# -c evaluates changes using md5 checksum instead of file date, so we don't care about time skews 
		# --no-t makes sure file timestamps are not preserved, so that the Makefile will not think that targets are up to date when replacing files on the BBB
		#  with older files from the host. This will solve 99% of the issues with Makefile thinking a target is up to date when it is not.
		rsync -ac --out-format="   %n" --no-t --delete-after --exclude=$BBB_PROJECT_NAME --exclude=build $HOST_SOURCE_PATH"/" "$BBB_NETWORK_TARGET_FOLDER/" #trailing slashes used here make sure rsync does not create another folder inside the target folder
	fi

	if [ $? -ne 0 ]
	then
		echo "Error while copying files"
		exit
	fi

	# Make new Bela executable and run
	MAKE_COMMAND="make --no-print-directory QUIET=true -C $BBB_BELA_HOME PROJECT='$BBB_PROJECT_NAME' CL='$COMMAND_ARGS' $BBB_MAKEFILE_OPTIONS"
	if [ $RUN_PROJECT -eq 0 ]
	then
		echo "Building project..."
		ssh $BBB_ADDRESS "$MAKE_COMMAND"
	else
      echo "Building and running project..."
	  case $RUN_MODE in
		# Sorry for repeating the options, but "ssh / ssh -t" makes things complicated
		foreground)
			ssh -t $BBB_ADDRESS "$MAKE_COMMAND run"
		;;
		screen)
			ssh $BBB_ADDRESS "$MAKE_COMMAND runscreen"
		;;
		screenfg)
			ssh -t $BBB_ADDRESS "$MAKE_COMMAND runscreenfg"
		;;
		*)
			echo $RUN_MODE
			error
		;;
      esac
	fi
}
# run it once and then (maybe) start waiting for changes
uploadBuildRun

if [ $WATCH -ne 0 ]; then
	while true
	do
		echo "Waiting for changes in $HOST_SOURCE_PATH, or press ctrl-c to terminate"
		CORE_DIR="$SCRIPTDIR/../core"
		INCLUDE_DIR="$SCRIPTDIR/../include"
		wait_for_change $HOST_SOURCE_PATH "$reference_time_file" && {
			echo "Content of "$HOST_SOURCE_PATH" has changed"
		}
		echo "Files changed"
		uploadBuildRun
	done
fi
