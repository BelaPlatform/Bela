#!/bin/bash -e

EXAMPLES=(
	Instruments/airharp
	PureData/hello-sound
	Audio/telephone-filter
	Analog/analog-output
	Fundamentals/sinetone
	Salt/pink-trombone
)
PROJECTS=() # automatically populated below
# manually list libraries required by the examples listed.
# If a library is skipped here it will be built during build
# which may affect "compile" time the first time the project is built
LIBRARIES="Biquad Gui math_neon Midi Pipe Scope Trill"

SETUP=0
BUILD=0
RUN=0

while [ -n "$1" ]
do
	case $1 in
	setup)
		SETUP=1
	;;
	build)
		BUILD=1
	;;
	run)
		RUN=1
	;;
	*)
		cat <(\
		echo "usage: $0 [setup] [build] [dontrebuild] [run]"
		echo "  default: \`$0 setup build run'"
		echo "    if one or more of setup, build or run are specified, the others are disabled unless explicitly enabled"
		echo "  setup: initialise projects in projects/bc_* from examples"
		echo "  build: benchmark build of projects (by force rebuilding)"
		echo "  run: benchmark run"
		) >&2
		exit 1;
	;;
	esac
	shift;
done

if [ 0 -eq $SETUP -a 0 -eq $BUILD -a 0 -eq $RUN ]; then
	SETUP=1
	BUILD=1
	RUN=1
fi

for e in ${EXAMPLES[@]}; do
	PROJECTS+=(bc_$(echo $e | sed s:/:-:))
done

for (( n=0; n<${#EXAMPLES[@]}; n++ )); do
	e=${EXAMPLES[$n]}
	p=${PROJECTS[$n]}
	if [ $SETUP -eq 1 -o ! -d projects/$p ]; then
		mkdir -p projects/$p
		rsync -ac examples/$e/* projects/$p/
	fi
done

if [ 1 -eq $BUILD ]; then
	echo "========build========"
	# ensure mostly everything else is built before we go ahead and time the project build
	for l in $LIBRARIES; do
		make -f Makefile.libraries LIBRARY=$l > /dev/null
	done
	make lib > /dev/null
	make PROJECT=${PROJECTS[0]} build/core/default_libpd_render.o build/core/default_main.o > /dev/null
	for p in "${PROJECTS[@]}"; do
		if [ $BUILD -eq 1 ]; then
			make PROJECT=$p clean > /dev/null
			srcs=$(ls $PWD/projects/$p/*.cpp 2> /dev/null || true)
			objs=$(\
			for a in $srcs; do
				printf "$a " | sed "s \(projects/$p\)/\(.*\).cpp \1/build/\2.o g"
			done
			)
			# annoyingly to get the output of `time` one needs to eval it
			if [ -n "$objs" ]; then
				eval "time make PROJECT=$p $objs" 2>&1 | grep real | sed 's/real[ \t]*//' | cat <(printf "$p compile: ") -
			fi
			eval "time make PROJECT=$p" 2>&1 | grep real | sed 's/real[ \t]*//' | cat <(printf "$p link: ") -
			make PROJECT=$p > /dev/null # this is to make sure any build error from the line above show up here
		fi
	done
fi

if [ 1 -eq $RUN ]; then
	echo "========run========"
	for p in ${PROJECTS[@]}; do
		printf "building $p\r"
		make PROJECT=$p > /dev/null
		printf "$(tput el)"
		printf "$p: "
		make PROJECT=$p CL='--board=Batch --codec-mode="s=1,p=95,t=2"' run | grep cpu:
	done
fi
