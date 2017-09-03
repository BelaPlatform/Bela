#!/bin/bash
# This script uploads Pd patches to Enzienaudio's server and compiles them on Bela

pdpath=
release=
NO_UPLOAD=0
WATCH=0
FORCE=0
COMMAND_ARGS=
RUN_PROJECT=1
RUN_MODE=foreground
EXPERT=0
PRE_BUILT=1

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
[ -z $HVRESOURCES_DIR ] && HVRESOURCES_DIR=$SCRIPTDIR/hvresources/
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

projectpath="$SCRIPTDIR/../tmp/heavy/hvtemp/"

if [ -z "$BELA_PYTHON27" ]; then
    for PY in python python2.7 ; do
        $PY --version 2>&1 | grep "2\.7" >/dev/null 2>&1
        if [ $? -eq 0 ]; then
            BELA_PYTHON27=$PY
            break;
        fi;
    done;
fi;

if [ -z "$BELA_PYTHON27" ]; then
    echo "It looks like you might not have python2.7 installed. If you do, please specify the path
    to your python2.7 executable in the environmental variable \$BELA_PYTHON27"
    exit 1;
fi;


usage_brief(){
	printf "Usage: $THIS_SCRIPT path/to/project "
    printf '[-o] [--noupload] [-r|--release release] [--custom path]'
	build_script_usage_brief
	run_script_usage_brief
	echo
}

usage ()
{
usage_brief
echo "
example: $THIS_SCRIPT ../projects/heavy/pd/hello-world
      
This program compiles a PureData patch using the online Heavy Compiler. Before using this
script you need to have set up your Enzien Audio account and familiarized yourself with the
information available here https://github.com/BelaPlatform/Bela/wiki/Running-Puredata-patches-on-Bela#heavy.

Heavy-specific options:
	-r : builds against a specific Heavy release. Default is: $release (stable)
		( see revision list here https://enzienaudio.com/a/releases )
	--src-only : only retrieve the source files (and not the pre-built object files). With this option
		selected, building the project will take longer but you can save bandwidth and tweak compiler options.
	--noupload : does not use the online compiler, only compiles the current source files.
	-o arg : sets the path where files returned from the online compiler are stored.
	--custom arg: sets the path of C++ files to use instead of the default render.cpp
"
	build_script_usage
	run_script_usage
}

[ -z "$ENZIENAUDIO_COM_PATCH_NAME" ] && ENZIENAUDIO_COM_PATCH_NAME=bela

while [ -n "$1" ]
do
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
		--force)
			FORCE=1
		;;
		-m)
			shift
			BBB_MAKEFILE_OPTIONS="$BBB_MAKEFILE_OPTIONS $1"
		;;
		--watch)
			WATCH=1
		;;
		-o | --output )
			shift
			projectpath=$1
		;;
		-r | --release )
			shift
			release=$1
		;;
		--src-only )
			PRE_BUILT=0
		;;
		--noupload )
			NO_UPLOAD=1
		;;
		--custom)
			shift
			CUSTOM_HEAVY_SOURCE_PATH=$1
		;;
		--help|-h|-\?)
			usage
			exit
		;;
		-*)
			echo Error: unknown option $1
			usage_brief
			exit 1
		;;
		*)
			[ -z "$pdpath" ] && pdpath=$1 || {
				echo "Error: too many options $pdpath $1"
				usage_brief
				exit 1
			}
    esac
    shift
done

[ "$NO_UPLOAD" -eq 0 ] && [ -z "$pdpath" ] && { echo "Error: a path to the source folder should be provided"; exit 1; }
[ -z "$CUSTOM_HEAVY_SOURCE_PATH" ] && CUSTOM_HEAVY_SOURCE_PATH="$pdpath/heavy/"

[ -z $BBB_PROJECT_NAME ] && BBB_PROJECT_NAME="$(basename $(cd "$pdpath" && pwd))"

if [ -z "$release" ]
then 
  RELEASE_STRING=
else 
  RELEASE_STRING="-rr -r $release"
fi


