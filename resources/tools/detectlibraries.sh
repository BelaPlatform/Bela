#!/bin/bash
set -e
#busybox grep doesn't support -R, but only -r (i.e.: it doesn't follows symlinks).
#Where available, we want to keep -R and use -r as a fallback.
#The cheapest way of guessing current grep is to check whether
#it is a symlink (busybox) or not
[ -L `which grep` ] && {
	grepR="grep -r"
	BUSYBOX=true
} || {
	grepR="grep -R"
	BUSYBOX=false
}

SCRIPTDIR=$(dirname "$0")
[ -z "$SCRIPTDIR" ] && SCRIPTDIR="./" || SCRIPTDIR=$SCRIPTDIR/
cd `realpath $SCRIPTDIR`/../../

[ -z "$DETECT_LIBRARIES_VERBOSE" ] && DETECT_LIBRARIES_VERBOSE=0
getfield() {
	# more elegant (see https://stackoverflow.com/a/1665662/2958741)
	sed "s/^$1=//;t;d" $2
	# sometimes faster:
	#grep "^$1=" "$2" | sed "s/^$1=//"
}

process_libraries() {
	local LIBRARIES="$@"
	# make sure we only include each library once
	LIBRARIES=$(echo $LIBRARIES | sort -u)
	MKFILE_CONTENT=
	for LIBRARY in $LIBRARIES; do
		echo Using library $LIBRARY
		MDFILE="libraries/$LIBRARY/lib.metadata";
		create_linkmakefile $LIBRARY $MDFILE # this is the biggest time sink when nothing has to be rebuilt
		create_compilemakefile $LIBRARY $MDFILE
		MKFILE_CONTENT="$MKFILE_CONTENT
-include libraries/$LIBRARY/build/Makefile.link"
	done
}

extract_dependencies() {
	for LIBRARY in $@; do
		extract_dependencies_single "$LIBRARY"
	done
}

extract_dependencies_single() {
	local LIBRARY=$1
	if grep -Fxq "$LIBRARY" <(echo "$LIBLIST"); then
		if [ "$DETECT_LIBRARIES_VERBOSE" != 0 ]
		then
			echo Library $LIBRARY has already been checked for dependencies
		fi
		return
	fi
	[ -z "$LIBLIST" ] && LIBLIST=$LIBRARY ||
		LIBLIST="$LIBLIST
$LIBRARY" # important: no extra space or grep -x won't work
	MDFILE="libraries/$LIBRARY/lib.metadata";
	DEPENDENCIES=$(getfield dependencies $MDFILE) ;
	DEPENDENCIES=$(echo $DEPENDENCIES | sed 's/,/\n/g') ;
	for D in $DEPENDENCIES ; do
		extract_dependencies_single $D
	done
}

create_linkmakefile() {
	local LIBRARY=$1
	local MDFILE=$2
	local DIR=libraries/$LIBRARY
	local MKFILELINK="$DIR/build/Makefile.link"
	# check if we need to rebuild, or return
	if [ -f $MKFILELINK ]; then
		FOUND=$(find "$DIR" -maxdepth 1 -regex ".*\.cpp\|.*\.c\|.*.cc" -newer $MKFILELINK 2> /dev/null | wc -l)
		[ $FOUND -eq 0 ] && return
	fi
	mkdir -p "$DIR/build"

	{
	echo "#This file is generated automatically by `basename $0`. DO NOT EDIT"
	echo "LIBRARY := $LIBRARY"
	echo "THIS_CPPFILES := \$(wildcard libraries/\$(LIBRARY)/*.cpp)"
	echo "THIS_CFILES := \$(wildcard libraries/\$(LIBRARY)/*.c)"
	echo "LIBRARIES_OBJS := \$(LIBRARIES_OBJS) \$(addprefix libraries/\$(LIBRARY)/build/,\$(notdir \$(THIS_CPPFILES:.cpp=.o) \$(THIS_CFILES:.c=.o)))"
	echo "ALL_DEPS := \$(ALL_DEPS) \$(addprefix libraries/\$(LIBRARY)/build/,\$(notdir \$(THIS_CPPFILES:.cpp=.d)))"
	for SOURCE in `ls $DIR/*.cpp $DIR/*.c $DIR/*.cc 2>/dev/null`; do
		FILENAME=`basename $SOURCE`
		OBJ=$DIR/build/${FILENAME%.*}.o
		echo "$OBJ: $SOURCE"
	done
	echo "LIBRARIES_LDLIBS += $(getfield LDLIBS $MDFILE)"
	echo "LIBRARIES_LDFLAGS += $(getfield LDFLAGS $MDFILE)"
	} > $MKFILELINK
}

