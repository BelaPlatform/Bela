#!/bin/bash
usage ()
{
    THIS_SCRIPT=`basename "$0"`
    echo "Usage: $THIS_SCRIPT [--continue] [--distcc] [--start /path/to/first/example]"
	echo "\
This script build all the examples in $BELA_EXAMPLES and reports any errors
encountered during the build process.
Arguments: 
	--continue : do not stop when a test fails
	--distcc : try to use distcc to offload the compilation to another
		computer on the network.
	--start arg : do not start from the first example, start from \`arg'
		instead. This can be either a folder or a sub-folder of
		$BELA_EXAMPLES.
"
}

signal_handler ()
{
	echo
	print_summary
	print_continue
	exit 0
}

print_continue ()
{
	printf "Program stopped, run\n$0 --start $EXAMPLE\n to continue from here\n";
}

print_summary ()
{
	printf "Tested $(($SUCCESS + $FAILURES)), failed: $FAILURES\n"
	[ -z "$FAILED_TESTS" ] || printf "Failed tests: $FAILED_TESTS"
	printf "\n"
}

increment_success()
{
	SUCCESS=$(($SUCCESS + 1))
}

increment_failure ()
{
	FAILURES=$(($FAILURES + 1))
	FAILED_TESTS="$FAILED_TESTS $EXAMPLE"
}

build_succeeded ()
{
	increment_success
	printf "Building $EXAMPLE succeeded\n\n"
}

build_failed ()
{
	increment_failure
	printf "Building $EXAMPLE failed.\n\n";
	[ $CONTINUE -eq 0 ] && { print_summary; print_continue; exit 1; }
}

[ -z "$BELA_HOME" ] && BELA_HOME=~/Bela
[ -z "$BELA_EXAMPLES" ] && BELA_EXAMPLES=$BELA_HOME/examples/
[ -z "$TEST_PROJECT" ] && TEST_PROJECT=build_all_examples_project
[ -z "$START_FROM" ] && START_FROM=
[ -z "$CONTINUE" ] && CONTINUE=0
[ -z "$J" ] && J="-j1"
FAILURES=0
SUCCESS=0

trap signal_handler 2 

while [ -n "$1" ]
do
	case $1 in
	--continue)
		CONTINUE=1
	;;
	--start)
		shift
		START_FROM="$1"
		echo "Starting from folder $START_FROM"
	;;
	--distcc)
		echo "Using distcc"
		export COMPILER="distcc arm-linux-gnueabihf-gcc"
		export CC="distcc arm-linux-gnueabihf-gcc"
		export CXX="distcc arm-linux-gnueabihf-g++"
		J=" -j6"
	;;
	*)
		usage
		exit 1
	;;
	esac
	shift
done

cd $BELA_HOME || { echo "Error: no folder $BELA_HOME, set BELA_HOME variable appropriately"; exit 1; }

cd $BELA_EXAMPLES || { echo "Error: no folder $BELA_EXAMPLES, set BELA_EXAMPLES variable appropriately"; exit 1; }

for CATEGORY in *
do
	[ "$CATEGORY" = "$START_FROM" ] && START_FROM=
	echo $CATEGORY
	for EXAMPLE in $CATEGORY/*
	do
		[ "$EXAMPLE" = "$START_FROM" ] && START_FROM=
		[ -z "$START_FROM" ] || { echo "Skipping $EXAMPLE"; continue; }
		echo $EXAMPLE
		MAKE_STRING="make --no-print-directory -C $BELA_HOME EXAMPLE=$EXAMPLE PROJECT=$TEST_PROJECT"
		echo $MAKE_STRING
		MAKE_STRING="$MAKE_STRING $J"
		$MAKE_STRING  > /dev/null && build_succeeded || build_failed
		#make  AT= -C $BELA_HOME run PROJECT=$TEST_PROJECT && echo "Running $EXAMPLE succeeded" || { echo "Running $EXAMPLE failed"; exit 1; }
	done
done
print_summary