# These files will be cleared from $projectpath before calling uploader.py
#TODO: get a reliable, exhaustive, up-to-date list.
HEAVY_FILES='Heavy* Hv*'

# The expert will have to remember to run set_date after powering up the board if needed
[ $EXPERT -eq 0 ] && check_board_alive_and_set_date

# check if project exists
[ $FORCE -eq 1 ] ||	check_project_exists_prompt $BBB_PROJECT_NAME


reference_time_file="$projectpath"/

#Check if rsync is available
check_rsync && RSYNC_AVAILABLE=1 || RSYNC_AVAILABLE=0

uploadBuildRun(){
    if [ $NO_UPLOAD -eq 0 ]; then
        # remove old static files to avoid obsolete errors
        # make sure the path is not empty, so avoiding to rm -rf / by mistake 
        [ -z "$projectpath" ] && { echo 'ERROR: $projectpath is empty.'; exit 0; } 
		#empty destination folder
		rm -rf "$projectpath"
		#recreate the destination folder"
		mkdir -p "$projectpath"
        
        echo "Invoking the online compiler..."
        if [ "$PRE_BUILT" -eq 1 ]
        then
            UPLOADER_EXTRA_FLAGS=--archive_only
            HEAVY_JOB="bela-linux-armv7a"
        else
            UPLOADER_EXTRA_FLAGS=
            HEAVY_JOB="c-src"
        fi
        # invoke the online compiler
        "$BELA_PYTHON27" $HVRESOURCES_DIR/uploader.py "$pdpath"/ -n $ENZIENAUDIO_COM_PATCH_NAME -g $HEAVY_JOB -o "$projectpath" $RELEASE_STRING $UPLOADER_EXTRA_FLAGS ||\
            { echo "ERROR: an error occurred while executing the uploader.py script"; exit $?; }
    fi;

    echo "";

    BBB_PROJECT_FOLDER=$BBB_PROJECT_HOME"/"$BBB_PROJECT_NAME #make sure there is no trailing slash here
    BBB_NETWORK_TARGET_FOLDER=$BBB_ADDRESS:$BBB_PROJECT_FOLDER

    # check how to copy/sync render.cpp file...
    # check if custom CUSTOM_HEAVY_SOURCE_PATH folder is provided
    if [ -e "$CUSTOM_HEAVY_SOURCE_PATH" ] && [ "$(ls $CUSTOM_HEAVY_SOURCE_PATH)" ]; then
        echo "Custom heavy folder in use: $CUSTOM_HEAVY_SOURCE_PATH, using files in there instead of the default render.cpp:"
		[ -d "$CUSTOM_HEAVY_SOURCE_PATH" ] && {
			cp -v "$CUSTOM_HEAVY_SOURCE_PATH"/* "$projectpath/" || exit 1;
		} || { cp -v "$CUSTOM_HEAVY_SOURCE_PATH" "$projectpath/" || exit 1; }
    else
        echo "Using Heavy default render.cpp"
        cp "$HVRESOURCES_DIR/render.cpp" "$projectpath/" || exit 1
    fi
    
    echo "Updating files on board..."
    
    touch $reference_time_file
	MAKE_COMMAND_BASE="make --no-print-directory COMPILER=gcc QUIET=true -C $BBB_BELA_HOME PROJECT='$BBB_PROJECT_NAME'"
    # Transfer the files 
	if [ "$PRE_BUILT" -eq 1 ]
	then
		ARCHIVE_NAME=archive.$HEAVY_JOB.zip
		BBB_ARCHIVE_PATH=/tmp/$ARCHIVE_NAME
		# copy the archive
		scp "$projectpath/$ARCHIVE_NAME" $BBB_ADDRESS:$BBB_ARCHIVE_PATH
		rm "$projectpath/$ARCHIVE_NAME"
		ssh $BBB_ADDRESS "mkdir -p '$BBB_BELA_HOME/projects/$BBB_PROJECT_NAME' && $MAKE_COMMAND_BASE heavy-unzip-archive HEAVY_ARCHIVE=$BBB_ARCHIVE_PATH" || exit 1
        # in this case, most files at the destination will not exist in the
        # source folder, as the latter will only contain the zip archive and
        # any files (if any) from the heavy/ subfolder OR the default heavy
        # render.cpp, so we avoid deleting them.
		RSYNC_SHOULD_DELETE=
	else
		RSYNC_SHOULD_DELETE=--delete-during
	fi
	if [ "$RSYNC_AVAILABLE" -eq 1 ]
	then
        # Heavy_bela.cpp tends to hang when transferring with rsync because it
        # may be very large.
        # So we always use `scp` with it, also because it changes every time.
        # In case we are using PRE_BUILT=1, then the file will not even exist
        # (hence the [ -f ... ] below)
		BIG_FILE=Heavy_$ENZIENAUDIO_COM_PATCH_NAME.cpp

		rsync -acv --no-t $RSYNC_SHOULD_DELETE --exclude="$BIG_FILE" --exclude=build --exclude=$BBB_PROJECT_NAME "$projectpath"/ "$BBB_NETWORK_TARGET_FOLDER" &&\
		[ $NO_UPLOAD -eq 1 ] || { [ -f "$projectpath"/$BIG_FILE ] && scp -rp "$projectpath"/$BIG_FILE $BBB_NETWORK_TARGET_FOLDER || true; } ||\
		{ echo "ERROR: while synchronizing files with the BBB. Is the board connected?"; exit 1; }
	else
		echo "using scp..."
		echo "WARNING: it is HEAVILY recommended that you install rsync on your system when building Heavy projects, in order to make the build much faster"
		echo "Cleaning the destination folder..."
		ssh $BBB_ADDRESS "rm -rf \"$BBB_PROJECT_FOLDER\"; mkdir -p \"$BBB_PROJECT_FOLDER\""
		echo "Copying the project files"
		scp -r "$projectpath"/* "$BBB_NETWORK_TARGET_FOLDER"
	fi
    # TODO: rsync should upload a list of modified files, so that the corresponding objects can be deleted
    # TODO: this should be run only when Heavy_bela.h changes. Otherwise render is recompiled every time for no good reason
    #ssh $BBB_ADDRESS "rm -rf ${BBB_PROJECT_FOLDER}/build/render.*" 

    #produce a list of files which content has changed (not just the date)
    # remove old executable to force re-linking
    #if [ $NO_UPLOAD -eq 0 ]; then
    #    ssh $BBB_ADDRESS "rm -rf "$BBB_PROJECT_FOLDER/$BBB_PROJECT_NAME;
    #fi;
    # Make new Bela executable and run
    MAKE_COMMAND="$MAKE_COMMAND_BASE CL='$COMMAND_ARGS' $BBB_MAKEFILE_OPTIONS"
    if [ $RUN_PROJECT -eq 0 ]
    then
        echo "Building project..."
        ssh $BBB_ADDRESS "$MAKE_COMMAND"
    else
	    case_run_mode
    fi
} #uploadBuildRun

uploadBuildRun

if [ $WATCH -ne 0 ]; then
	BACK_NO_UPLOAD=$NO_UPLOAD
	while true
	do
		# actually we are watching multiple paths : $pdpath and $HVRESOURCES_DIR
		# so that it is easier to edit hvresources code without risk of being 
		# overwritten, but we avoid mentioning it to the end user, otherwise they
		# get confused.
		echo "Waiting for changes in $pdpath, or press ctrl-c to terminate"
		while sleep 1
		do
			folder_has_changed "$pdpath" "$reference_time_file" && {
				echo "Content of $pdpath has changed"
				break
			}
			folder_has_changed "$HVRESOURCES_DIR" "$reference_time_file" && {
				echo "Content of "$HVRESOURCES_DIR" has changed"
				break
			}
		done
		echo "Files changed"
		# if .pd files did not change, no point in re-uploading
		folder_has_changed "$pdpath" "$reference_time_file" "\.pd" &&\
			NO_UPLOAD=$BACK_NO_UPLOAD || NO_UPLOAD=1
		uploadBuildRun
	done
fi;