echo_field() {
	local MDFILE=$1
	local SEARCHFIELD=$2
	local FIELDNAME=$3;
	[ ! -z "$FIELDNAME" ] || FIELDNAME=$SEARCHFIELD
	local FIELD="$(getfield $SEARCHFIELD $MDFILE)";
	[ -z "$FIELD" ] || echo "$FIELDNAME += $FIELD"
}
create_compilemakefile() {
	local LIBRARY=$1
	local MDFILE=$2
	local MKFILECOMP="libraries/$LIBRARY/build/Makefile.compile"
	# check if we need to rebuild, or return
	[ "$MKFILECOMP" -nt "$MDFILE" ] && return
	mkdir -p "libraries/$LIBRARY/build/"
	{
	echo "#This file is generated automatically by $(basename $0). DO NOT EDIT"
	echo_field $MDFILE CC LIBRARY_CC
	echo_field $MDFILE CXX LIBRARY_CXX
	echo_field $MDFILE CFLAGS LIBRARY_CFLAGS
	echo_field $MDFILE CXXFLAGS LIBRARY_CXXFLAGS
	echo_field $MDFILE CPPFLAGS LIBRARY_CPPFLAGS
	} > $MKFILECOMP
}

## Script starts here

mkdir -p tmp/

LIBLIST=
IMMEDIATE_LIBS=

GREP_LIBRARY_REGEX='^libraries/[^/]\+/[^/]\+:'
SED_LIBRARY_REGEX='s|.*libraries/\(.*\)/.*:|\1|'

function set_mkfilepath()
{
	# set MKFILEPATH if unset or force
	local path="$1"
	local force="$2"
	if [ -z "$MKFILEPATH" -o "$force" -eq 1 ]
	then
		MKFILEPATH="$path"
	fi
}

function processBuildFolder()
{
	# Get included libraries on project from pre-processor's output
	DIR="$1"
	if [ true == $BUSYBOX ]; then
		# potentially slower: more processes spawned
		IMMEDIATE_LIBS="$IMMEDIATE_LIBS $(find $DIR -name "*.d" -exec grep "$GREP_LIBRARY_REGEX" {} \; | sed "$SED_LIBRARY_REGEX" | sort -u)"
	else
		IMMEDIATE_LIBS="$IMMEDIATE_LIBS $($grepR -oh --include "*.d" "$GREP_LIBRARY_REGEX" "$DIR" | sed "$SED_LIBRARY_REGEX" | sort -u)"
	fi
	set_mkfilepath "$DIR" 0
}

function usage()
{
	echo "
Usage:
	$0 [[-p|--project] PROJECT_NAME] [--path path/to/folder] [--file path/to/file] [--outpath path/to/outfolde] [[-l|--library] LIBRARY_NAME]

[-p|--project] PROJECT_NAME: the Bela project name to analyse for dependencies. The project
	files must have been compiled and have generated temporary .i and .ii files
--path path/to/folder: a folder containing .i or .ii files to analyse for dependencies
--file path/to/file: a .i or .ii or .d file to analyse for dependencies
[-l|--library] LIBRARY_NAME: a Bela library to analyse for dependencies. This is done
	parsing the lib.metadata file and not the .i or .ii files. Output is
	written to the library's build/ folder
--outpath path/to/outfolder: path to the output folder. Output file will be
	\"path/to/outfolder/Makefile.inc\". If unspecified, it is inferred from the
	path of the first entry among -p, --path, --file.

Several of -p, --path, --file, can be passed and the cumulative result will be written to the output file."
}
while [ $# -gt 0 ]; do
	case "$1" in
		-p|--project)
			shift
			PROJECT=$1
			if [ -z "$PROJECT" ] ; then
				echo "Please, specify a project name."
				usage
				exit 1
			fi
			shift
			processBuildFolder projects/$PROJECT/build
			;;
		--path)
			shift
			BUILD_FOLDER=$1
			if [ -z "$BUILD_FOLDER" -o ! -d "$BUILD_FOLDER" ] ; then
				echo "Please, specify a valid path to the build folder."
				usage
				exit 1
			fi
			shift
			processBuildFolder $BUILD_FOLDER
			;;
		-f|--file)
			shift
			FILE=$1
			if [ -z "$FILE" -o ! -e "$FILE" ]; then
				echo "Please, specify a valid file name."
				usage
				exit 1
			fi
			shift
			# Get included libraries from file
			IMMEDIATE_LIBS="$IMMEDIATE_LIBS $($grepR "$GREP_LIBRARY_REGEX" $FILE | sed "$SED_LIBRARY_REGEX" | sort -u)"
			set_mkfilepath "`dirname \"$FILE\"`" 0
			;;
		--outpath)
			shift
			set_mkfilepath "$1" 1
			if [ -z "$MKFILEPATH" ]; then
				echo "Please, specify a file name."
				usage
				exit 1
			fi
			shift
			;;
		-l|--library)
			shift
			LIB=$1
			if [ -z "$LIB" ] ; then
				echo "Please, specify a library name."
				usage
				exit 1
			fi
			shift
			extract_dependencies $LIB
			echo -e "$LIBLIST"
			exit
			;;
		*)
			echo Unknown option $1 >&2
			usage
			exit 1
			;;
	esac
done

MKFILE="$MKFILEPATH/Makefile.inc"
mkdir -p "$MKFILEPATH"

extract_dependencies $IMMEDIATE_LIBS
process_libraries $LIBLIST

echo -e "$MKFILE_CONTENT" > $MKFILE
