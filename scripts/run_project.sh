#!/bin/sh
#
# This script runs a Bela project that already is on the board 

SCRIPTDIR=$(dirname "$0")
[ -z $SCRIPTDIR ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 
. $SCRIPTDIR.bela_common || { echo "You must be in Bela/scripts to run these scripts" | exit 1; }  

   
THIS_SCRIPT=`basename "$0"`
usage_brief(){
    printf "Usage: $THIS_SCRIPT projectname ";
	run_script_usage_brief
	echo
}

usage(){
	usage_brief
    echo "\
	This script runs a Bela project that is already on the board.
	
	\`projectname' is the name with which the project was saved on the board
	in ${BBB_PROJECT_HOME} (defaults to $BBB_DEFAULT_PROJECT_NAME)
"
	run_script_usage
}

while [ -n "$1" ]
do
	case $1 in 
		-c)
			shift;
			COMMAND_ARGS="$1";
		;;
		-b)
			RUN_MODE=screen;
		;;
		-f)
			RUN_MODE=foreground;
		;;
		-s)
			RUN_MODE=screenfg;
		;;
		--help|-h|-\?)
			usage;
			exit 0;
		;;
		-*)
			echo Error: unknown option $1
			usage_brief
			exit 1;
		;;
		*)
			BBB_PROJECT_NAME=$1
		;;
	esac
	shift
done


[ -z "$BBB_PROJECT_NAME" ] && {
	echo "ERROR: you need to specify a project name. Here is a list of projects available on your board:"
	list_available_projects
	exit 1
}
check_project_exists || {
	echo "ERROR: project $BBB_PROJECT_NAME could not be found at $BBB_ADDRESS:$BBB_PROJECT_HOME. Here is a list of projects available on your board:"
	list_available_projects
	exit 2
}

MAKE_COMMAND="make QUIET=true --no-print-directory -C $BBB_BELA_HOME PROJECT='$BBB_PROJECT_NAME' CL='$COMMAND_ARGS'"
echo "Running $BBB_PROJECT_NAME..."
case_run_mode
