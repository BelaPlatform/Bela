#!/bin/bash -e
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
	awk -v pat="$1" -F"=" ' $0 ~ pat { print $2 } ' $2
}

extract_dependencies() {
	LIBRARY=$1
	echo Using library $LIBRARY
	MDFILE="libraries/$LIBRARY/lib.metadata";
	echo "$LIBRARY" >> "$LIBLIST"

	create_linkmakefile $LIBRARY $MDFILE
	create_compilemakefile $LIBRARY $MDFILE
	echo "-include libraries/$LIBRARY/build/Makefile.link" >> $TMPMKFILE

	DEPENDENCIES=$(getfield dependencies $MDFILE) ;
	DEPENDENCIES=$(echo $DEPENDENCIES | sed 's/,/\n/g') ;
	for D in $DEPENDENCIES ; do
		if ! grep -Fxq "$D" "$LIBLIST" ; then
			extract_dependencies $D ;
		else
			if [ "$DETECT_LIBRARIES_VERBOSE" != 0 ]
			then
				echo Library $D has already been checked for dependencies
			fi
		fi
	done
}

create_linkmakefile() {
	LIBRARY=$1
	MDFILE=$2
	MKFILELINK="libraries/$LIBRARY/build/Makefile.link"
	# check if we need to rebuild, or return
	if [ -f $MKFILELINK ]; then
		FOUND=`find "libraries/$LIBRARY/" -maxdepth 1 -regex ".*\.cpp\|.*\.c\|.*.cc" -newer $MKFILELINK 2> /dev/null | wc -l`
		[ $FOUND -eq 0 ] && return
	fi

	mkdir -p "libraries/$LIBRARY/build/"
	echo "#This file is generated automatically by `basename $0`. DO NOT EDIT" > $MKFILELINK
	echo "LIBRARY := $LIBRARY" >> $MKFILELINK
	echo "THIS_CPPFILES := \$(wildcard libraries/\$(LIBRARY)/*.cpp)" >> $MKFILELINK 
	echo "THIS_CFILES := \$(wildcard libraries/\$(LIBRARY)/*.c)" >> $MKFILELINK
	echo "LIBRARIES_OBJS := \$(LIBRARIES_OBJS) \$(addprefix libraries/\$(LIBRARY)/build/,\$(notdir \$(THIS_CPPFILES:.cpp=.o) \$(THIS_CFILES:.c=.o)))" >> $MKFILELINK
	echo "ALL_DEPS := \$(ALL_DEPS) \$(addprefix libraries/\$(LIBRARY)/build/,\$(notdir \$(THIS_CPPFILES:.cpp=.d)))" >> $MKFILELINK
	DIR=libraries/$LIBRARY
	for SOURCE in `ls $DIR/*.cpp $DIR/*.c $DIR/*.cc 2>/dev/null`; do
		FILENAME=`basename $SOURCE`
		OBJ=$DIR/build/${FILENAME%.*}.o
		echo "$OBJ: $SOURCE" >> $MKFILELINK
	done
	echo "LIBRARIES_LDLIBS += $(getfield LDLIBS $MDFILE)" >> $MKFILELINK
	echo "LIBRARIES_LDFLAGS += $(getfield LDFLAGS $MDFILE)" >> $MKFILELINK
}

echo_field() {
	SEARCHFIELD=$1
	FIELDNAME=$2; [ ! -z "$FIELDNAME" ] || FIELDNAME=$SEARCHFIELD
	FIELD=`getfield $SEARCHFIELD $MDFILE`; [ -z "$FIELD" ] || echo "$FIELDNAME := $FIELD" >> $MKFILECOMP
}
create_compilemakefile() {
	LIBRARY=$1
	MDFILE=$2
	MKFILECOMP="libraries/$LIBRARY/build/Makefile.compile"
	# check if we need to rebuild, or return
	[ "$MKFILECOMP" -nt "$MDFILE"  ] && return
	mkdir -p "libraries/$LIBRARY/build/"
	echo "#This file is generated automatically by `basename $0`. DO NOT EDIT" > $MKFILECOMP
	echo_field CC LIBRARY_CC
	echo_field CXX LIBRARY_CXX	
	echo_field CFLAGS LIBRARY_CFLAGS
	echo_field CXXFLAGS LIBRARY_CXXFLAGS
	echo_field CPPFLAGS LIBRARY_CPPFLAGS

}

## Script starts here

mkdir -p tmp/
# Create & empty temporary files
LIBLIST="tmp/liblist"
IMMEDIATE_LIBS=tmp/libraries
TMPMKFILE="tmp/Makefile.inc"
>"$LIBLIST"
>"$IMMEDIATE_LIBS"
>"$TMPMKFILE"

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
		find $DIR -name *.d -exec grep "$GREP_LIBRARY_REGEX" {} \; | sed "$SED_LIBRARY_REGEX" | sort -u >> "$IMMEDIATE_LIBS"
	else
		$grepR -oh --include \*.d "$GREP_LIBRARY_REGEX" "$DIR" | sed "$SED_LIBRARY_REGEX" | sort -u >> "$IMMEDIATE_LIBS"
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
--file path/to/file: a .i or .ii file to analyse for dependencies
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
			$grepR "$GREP_LIBRARY_REGEX" $FILE | sed "$SED_LIBRARY_REGEX" | sort -u >> "$IMMEDIATE_LIBS"
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
			echo $LIB
			extract_dependencies $LIB
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

cat $IMMEDIATE_LIBS | while read L; do
	extract_dependencies $L
done

# make sure we only include each library once
cat $TMPMKFILE | sort -u  > tmp/tmpmkfile
mv tmp/tmpmkfile $MKFILE
