#!/bin/bash -e
SCRIPTDIR=$(dirname "$0")
[ -z "$SCRIPTDIR" ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/ 

source "$SCRIPTDIR"/.bela_common

signal_handler()
{
	echo "Killing all spawned processes"
	SHOULD_STOP=1
	kill -9 $PIDS
}

trap signal_handler 2
trap signal_handler 9
check_board_alive_and_set_date

export BELA_EXPERT_MODE=1
export BELA_DONT_RUN_FIRST=1
PIDS=
for a in `ls $1`
do
  PROJECT=$1/$a
  echo $SCRIPTDIR/build_project.sh --watch --force --get $PROJECT
  $SCRIPTDIR/build_project.sh --watch --force --get $PROJECT &
  PIDS="$PIDS $!"
done

SHOULD_STOP=0
while [ $SHOULD_STOP = 0 ]
do
	sleep 0.4
done

